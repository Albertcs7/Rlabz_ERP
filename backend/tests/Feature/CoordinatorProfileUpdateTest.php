<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * PUT /api/coordinator/profile: values are limited to what the users table
 * can hold, and the email must stay a login-able @rajagiri.edu address.
 */
class CoordinatorProfileUpdateTest extends TestCase
{
    private array $userIds = [];
    private int $coordinatorId;
    private string $email;
    private array $auth = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->email = 'profiletest_' . uniqid() . '@rajagiri.edu';
        $this->coordinatorId = DB::table('users')->insertGetId([
            'name' => 'Profile Test Coordinator',
            'email' => $this->email,
            'password' => Hash::make('profilepass123'),
            'role' => 'coordinator',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->userIds[] = $this->coordinatorId;

        $token = $this->postJson('/api/auth/login', ['email' => $this->email, 'password' => 'profilepass123'])
            ->assertStatus(200)->json('access_token');
        $this->auth = ['Authorization' => 'Bearer ' . $token];
    }

    protected function tearDown(): void
    {
        DB::table('users')->whereIn('id', $this->userIds)->delete();
        parent::tearDown();
    }

    private function update(array $data)
    {
        return $this->withHeaders($this->auth)->putJson('/api/coordinator/profile', array_merge([
            'name' => 'Profile Test Coordinator',
            'email' => $this->email,
        ], $data));
    }

    private function storedEmail(): string
    {
        return DB::table('users')->where('id', $this->coordinatorId)->value('email');
    }

    public function test_email_that_login_would_reject_is_not_saved(): void
    {
        $this->update(['email' => 'someone@gmail.com'])->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertSame($this->email, $this->storedEmail());
    }

    public function test_too_long_name_and_phone_give_validation_errors_not_server_errors(): void
    {
        $this->update(['name' => str_repeat('a', 151)])->assertStatus(422)->assertJsonValidationErrors('name');
        $this->update(['phone' => str_repeat('9', 21)])->assertStatus(422)->assertJsonValidationErrors('phone');

        $this->update(['name' => str_repeat('a', 150), 'phone' => str_repeat('9', 20)])->assertStatus(200);
    }

    public function test_duplicate_email_is_rejected(): void
    {
        $otherEmail = 'profiletest_other_' . uniqid() . '@rajagiri.edu';
        $this->userIds[] = DB::table('users')->insertGetId([
            'name' => 'Other User',
            'email' => $otherEmail,
            'password' => Hash::make('otherpass123'),
            'role' => 'faculty',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->update(['email' => strtoupper($otherEmail)])->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertSame($this->email, $this->storedEmail());
    }

    public function test_updated_email_is_saved_and_can_be_used_to_log_in(): void
    {
        $newEmail = 'profiletest_new_' . uniqid() . '@rajagiri.edu';

        $this->update(['email' => $newEmail, 'name' => 'Renamed Coordinator', 'phone' => '+91 9876543210'])
            ->assertStatus(200)
            ->assertJsonPath('data.email', $newEmail)
            ->assertJsonPath('data.name', 'Renamed Coordinator');

        $row = DB::table('users')->where('id', $this->coordinatorId)->first();
        $this->assertSame($newEmail, $row->email);
        $this->assertSame('+91 9876543210', $row->phone);

        $this->postJson('/api/auth/login', ['email' => $newEmail, 'password' => 'profilepass123'])->assertStatus(200);

        // The old email no longer matches any user, so it can't log in.
        $this->postJson('/api/auth/login', ['email' => $this->email, 'password' => 'profilepass123'])
            ->assertStatus(401)
            ->assertJsonMissingPath('access_token');
    }
}
