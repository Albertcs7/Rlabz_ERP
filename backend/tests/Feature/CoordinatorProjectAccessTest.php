<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;

class CoordinatorProjectAccessTest extends TestCase
{
    private array $insertedRequirementIds = [];

    protected function tearDown(): void
    {
        if (!empty($this->insertedRequirementIds)) {
            DB::table('client_requirements')->whereIn('id', $this->insertedRequirementIds)->delete();
        }
        parent::tearDown();
    }

    private function loginAndGetToken(string $email, string $password): string
    {
        $response = $this->postJson('/api/auth/login', ['email' => $email, 'password' => $password]);
        $response->assertStatus(200);
        $token = $response->json('access_token');
        $this->assertNotNull($token);
        return $token;
    }

    public function test_coordinator_module_creation_route_no_longer_exists(): void
    {
        $project = DB::table('projects')->first();
        if (!$project) {
            $this->markTestSkipped('No project exists to exercise this test against.');
        }

        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/coordinator/projects/{$project->id}/modules", ['module_name' => 'Should not be creatable']);

        // Route removed entirely from Modules\Coordinator\Routes\api.php.
        $response->assertStatus(404);
    }

    public function test_coordinator_cannot_create_module_via_project_task_routes(): void
    {
        $project = DB::table('projects')->first();
        if (!$project) {
            $this->markTestSkipped('No project exists to exercise this test against.');
        }

        $before = DB::table('modules')->count();
        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/projects/{$project->id}/modules", ['name' => 'Should not be creatable']);

        $response->assertStatus(403);
        $this->assertEquals($before, DB::table('modules')->count(), 'No module should have been created.');
    }

    public function test_coordinator_cannot_update_module_status(): void
    {
        $module = DB::table('modules')->first();
        if (!$module) {
            $this->markTestSkipped('No module exists to exercise this test against.');
        }

        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');
        $differentStatus = $module->status === 'completed' ? 'in_progress' : 'completed';

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/projects/modules/{$module->id}/status", ['status' => $differentStatus]);

        $response->assertStatus(403);
        $current = DB::table('modules')->where('id', $module->id)->first();
        $this->assertEquals($module->status, $current->status, 'Module status must not have changed.');
    }

    public function test_coordinator_cannot_create_task(): void
    {
        $module = DB::table('modules')->first();
        if (!$module) {
            $this->markTestSkipped('No module exists to exercise this test against.');
        }

        $before = DB::table('tasks')->count();
        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/projects/modules/{$module->id}/tasks", ['title' => 'Should not be creatable']);

        $response->assertStatus(403);
        $this->assertEquals($before, DB::table('tasks')->count(), 'No task should have been created.');
    }

    public function test_coordinator_can_view_project_progress_matching_faculty_formula(): void
    {
        $project = DB::table('projects')
            ->whereExists(function ($q) {
                $q->select(DB::raw(1))->from('modules')->whereColumn('modules.project_id', 'projects.id');
            })
            ->first();

        if (!$project) {
            $this->markTestSkipped('No project with modules exists to exercise this test against.');
        }

        // Independently compute the expected value the same way
        // FacultyController::getDashboardData() does, straight from the database —
        // not by calling the coordinator endpoint under test.
        $moduleIds = DB::table('modules')->where('project_id', $project->id)->pluck('id');
        $totalTasks = DB::table('tasks')->whereIn('module_id', $moduleIds)->count();
        $completedTasks = DB::table('tasks')->whereIn('module_id', $moduleIds)->where('status', 'completed')->count();
        $expectedPercentage = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/coordinator/projects/{$project->id}");

        $response->assertStatus(200);
        $progress = $response->json('data.progress');
        $this->assertNotNull($progress);
        $this->assertEquals($totalTasks, $progress['task_count']);
        $this->assertEquals($completedTasks, $progress['completed_task_count']);
        $this->assertEquals($expectedPercentage, $progress['completion_percentage']);
    }

    public function test_add_requirement_creates_new_record(): void
    {
        $task = DB::table('tasks')
            ->join('modules', 'modules.id', '=', 'tasks.module_id')
            ->select('tasks.id as task_id', 'modules.project_id')
            ->first();

        if (!$task) {
            $this->markTestSkipped('No task exists to exercise this test against.');
        }

        $before = DB::table('client_requirements')->count();
        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');
        $marker = 'AUTOMATED_TEST_REQUIREMENT_' . uniqid();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/coordinator/projects/{$task->project_id}/requirements", [
                'task_id' => $task->task_id,
                'description' => $marker,
            ]);

        $response->assertStatus(201);
        $newId = $response->json('data.id');
        $this->assertNotNull($newId);
        $this->insertedRequirementIds[] = $newId; // only this exact row will ever be deleted

        $this->assertEquals($before + 1, DB::table('client_requirements')->count());
        $stored = DB::table('client_requirements')->where('id', $newId)->first();
        $this->assertEquals($marker, $stored->description);
        $this->assertEquals($task->task_id, $stored->task_id);
        $this->assertEquals($task->project_id, $stored->project_id);
    }
}
