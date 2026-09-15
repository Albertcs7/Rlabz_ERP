<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;

class CertificatesOwnershipTest extends TestCase
{
    private function loginAndGetToken(string $email, string $password): string
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => $password,
        ]);
        $response->assertStatus(200);
        $token = $response->json('access_token');
        $this->assertNotNull($token, "Login for {$email} did not return an access_token.");

        return $token;
    }

    public function test_certificates_mine_requires_authentication(): void
    {
        $response = $this->getJson('/api/certificates/mine');

        $response->assertStatus(401);
    }

    public function test_students_only_see_their_own_certificates(): void
    {
        $tokenA = $this->loginAndGetToken('alex.varghese@rajagiri.edu', 'student123');
        $tokenB = $this->loginAndGetToken('rhea.mathew@rajagiri.edu', 'student123');

        $userA = DB::table('users')->where('email', 'alex.varghese@rajagiri.edu')->value('id');
        $userB = DB::table('users')->where('email', 'rhea.mathew@rajagiri.edu')->value('id');

        $responseA = $this->withHeader('Authorization', 'Bearer ' . $tokenA)->getJson('/api/certificates/mine');
        $responseB = $this->withHeader('Authorization', 'Bearer ' . $tokenB)->getJson('/api/certificates/mine');

        $responseA->assertStatus(200);
        $responseB->assertStatus(200);

        $idsA = collect($responseA->json('data'))->pluck('id');
        $idsB = collect($responseB->json('data'))->pluck('id');

        foreach (collect($responseA->json('data'))->pluck('student_id') as $sid) {
            $this->assertEquals($userA, $sid, 'Certificate list for student A contained a certificate not belonging to them.');
        }
        foreach (collect($responseB->json('data'))->pluck('student_id') as $sid) {
            $this->assertEquals($userB, $sid, 'Certificate list for student B contained a certificate not belonging to them.');
        }

        // Explicit cross-check: neither list may contain a specific certificate ID
        // that belongs to the other student.
        foreach ($idsB as $id) {
            $this->assertNotContains($id, $idsA, "Student A's certificate list unexpectedly contained student B's certificate #{$id}.");
        }
        foreach ($idsA as $id) {
            $this->assertNotContains($id, $idsB, "Student B's certificate list unexpectedly contained student A's certificate #{$id}.");
        }
    }

    public function test_student_cannot_download_another_students_certificate(): void
    {
        $tokenA = $this->loginAndGetToken('alex.varghese@rajagiri.edu', 'student123');
        $userA = DB::table('users')->where('email', 'alex.varghese@rajagiri.edu')->value('id');

        $otherCert = DB::table('certificates')->where('student_id', '!=', $userA)->first();
        if (!$otherCert) {
            $this->markTestSkipped('No certificate belonging to a different student exists to exercise this check.');
        }

        $response = $this->withHeader('Authorization', 'Bearer ' . $tokenA)
            ->getJson('/api/certificates/' . $otherCert->id);

        $response->assertStatus(403);
    }

    /**
     * Read-only: validation rejects the mismatched combination before any
     * Certificate::create() runs, so no row is ever written. Asserted explicitly
     * via the before/after count check.
     */
    public function test_coordinator_certificate_issuing_rejects_student_not_assigned_to_project(): void
    {
        $module = DB::table('modules')->where('status', 'completed')->first();
        if (!$module) {
            $this->markTestSkipped('No completed module exists in the current database to exercise this validation path.');
        }

        $unassignedStudent = DB::table('users')
            ->where('role', 'student')
            ->whereNotExists(function ($q) use ($module) {
                $q->select(DB::raw(1))->from('project_student')
                  ->whereColumn('project_student.student_id', 'users.id')
                  ->where('project_student.project_id', $module->project_id);
            })
            ->first();

        if (!$unassignedStudent) {
            $this->markTestSkipped('No student unassigned to this project exists to exercise this validation path.');
        }

        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');
        $before = DB::table('certificates')->count();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/certificates', [
                'project_id' => $module->project_id,
                'module_id' => $module->id,
                'student_id' => $unassignedStudent->id,
                'issue_date' => now()->toDateString(),
            ]);

        $response->assertStatus(422);
        $this->assertEquals(
            $before,
            DB::table('certificates')->count(),
            'A rejected certificate request must not create any row.'
        );
    }

    public function test_existing_certificates_have_correctly_linked_student(): void
    {
        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)->getJson('/api/certificates');
        $response->assertStatus(200);

        foreach ($response->json('data') as $cert) {
            $this->assertEquals(
                $cert['student_id'],
                $cert['student']['id'] ?? null,
                "Certificate #{$cert['id']} student_id does not match its loaded student relationship."
            );
        }
    }

    /**
     * Only runs if a certificate already belongs to a Spark-designated student
     * whose demo login credentials are known. As of this test run, no such
     * certificate exists (Spark's one demo-seeded student, Meera Kurien, has
     * not been issued a certificate yet, and the single existing Spark
     * certificate belongs to a non-demo account with an unknown password) —
     * per instruction, this skips rather than inserting anything into the
     * live database.
     */
    public function test_spark_certificate_not_visible_to_other_designations(): void
    {
        $knownDemoEmails = [
            'alex.varghese@rajagiri.edu',
            'rhea.mathew@rajagiri.edu',
            'karan.nair@rajagiri.edu',
            'meera.kurien@rajagiri.edu',
        ];

        $sparkCert = DB::table('certificates')
            ->join('student_profiles', 'student_profiles.student_id', '=', 'certificates.student_id')
            ->join('users', 'users.id', '=', 'certificates.student_id')
            ->where('student_profiles.designation', 'spark')
            ->whereIn('users.email', $knownDemoEmails)
            ->select('certificates.id', 'certificates.student_id')
            ->first();

        if (!$sparkCert) {
            $this->markTestSkipped(
                'No certificate belonging to a known-credential Spark-designated student exists yet; ' .
                'skipping rather than inserting test data into the live database.'
            );
        }

        $otherToken = $this->loginAndGetToken('alex.varghese@rajagiri.edu', 'student123');
        $response = $this->withHeader('Authorization', 'Bearer ' . $otherToken)->getJson('/api/certificates/mine');
        $ids = collect($response->json('data'))->pluck('id');

        $this->assertNotContains($sparkCert->id, $ids, 'A Nova student unexpectedly saw a Spark certificate.');
    }
}
