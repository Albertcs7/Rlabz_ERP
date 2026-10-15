<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

/**
 * Shared /api/auth/profile (used by the /profile page): profile photos come only
 * from users.profile_photo_path, so `avatar` is no longer accepted or written,
 * and phone is limited to the users.phone column size.
 */
class AuthProfileTest extends TestCase
{
    private ?int $userId = null;
    private string $email;
    private array $auth = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->email = 'authprofiletest_' . uniqid() . '@rajagiri.edu';
        $this->userId = DB::table('users')->insertGetId([
            'name' => 'Auth Profile Test',
            'email' => $this->email,
            'password' => Hash::make('authprofile123'),
            'role' => 'director',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $this->postJson('/api/auth/login', ['email' => $this->email, 'password' => 'authprofile123'])
            ->assertStatus(200)->json('access_token');
        $this->auth = ['Authorization' => 'Bearer ' . $token];
    }

    protected function tearDown(): void
    {
        if ($this->userId) {
            DB::table('audit_logs')->where('user_id', $this->userId)->delete();
            DB::table('users')->where('id', $this->userId)->delete();
        }
        parent::tearDown();
    }

    public function test_profile_response_includes_profile_photo_path(): void
    {
        if (!Schema::hasColumn('users', 'profile_photo_path')) {
            $this->markTestSkipped('users.profile_photo_path migration has not been run on this database.');
        }

        DB::table('users')->where('id', $this->userId)->update(['profile_photo_path' => 'profile_photos/test.jpg']);

        $this->withHeaders($this->auth)->getJson('/api/auth/profile')
            ->assertStatus(200)
            ->assertJsonPath('user.profile_photo_path', 'profile_photos/test.jpg')
            ->assertJsonMissingPath('user.password');
    }

    public function test_avatar_is_no_longer_accepted_or_written(): void
    {
        $this->withHeaders($this->auth)->putJson('/api/auth/profile', [
            'name' => 'Auth Profile Test',
            'avatar' => 'data:image/png;base64,' . str_repeat('A', 2000),
        ])->assertStatus(200);

        if (Schema::hasColumn('users', 'avatar')) {
            $this->assertNull(DB::table('users')->where('id', $this->userId)->value('avatar'));
        }
    }

    public function test_phone_longer_than_the_column_is_a_validation_error(): void
    {
        $this->withHeaders($this->auth)->putJson('/api/auth/profile', [
            'name' => 'Auth Profile Test',
            'phone' => str_repeat('9', 21),
        ])->assertStatus(422)->assertJsonValidationErrors('phone');

        $this->withHeaders($this->auth)->putJson('/api/auth/profile', [
            'name' => 'Auth Profile Test',
            'phone' => str_repeat('9', 20),
        ])->assertStatus(200);
    }

    public function test_email_cannot_be_changed_through_shared_profile(): void
    {
        $this->withHeaders($this->auth)->putJson('/api/auth/profile', [
            'name' => 'Auth Profile Test',
            'email' => 'someone@gmail.com',
        ])->assertStatus(200);

        $this->assertSame($this->email, DB::table('users')->where('id', $this->userId)->value('email'));
    }
}
