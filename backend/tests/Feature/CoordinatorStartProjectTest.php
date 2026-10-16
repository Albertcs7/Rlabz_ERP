<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CoordinatorStartProjectTest extends TestCase
{
    private const PASSWORD = 'start-project-test-pass';

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
        $email = 'start-project-test-' . $role . '-' . uniqid() . '@rajagiri.edu';
        $id = DB::table('users')->insertGetId([
            'name' => 'Start Project Test ' . ucfirst($role),
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
            'title' => 'AUTOMATED_TEST_START_PROJECT_' . uniqid(),
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
        $coordinator = $this->createUser('coordinator');
        $projectId = $this->createProject('accepted', $coordinator->id);

        $this->postJson("/api/coordinator/projects/{$projectId}/start")->assertStatus(401);

        $this->assertEquals('accepted', $this->statusOf($projectId));
    }

    public function test_student_with_view_projects_permission_cannot_start_project(): void
    {
        $coordinator = $this->createUser('coordinator');
        // Students are created with 'view-projects', which other coordinator endpoints accept.
        $student = $this->createUser('student', ['view-student', 'view-projects']);
        $projectId = $this->createProject('accepted', $coordinator->id);

        $this->withHeader('Authorization', 'Bearer ' . $this->loginAndGetToken($student->email))
            ->postJson("/api/coordinator/projects/{$projectId}/start")
            ->assertStatus(403);

        $this->assertEquals('accepted', $this->statusOf($projectId));
    }

    public function test_non_coordinator_role_cannot_start_project(): void
    {
        $coordinator = $this->createUser('coordinator');
        $director = $this->createUser('director');
        $projectId = $this->createProject('accepted', $coordinator->id);

        $this->withHeader('Authorization', 'Bearer ' . $this->loginAndGetToken($director->email))
            ->postJson("/api/coordinator/projects/{$projectId}/start")
            ->assertStatus(403);

        $this->assertEquals('accepted', $this->statusOf($projectId));
    }

    public function test_only_accepted_projects_can_be_started(): void
    {
        $coordinator = $this->createUser('coordinator');
        $token = $this->loginAndGetToken($coordinator->email);

        foreach (['proposed', 'rejected', 'in_progress', 'closed'] as $status) {
            $projectId = $this->createProject($status, $coordinator->id);

            $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->postJson("/api/coordinator/projects/{$projectId}/start");

            $response->assertStatus(422);
            $this->assertStringContainsString("current status: {$status}", (string) $response->json('error'));
            $this->assertEquals($status, $this->statusOf($projectId), "A '{$status}' project must not change status.");
        }
    }

    public function test_coordinator_can_start_accepted_project(): void
    {
        $coordinator = $this->createUser('coordinator');
        $projectId = $this->createProject('accepted', $coordinator->id);
        $token = $this->loginAndGetToken($coordinator->email);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/coordinator/projects/{$projectId}/start");

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'Project started successfully');
        $response->assertJsonPath('data.id', $projectId);
        $response->assertJsonPath('data.status', 'in_progress');
        $this->assertEquals('in_progress', $this->statusOf($projectId));

        $this->assertTrue(
            DB::table('audit_logs')
                ->where('user_id', $coordinator->id)
                ->where('action', 'Project Started')
                ->exists(),
            'Starting a project should be recorded in the audit log.'
        );

        // A second start is now an invalid transition (in_progress → in_progress).
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/coordinator/projects/{$projectId}/start")
            ->assertStatus(422);
    }

    public function test_starting_missing_project_returns_404(): void
    {
        $coordinator = $this->createUser('coordinator');
        $missingId = (int) DB::table('projects')->max('id') + 100000;

        $this->withHeader('Authorization', 'Bearer ' . $this->loginAndGetToken($coordinator->email))
            ->postJson("/api/coordinator/projects/{$missingId}/start")
            ->assertStatus(404);
    }
}
