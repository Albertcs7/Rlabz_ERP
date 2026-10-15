<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Students change their own password directly (current password required).
 * The former request → coordinator approval/rejection workflow is retired.
 */
class StudentPasswordChangeTest extends TestCase
{
    private ?int $studentId = null;
    private string $email;

    protected function setUp(): void
    {
        parent::setUp();

        // A throwaway student with a known password, removed again in tearDown().
        $this->email = 'pwtest_' . uniqid() . '@rajagiri.edu';
        $this->studentId = DB::table('users')->insertGetId([
            'name' => 'Password Test Student',
            'email' => $this->email,
            'password' => Hash::make('oldpass123'),
            'role' => 'student',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->studentId) {
            DB::table('audit_logs')->where('user_id', $this->studentId)->delete();
            DB::table('users')->where('id', $this->studentId)->delete();
        }
        parent::tearDown();
    }

    private function tokenFor(string $password): string
    {
        $response = $this->postJson('/api/auth/login', ['email' => $this->email, 'password' => $password]);
        $response->assertStatus(200);
        return $response->json('access_token');
    }

    public function test_student_can_change_password_with_correct_current_password(): void
    {
        $token = $this->tokenFor('oldpass123');

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/student/change-password', [
                'current_password' => 'oldpass123',
                'new_password' => 'newpass456',
                'confirm_password' => 'newpass456',
            ])
            ->assertStatus(200);

        $stored = DB::table('users')->where('id', $this->studentId)->value('password');
        $this->assertTrue(Hash::check('newpass456', $stored));
    }

    public function test_wrong_current_password_is_rejected_and_password_unchanged(): void
    {
        $token = $this->tokenFor('oldpass123');

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/student/change-password', [
                'current_password' => 'not-my-password',
                'new_password' => 'newpass456',
                'confirm_password' => 'newpass456',
            ])
            ->assertStatus(400);

        $stored = DB::table('users')->where('id', $this->studentId)->value('password');
        $this->assertTrue(Hash::check('oldpass123', $stored));
    }

    public function test_missing_current_password_or_mismatched_confirmation_fails_validation(): void
    {
        $token = $this->tokenFor('oldpass123');

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/student/change-password', [
                'new_password' => 'newpass456',
                'confirm_password' => 'newpass456',
            ])
            ->assertStatus(422);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/student/change-password', [
                'current_password' => 'oldpass123',
                'new_password' => 'newpass456',
                'confirm_password' => 'different789',
            ])
            ->assertStatus(422);
    }

    public function test_retired_approval_workflow_routes_no_longer_exist(): void
    {
        $token = $this->tokenFor('oldpass123');
        $auth = ['Authorization' => 'Bearer ' . $token];

        $this->withHeaders($auth)->getJson('/api/student/password-request-status')->assertStatus(404);
        $this->withHeaders($auth)->postJson('/api/student/request-password-change')->assertStatus(404);
        $this->withHeaders($auth)->postJson('/api/student/cancel-password-request')->assertStatus(404);
        $this->withHeaders($auth)->getJson('/api/coordinator/password-requests')->assertStatus(404);
        $this->withHeaders($auth)->postJson('/api/coordinator/password-requests/1/approve')->assertStatus(404);
        $this->withHeaders($auth)->postJson('/api/coordinator/password-requests/1/reject')->assertStatus(404);
    }
}
