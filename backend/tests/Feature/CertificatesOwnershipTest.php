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

        foreach (collect($responseA->json('data'))->pluck('student_id') as $sid) {
            $this->assertEquals($userA, $sid, 'Certificate list for student A contained a certificate not belonging to them.');
        }
        foreach (collect($responseB->json('data'))->pluck('student_id') as $sid) {
            $this->assertEquals($userB, $sid, 'Certificate list for student B contained a certificate not belonging to them.');
        }
    }
}
