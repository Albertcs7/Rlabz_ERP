<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DeveloperStartProjectTest extends TestCase
{
    private const PASSWORD = 'developer-start-test-pass';

    private array $insertedUserIds = [];
    private array $insertedProjectIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        // These tests insert and delete their own rows. Refuse to run against anything
        // that is not a dedicated test database (e.g. DB_DATABASE=rlabz_erp_test).
        $database = DB::connection()->getDatabaseName();
        if (!str_ends_with((string) $database, '_test')) {
            $this->markTestSkipped("Refusing to run against non-test database '{$database}'. Set DB_DATABASE to a *_test database.");
        }
    }

    protected function tearDown(): void
    {
        // Only the exact rows created by this test are removed (children before parents).
        if (!empty($this->insertedUserIds)) {
            DB::table('audit_logs')->whereIn('user_id', $this->insertedUserIds)->delete();
        }
        if (!empty($this->insertedProjectIds)) {
            DB::table('projects')->whereIn('id', $this->insertedProjectIds)->delete();
        }
        if (!empty($this->insertedUserIds)) {
            DB::table('users')->whereIn('id', $this->insertedUserIds)->delete();
        }
        parent::tearDown();
    }

    private function createUser(string $role, array $permissions = []): object
    {
        // Login only accepts @rajagiri.edu addresses; the unique prefix keeps these clear of real accounts.
        $email = 'developer-start-test-' . $role . '-' . uniqid() . '@rajagiri.edu';
        $id = DB::table('users')->insertGetId([
            'name' => 'Developer Start Test ' . ucfirst($role),
            'email' => $email,
            'password' => Hash::make(self::PASSWORD),
            'role' => $role,
            'permissions' => json_encode($permissions),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->insertedUserIds[] = $id;

        return (object) ['id' => $id, 'email' => $email];
    }

    private function createProject(string $status, int $createdBy): int
    {
        $id = DB::table('projects')->insertGetId([
            'title' => 'AUTOMATED_TEST_DEVELOPER_START_' . uniqid(),
            'priority' => 'normal',
            'status' => $status,
            'created_by' => $createdBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->insertedProjectIds[] = $id;

        return $id;
    }

    private function loginAndGetToken(string $email): string
    {
        $response = $this->postJson('/api/auth/login', ['email' => $email, 'password' => self::PASSWORD]);
        $response->assertStatus(200);
        $token = $response->json('access_token');
        $this->assertNotNull($token, "Login for {$email} did not return an access_token.");

        return $token;
    }

    private function statusOf(int $projectId): string
    {
        return DB::table('projects')->where('id', $projectId)->value('status');
    }

    public function test_start_requires_authentication(): void
    {
        $owner = $this->createUser('coordinator');
        $projectId = $this->createProject('accepted', $owner->id);

        $this->postJson("/api/developer/projects/{$projectId}/start")->assertStatus(401);

        $this->assertEquals('accepted', $this->statusOf($projectId));
    }

    public function test_student_cannot_start_project(): void
    {
        $owner = $this->createUser('coordinator');
        // Students are created with these permissions by CoordinatorController::storeStudent().
        $student = $this->createUser('student', ['view-student', 'view-projects', 'view-communication', 'view-github', 'view-certificates-read']);
        $projectId = $this->createProject('accepted', $owner->id);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->loginAndGetToken($student->email))
            ->postJson("/api/developer/projects/{$projectId}/start");

        $response->assertStatus(403);
        $this->assertEquals('accepted', $this->statusOf($projectId));
        $this->assertFalse(
            DB::table('audit_logs')->where('user_id', $student->id)->where('action', 'Project Started')->exists(),
            'A rejected start must not be audit-logged as a project start.'
        );
    }

    public function test_other_non_developer_roles_cannot_start_project(): void
    {
        $owner = $this->createUser('coordinator');

        // Coordinators start projects through /api/coordinator/projects/{id}/start instead.
        foreach (['coordinator', 'director', 'faculty', 'finance'] as $role) {
            $user = $this->createUser($role);
            $projectId = $this->createProject('accepted', $owner->id);

            $this->withHeader('Authorization', 'Bearer ' . $this->loginAndGetToken($user->email))
                ->postJson("/api/developer/projects/{$projectId}/start")
                ->assertStatus(403);

            $this->assertEquals('accepted', $this->statusOf($projectId), "A {$role} must not be able to start a project here.");
        }
    }

    public function test_developer_can_start_accepted_project(): void
    {
        $owner = $this->createUser('coordinator');
        $developer = $this->createUser('developer');
        $projectId = $this->createProject('accepted', $owner->id);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->loginAndGetToken($developer->email))
            ->postJson("/api/developer/projects/{$projectId}/start");

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('data.status', 'in_progress');
        $this->assertEquals('in_progress', $this->statusOf($projectId));
        $this->assertTrue(
            DB::table('audit_logs')->where('user_id', $developer->id)->where('action', 'Project Started')->exists(),
            'Starting a project should still be recorded in the audit log.'
        );
    }

    public function test_developer_cannot_start_project_that_is_not_accepted(): void
    {
        $owner = $this->createUser('coordinator');
        $token = $this->loginAndGetToken($this->createUser('developer')->email);

        foreach (['proposed', 'rejected', 'in_progress', 'closed'] as $status) {
            $projectId = $this->createProject($status, $owner->id);

            $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->postJson("/api/developer/projects/{$projectId}/start");

            $response->assertStatus(422);
            $this->assertStringContainsString("current status: {$status}", (string) $response->json('error'));
            $this->assertEquals($status, $this->statusOf($projectId), "A '{$status}' project must not change status.");
        }
    }

    public function test_developer_starting_missing_project_returns_404(): void
    {
        $developer = $this->createUser('developer');
        $missingId = (int) DB::table('projects')->max('id') + 100000;

        $this->withHeader('Authorization', 'Bearer ' . $this->loginAndGetToken($developer->email))
            ->postJson("/api/developer/projects/{$missingId}/start")
            ->assertStatus(404);
    }
}
