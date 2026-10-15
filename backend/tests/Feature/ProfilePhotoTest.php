<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * /api/auth/profile-photo — the logged-in user's own photo (any role).
 * Needs the 2026_10_14_000001 users.profile_photo_path migration.
 */
class ProfilePhotoTest extends TestCase
{
    // Smallest valid PNG (1x1). GD isn't installed, so a real image is built from bytes.
    private const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    private array $userIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        if (!Schema::hasColumn('users', 'profile_photo_path')) {
            $this->markTestSkipped('users.profile_photo_path migration has not been run on this database.');
        }
        Storage::fake('public');
    }

    protected function tearDown(): void
    {
        if ($this->userIds) {
            DB::table('users')->whereIn('id', $this->userIds)->delete();
        }
        parent::tearDown();
    }

    private function makeUser(string $role): array
    {
        $email = 'phototest_' . uniqid() . '@rajagiri.edu';
        $id = DB::table('users')->insertGetId([
            'name' => 'Photo Test ' . ucfirst($role),
            'email' => $email,
            'password' => Hash::make('photopass123'),
            'role' => $role,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->userIds[] = $id;

        $token = $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'photopass123'])
            ->assertStatus(200)->json('access_token');

        return [$id, ['Authorization' => 'Bearer ' . $token]];
    }

    private function png(string $name = 'photo.png', int $padBytes = 0): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode(self::PNG_BASE64) . str_repeat("\0", $padBytes));
    }

    public function test_user_can_upload_view_replace_and_remove_own_photo(): void
    {
        [$id, $auth] = $this->makeUser('coordinator');

        $this->withHeaders($auth)->getJson('/api/auth/profile-photo')
            ->assertStatus(200)->assertJson(['profile_photo_path' => null]);

        $first = $this->withHeaders($auth)->post('/api/auth/profile-photo', ['photo' => $this->png()], ['Accept' => 'application/json'])
            ->assertStatus(200)->json('profile_photo_path');
        $this->assertStringStartsWith('profile_photos/', $first);
        Storage::disk('public')->assertExists($first);
        $this->assertSame($first, DB::table('users')->where('id', $id)->value('profile_photo_path'));

        // Persists: a later GET returns the same path.
        $this->withHeaders($auth)->getJson('/api/auth/profile-photo')->assertJson(['profile_photo_path' => $first]);

        // Replacing deletes the previous file.
        $second = $this->withHeaders($auth)->post('/api/auth/profile-photo', ['photo' => $this->png('again.png')], ['Accept' => 'application/json'])
            ->assertStatus(200)->json('profile_photo_path');
        Storage::disk('public')->assertExists($second);
        Storage::disk('public')->assertMissing($first);

        $this->withHeaders($auth)->deleteJson('/api/auth/profile-photo')->assertStatus(200);
        Storage::disk('public')->assertMissing($second);
        $this->assertNull(DB::table('users')->where('id', $id)->value('profile_photo_path'));
    }

    public function test_photo_is_saved_only_for_the_authenticated_user(): void
    {
        [$ownerId, $ownerAuth] = $this->makeUser('faculty');
        [$otherId] = $this->makeUser('coordinator');

        // Any user id in the request body is ignored — the JWT decides whose photo it is.
        $this->withHeaders($ownerAuth)->post('/api/auth/profile-photo', ['photo' => $this->png(), 'user_id' => $otherId], ['Accept' => 'application/json'])
            ->assertStatus(200);

        $this->assertNotNull(DB::table('users')->where('id', $ownerId)->value('profile_photo_path'));
        $this->assertNull(DB::table('users')->where('id', $otherId)->value('profile_photo_path'));
    }

    public function test_invalid_files_are_rejected(): void
    {
        [$id, $auth] = $this->makeUser('director');

        $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $pdf = UploadedFile::fake()->createWithContent('doc.pdf', "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
        $tooLarge = $this->png('big.png', 2100 * 1024);

        foreach ([$svg, $pdf, $tooLarge] as $file) {
            $this->withHeaders($auth)->post('/api/auth/profile-photo', ['photo' => $file], ['Accept' => 'application/json'])
                ->assertStatus(422)->assertJsonValidationErrors('photo');
        }
        $this->withHeaders($auth)->post('/api/auth/profile-photo', [], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('photo');

        $this->assertNull(DB::table('users')->where('id', $id)->value('profile_photo_path'));
        $this->assertEmpty(Storage::disk('public')->allFiles('profile_photos'));
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/auth/profile-photo')->assertStatus(401);
        $this->post('/api/auth/profile-photo', ['photo' => $this->png()], ['Accept' => 'application/json'])->assertStatus(401);
    }
}
