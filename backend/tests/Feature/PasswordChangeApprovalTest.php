<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;

class PasswordChangeApprovalTest extends TestCase
{
    private array $insertedIds = [];

    protected function tearDown(): void
    {
        if (!empty($this->insertedIds)) {
            DB::table('notifications')->whereIn('id', $this->insertedIds)->delete();
        }
        parent::tearDown();
    }

    private function loginAndGetToken(string $email, string $password): string
    {
        $response = $this->postJson('/api/auth/login', ['email' => $email, 'password' => $password]);
        $response->assertStatus(200);
        $token = $response->json('access_token');
        $this->assertNotNull($token);
        return $token;
    }

    /**
     * Inserts a pending request notification for a real, existing student —
     * the same shape StudentController::requestPasswordChange() creates —
     * without going through the student login flow (whose test password is
     * not known here). Only this exact row (plus whatever outcome row the
     * approve/reject endpoint inserts) is ever deleted.
     */
    private function createPendingRequestFor(int $studentId): int
    {
        $id = DB::table('notifications')->insertGetId([
            'user_id' => $studentId,
            'project_id' => null,
            'type' => 'password_change_request',
            'urgency' => 'pending',
            'message' => 'Your password change request is awaiting coordinator approval.',
            'is_read' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->insertedIds[] = $id;
        return $id;
    }

    public function test_coordinator_can_approve_a_pending_password_change_request(): void
    {
        $student = DB::table('users')->where('role', 'student')->first();
        if (!$student) {
            $this->markTestSkipped('No student user exists to exercise this test against.');
        }

        $requestId = $this->createPendingRequestFor($student->id);
        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');

        // The pending request must be visible in the coordinator's list.
        $listResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/coordinator/password-requests');
        $listResponse->assertStatus(200);
        $ids = collect($listResponse->json('data'))->pluck('id')->all();
        $this->assertContains($requestId, $ids);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/coordinator/password-requests/{$requestId}/approve");
        $response->assertStatus(200);

        $updated = DB::table('notifications')->where('id', $requestId)->first();
        $this->assertEquals('approved', $updated->urgency);
        $this->assertEquals('password_change_request', $updated->type); // type intentionally untouched
        $this->assertEquals(1, (int) $updated->is_read);

        // A new notification was created back to the student informing them,
        // without mentioning any password content.
        $studentNotice = DB::table('notifications')
            ->where('user_id', $student->id)
            ->where('type', 'password_change_approved')
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($studentNotice);
        $this->insertedIds[] = $studentNotice->id;
        // The message may mention the word "password" generically, but must
        // never contain an actual password value or hash.
        $this->assertStringNotContainsString('$2y$', $studentNotice->message);

        // Double-approval must fail (idempotency / no double-processing).
        $secondResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/coordinator/password-requests/{$requestId}/approve");
        $secondResponse->assertStatus(409);
    }

    public function test_coordinator_can_reject_a_pending_password_change_request(): void
    {
        $student = DB::table('users')->where('role', 'student')->first();
        if (!$student) {
            $this->markTestSkipped('No student user exists to exercise this test against.');
        }

        $requestId = $this->createPendingRequestFor($student->id);
        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/coordinator/password-requests/{$requestId}/reject");
        $response->assertStatus(200);

        $updated = DB::table('notifications')->where('id', $requestId)->first();
        $this->assertEquals('rejected', $updated->urgency);

        $studentNotice = DB::table('notifications')
            ->where('user_id', $student->id)
            ->where('type', 'password_change_rejected')
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($studentNotice);
        $this->insertedIds[] = $studentNotice->id;

        // A rejected request must never allow the password to actually change:
        // simulate the student's own change-password call and confirm it's blocked.
        // (We cannot log in as this student without a known test password, so we
        // directly re-check the same condition StudentController::updatePassword()
        // uses: type === 'password_change_approved' OR urgency === 'approved'.)
        $latest = DB::table('notifications')
            ->where('user_id', $student->id)
            ->whereIn('type', ['password_change_request', 'password_change_approved'])
            ->orderByDesc('id')
            ->first();
        $isApproved = $latest && ($latest->type === 'password_change_approved' || $latest->urgency === 'approved');
        $this->assertFalse($isApproved);
    }

    public function test_approving_a_nonexistent_or_already_processed_request_returns_conflict(): void
    {
        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/coordinator/password-requests/999999999/approve');
        $response->assertStatus(409);
    }
}
