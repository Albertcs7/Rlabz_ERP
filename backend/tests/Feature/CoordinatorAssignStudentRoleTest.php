<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Coordinator → Assign Student offers only Nova / Orbit / Spark. Checks the
 * value is accepted, persisted (project_student + student_roles) and returned
 * by the Students endpoint. Needs the 2026_10_14 ENUM migration to be applied.
 */
class CoordinatorAssignStudentRoleTest extends TestCase
{
    private array $userIds = [];
    private ?int $studentId = null;
    private ?int $projectId = null;
    private string $coordinatorEmail;

    protected function setUp(): void
    {
        parent::setUp();

        $this->projectId = DB::table('projects')->orderBy('id')->value('id');
        if (!$this->projectId) {
            $this->markTestSkipped('No project exists to assign a student to.');
        }

        $this->coordinatorEmail = 'coordtest_' . uniqid() . '@rajagiri.edu';
        $this->userIds[] = DB::table('users')->insertGetId([
            'name' => 'Assign Test Coordinator',
            'email' => $this->coordinatorEmail,
            'password' => Hash::make('coordpass123'),
            'role' => 'coordinator',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->studentId = DB::table('users')->insertGetId([
            'name' => 'Assign Test Student',
            'email' => 'assigntest_' . uniqid() . '@rajagiri.edu',
            'password' => Hash::make('studentpass123'),
            'role' => 'student',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->userIds[] = $this->studentId;
    }

    protected function tearDown(): void
    {
        if ($this->studentId) {
            DB::table('project_student')->where('student_id', $this->studentId)->delete();
            DB::table('student_roles')->where('student_id', $this->studentId)->delete();
            DB::table('notifications')->where('user_id', $this->studentId)->delete();
        }
        if ($this->userIds) {
            DB::table('users')->whereIn('id', $this->userIds)->delete();
        }
        parent::tearDown();
    }

    private function coordinatorHeaders(): array
    {
        $response = $this->postJson('/api/auth/login', ['email' => $this->coordinatorEmail, 'password' => 'coordpass123']);
        $response->assertStatus(200);
        return ['Authorization' => 'Bearer ' . $response->json('access_token')];
    }

    private function assign(string $role)
    {
        return $this->withHeaders($this->coordinatorHeaders())
            ->postJson("/api/coordinator/projects/{$this->projectId}/students", [
                'student_id' => $this->studentId,
                'role' => $role,
            ]);
    }

    public function test_nova_is_accepted_persisted_and_displayed(): void
    {
        $this->assign('nova')->assertStatus(201);

        $this->assertSame('nova', DB::table('project_student')
            ->where('project_id', $this->projectId)->where('student_id', $this->studentId)->value('role'));
        $this->assertSame('nova', DB::table('student_roles')->where('student_id', $this->studentId)->value('role'));

        $students = $this->withHeaders($this->coordinatorHeaders())->getJson('/api/coordinator/students')
            ->assertStatus(200)->json('data');
        $row = collect($students)->firstWhere('db_id', $this->studentId);
        $this->assertNotNull($row);
        $this->assertSame('Nova', $row['assignments'][0]['designation']);
        $this->assertArrayHasKey('is_current', $row['assignments'][0]);
    }

    public function test_orbit_and_spark_are_accepted(): void
    {
        $this->assign('orbit')->assertStatus(201);
        DB::table('project_student')->where('student_id', $this->studentId)->delete();
        DB::table('student_roles')->where('student_id', $this->studentId)->delete();

        $this->assign('spark')->assertStatus(201);
        $this->assertSame('spark', DB::table('project_student')->where('student_id', $this->studentId)->value('role'));
    }

    public function test_old_role_values_are_no_longer_accepted(): void
    {
        foreach (['project_lead', 'developer', 'designer', 'tester', 'other'] as $legacy) {
            $this->assign($legacy)->assertStatus(422);
        }
        $this->assertFalse(DB::table('project_student')->where('student_id', $this->studentId)->exists());
    }

    public function test_legacy_global_role_is_replaced_by_the_assigned_role(): void
    {
        DB::table('student_roles')->insert([
            'student_id' => $this->studentId,
            'role' => 'developer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assign('orbit')->assertStatus(201);
        $this->assertSame('orbit', DB::table('student_roles')->where('student_id', $this->studentId)->value('role'));
    }

    public function test_existing_new_style_global_role_still_locks(): void
    {
        DB::table('student_roles')->insert([
            'student_id' => $this->studentId,
            'role' => 'spark',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assign('nova')->assertStatus(422);
        $this->assertSame('spark', DB::table('student_roles')->where('student_id', $this->studentId)->value('role'));
    }
}
