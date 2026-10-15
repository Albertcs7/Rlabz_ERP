<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * POST /api/auth/login failure handling. Failed logins used to return HTTP 500
 * (audit row with a hard-coded user_id 1 that doesn't exist); they must return
 * a normal 401 without SQL details, and only audit real users.
 */
class AuthLoginTest extends TestCase
{
    private ?int $userId = null;
    private string $email;

    protected function setUp(): void
    {
        parent::setUp();

        $this->email = 'logintest_' . uniqid() . '@rajagiri.edu';
        $this->userId = DB::table('users')->insertGetId([
            'name' => 'Login Test User',
            'email' => $this->email,
            'password' => Hash::make('loginpass123'),
            'role' => 'faculty',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->userId) {
            DB::table('audit_logs')->where('user_id', $this->userId)->delete();
            DB::table('users')->where('id', $this->userId)->delete();
        }
        parent::tearDown();
    }

    private function assertCleanFailure($response, string $expectedError): void
    {
        $response->assertStatus(401)->assertExactJson(['error' => $expectedError]);
        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
    }

    public function test_unknown_email_returns_401_without_internal_details(): void
    {
        $auditRowsBefore = DB::table('audit_logs')->count();

        $response = $this->postJson('/api/auth/login', ['email' => 'nobody_' . uniqid() . '@rajagiri.edu', 'password' => 'whatever']);

        $this->assertCleanFailure($response, 'Invalid email or password.');
        $this->assertSame($auditRowsBefore, DB::table('audit_logs')->count(), 'No audit row may be attributed to a non-existent user');
    }

    public function test_non_rajagiri_email_is_still_rejected_with_401(): void
    {
        foreach (['someone@gmail.com', 'someone@rajagiri.org', 'not-an-email'] as $email) {
            $this->assertCleanFailure(
                $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'loginpass123']),
                'Email must contain @rajagiri.edu'
            );
        }

        $this->assertCleanFailure($this->postJson('/api/auth/login', ['password' => 'x']), 'Email must contain @rajagiri.edu');
        $this->assertCleanFailure($this->postJson('/api/auth/login', ['email' => ['array'], 'password' => 'x']), 'Email must contain @rajagiri.edu');
    }

    public function test_wrong_password_returns_401_and_is_audited_for_that_user(): void
    {
        $response = $this->postJson('/api/auth/login', ['email' => $this->email, 'password' => 'wrong-password']);

        $this->assertCleanFailure($response, 'Invalid email or password.');
        $this->assertTrue(DB::table('audit_logs')
            ->where('user_id', $this->userId)
            ->where('action', 'Login Failed - Invalid Credentials')
            ->exists());
    }

    public function test_successful_login_returns_token_and_is_audited(): void
    {
        $response = $this->postJson('/api/auth/login', ['email' => $this->email, 'password' => 'loginpass123'])
            ->assertStatus(200);

        $this->assertNotEmpty($response->json('access_token'));
        $this->assertTrue(DB::table('audit_logs')
            ->where('user_id', $this->userId)
            ->where('action', 'System Login')
            ->exists());
    }
}
