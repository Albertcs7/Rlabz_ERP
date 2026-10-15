<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * PUT /api/faculty/profile: values are limited to what the columns can hold,
 * and the email must stay a login-able @rajagiri.edu address.
 */
class FacultyProfileUpdateTest extends TestCase
{
    private array $userIds = [];
    private int $facultyId;
    private string $email;
    private array $auth = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->email = 'facprofiletest_' . uniqid() . '@rajagiri.edu';
        $this->facultyId = DB::table('users')->insertGetId([
            'name' => 'Faculty Profile Test',
            'email' => $this->email,
            'password' => Hash::make('facultypass123'),
            'role' => 'faculty',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->userIds[] = $this->facultyId;

        $token = $this->postJson('/api/auth/login', ['email' => $this->email, 'password' => 'facultypass123'])
            ->assertStatus(200)->json('access_token');
        $this->auth = ['Authorization' => 'Bearer ' . $token];
    }

    protected function tearDown(): void
    {
        DB::table('faculty_profiles')->whereIn('faculty_id', $this->userIds)->delete();
        DB::table('audit_logs')->whereIn('user_id', $this->userIds)->delete();
        DB::table('users')->whereIn('id', $this->userIds)->delete();
        parent::tearDown();
    }

    private function update(array $data)
    {
        return $this->withHeaders($this->auth)->putJson('/api/faculty/profile', array_merge([
            'name' => 'Faculty Profile Test',
            'email' => $this->email,
        ], $data));
    }

    private function storedEmail(): string
    {
        return DB::table('users')->where('id', $this->facultyId)->value('email');
    }

    public function test_email_that_login_would_reject_is_not_saved(): void
    {
        $this->update(['email' => 'someone@gmail.com'])->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertSame($this->email, $this->storedEmail());
    }

    public function test_column_limits_give_validation_errors_not_server_errors(): void
    {
        $this->update(['name' => str_repeat('a', 151)])->assertStatus(422)->assertJsonValidationErrors('name');
        $this->update(['phone' => str_repeat('9', 21)])->assertStatus(422)->assertJsonValidationErrors('phone');
        $this->update(['department' => str_repeat('d', 151)])->assertStatus(422)->assertJsonValidationErrors('department');
        $this->update(['designation' => str_repeat('x', 101)])->assertStatus(422)->assertJsonValidationErrors('designation');

        $this->update([
            'name' => str_repeat('a', 150),
            'phone' => str_repeat('9', 20),
            'department' => str_repeat('d', 150),
            'designation' => str_repeat('x', 100),
        ])->assertStatus(200);
    }

    public function test_duplicate_email_is_rejected_case_insensitively(): void
    {
        $otherEmail = 'facprofiletest_other_' . uniqid() . '@rajagiri.edu';
        $this->userIds[] = DB::table('users')->insertGetId([
            'name' => 'Other User',
            'email' => $otherEmail,
            'password' => Hash::make('otherpass123'),
            'role' => 'coordinator',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->update(['email' => strtoupper($otherEmail)])->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertSame($this->email, $this->storedEmail());
    }

    public function test_updated_email_is_saved_and_can_be_used_to_log_in(): void
    {
        $newEmail = 'facprofiletest_new_' . uniqid() . '@rajagiri.edu';

        $this->update(['email' => $newEmail, 'name' => 'Renamed Faculty', 'phone' => '+91 9876543210'])
            ->assertStatus(200)
            ->assertJsonPath('data.email', $newEmail)
            ->assertJsonPath('data.name', 'Renamed Faculty');

        $row = DB::table('users')->where('id', $this->facultyId)->first();
        $this->assertSame($newEmail, $row->email);
        $this->assertSame('+91 9876543210', $row->phone);

        $this->postJson('/api/auth/login', ['email' => $newEmail, 'password' => 'facultypass123'])->assertStatus(200);
        $this->postJson('/api/auth/login', ['email' => $this->email, 'password' => 'facultypass123'])
            ->assertStatus(401)
            ->assertJsonMissingPath('access_token');
    }
}
