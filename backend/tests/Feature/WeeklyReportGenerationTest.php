<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class WeeklyReportGenerationTest extends TestCase
{
    private array $insertedIds = [];

    protected function tearDown(): void
    {
        if (!empty($this->insertedIds)) {
            DB::table('student_reports')->whereIn('id', $this->insertedIds)->delete();
        }
        parent::tearDown();
    }

    public function test_weekly_report_aggregates_a_real_daily_report(): void
    {
        // Same eligibility logic as StudentController::saveReport(): task belongs to a
        // module of the project, assigned to the student, student is also a
        // project_student member, task not already completed. (tasks.review_status was
        // dropped by the 2026_09_14_143933 migration in favor of a 'rework' status
        // value, and saveReport()'s own check was simplified to match — mirrored here.)
        // Additionally require this student+project pair has NO existing
        // student_reports rows at all (daily or weekly) — nothing this test does can
        // touch pre-existing data.
        $combo = DB::table('tasks')
            ->join('modules', 'modules.id', '=', 'tasks.module_id')
            ->join('project_student', function ($j) {
                $j->on('project_student.project_id', '=', 'modules.project_id')
                  ->on('project_student.student_id', '=', 'tasks.assigned_to');
            })
            ->where('tasks.status', '!=', 'completed')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))->from('student_reports')
                  ->whereColumn('student_reports.student_id', 'tasks.assigned_to')
                  ->whereColumn('student_reports.project_id', 'modules.project_id');
            })
            ->select('tasks.id as task_id', 'tasks.assigned_to as student_id', 'modules.project_id')
            ->first();

        if (!$combo) {
            $this->markTestSkipped('No eligible, report-free student/project/task combination found in the current database.');
        }

        // Compute the exact weekly_key syncWeekly() will use, and explicitly verify
        // no weekly report with that key exists yet — separate, direct check beyond
        // the whereNotExists above.
        $today = now();
        $weekStart = $today->copy()->startOfWeek(Carbon::MONDAY)->toDateString();
        $expectedWeeklyKey = "std_{$combo->student_id}_proj_{$combo->project_id}_wk_{$weekStart}";

        $preExisting = DB::table('student_reports')->where('weekly_key', $expectedWeeklyKey)->exists();
        if ($preExisting) {
            $this->markTestSkipped("A weekly report already exists for key {$expectedWeeklyKey}; skipping to avoid touching it.");
        }

        // Insert exactly one daily report — the only row we insert directly.
        $marker = 'AUTOMATED_TEST_' . uniqid();
        $dailyId = DB::table('student_reports')->insertGetId([
            'student_id' => $combo->student_id, 'project_id' => $combo->project_id, 'task_id' => $combo->task_id,
            'report_type' => 'daily', 'report_date' => $today->toDateString(),
            'work_done' => $marker, 'hours_worked' => 3.5, 'approval_status' => 'pending',
            'submitted_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->insertedIds[] = $dailyId;

        $weekly = \Modules\Student\Models\StudentReport::syncWeekly(
            $combo->student_id, $combo->project_id, $today->toDateString()
        );

        $this->assertNotNull($weekly, 'Expected a weekly report to be generated from the inserted daily report.');
        $this->assertSame(
            $expectedWeeklyKey,
            $weekly->weekly_key,
            'Generated weekly report does not have the expected key — cannot prove ownership.'
        );

        // Ownership proof: we already confirmed (immediately above) that no row with
        // this exact weekly_key existed before this call, and syncWeekly() only
        // inserts a new row when no row with that key is found — it never updates a
        // differently-keyed row. So a row now existing under this exact key can only
        // be the one this call just created. Only now do we queue it for cleanup.
        if (!$preExisting && $weekly->weekly_key === $expectedWeeklyKey) {
            $this->insertedIds[] = $weekly->id;
        } else {
            $this->fail('Could not verify ownership of the generated weekly report; refusing to schedule it for deletion.');
        }

        $this->assertStringContainsString($marker, $weekly->work_done);
        $this->assertEquals(3.5, (float) $weekly->hours_worked);
    }
}
