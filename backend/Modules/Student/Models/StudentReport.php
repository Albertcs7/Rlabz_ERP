<?php

namespace Modules\Student\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Modules\Auth\Models\User;

class StudentReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'project_id',
        'task_id',
        'report_type',
        'report_date',
        'week_start',
        'week_end',
        'weekly_key',
        'work_done',
        'tasks_completed',
        'report_file',
        'challenges',
        'next_plan',
        'remarks',
        'hours_worked',
        'approval_status',
        'feedback',
        'submitted_at',
    ];

    protected $casts = [
        'report_date' => 'date',
        'week_start' => 'date',
        'week_end' => 'date',
        'submitted_at' => 'datetime',
        'hours_worked' => 'decimal:2',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function project()
    {
        return $this->belongsTo(\Modules\Project\Models\Project::class, 'project_id');
    }

    public function task()
    {
        return $this->belongsTo(\Modules\Project\Models\Task::class, 'task_id');
    }

    /**
     * Creates or updates the single weekly-aggregate report (report_type='weekly')
     * for a student/project/week, built entirely from that week's real daily reports.
     * Never fabricates a weekly report when no daily reports exist. Shared by both the
     * automatic student-submit flow (StudentController::saveReport) and the
     * coordinator-triggered manual generation (CoordinatorController::generateWeeklyReport)
     * so both paths always produce identical, non-duplicated rows (enforced by the
     * unique weekly_key constraint).
     */
    public static function syncWeekly(int $studentId, int $projectId, string $referenceDate): ?self
    {
        $date = Carbon::parse($referenceDate);
        $weekStart = $date->copy()->startOfWeek(Carbon::MONDAY)->toDateString();
        $weekEnd = $date->copy()->endOfWeek(Carbon::SUNDAY)->toDateString();
        $weeklyKey = "std_{$studentId}_proj_{$projectId}_wk_{$weekStart}";

        return DB::transaction(function () use ($studentId, $projectId, $weekStart, $weekEnd, $weeklyKey) {
            $dailyReports = DB::table('student_reports')
                ->leftJoin('tasks', 'tasks.id', '=', 'student_reports.task_id')
                ->where('student_reports.student_id', $studentId)
                ->where('student_reports.project_id', $projectId)
                ->where('student_reports.report_type', 'daily') // never pulls in an existing weekly row
                ->whereBetween('student_reports.report_date', [$weekStart, $weekEnd])
                ->select(
                    'student_reports.id',
                    'student_reports.report_date',
                    'student_reports.work_done',
                    'student_reports.tasks_completed',
                    'student_reports.next_plan',
                    'student_reports.challenges',
                    'student_reports.remarks',
                    'student_reports.hours_worked',
                    'student_reports.task_id',
                    'tasks.title as task_title',
                    'tasks.status as task_status'
                )
                ->orderBy('student_reports.report_date', 'asc')
                ->orderBy('student_reports.id', 'asc')
                ->get();

            if ($dailyReports->isEmpty()) {
                return null;
            }

            $totalHours = $dailyReports->sum(fn ($r) => $r->hours_worked !== null ? (float) $r->hours_worked : 0);

            $payload = [
                'work_done' => self::formatByTask($dailyReports, 'work_done'),
                'tasks_completed' => self::formatByTask($dailyReports, 'tasks_completed') ?: null,
                'next_plan' => self::formatByTask($dailyReports, 'next_plan') ?: null,
                'challenges' => self::formatByTask($dailyReports, 'challenges') ?: null,
                'remarks' => self::formatByTask($dailyReports, 'remarks') ?: null,
                'hours_worked' => $totalHours > 0 ? $totalHours : null,
                'report_date' => $weekEnd,
                'week_start' => $weekStart,
                'week_end' => $weekEnd,
                'updated_at' => now(),
            ];

            // lockForUpdate serializes concurrent auto-sync (student submit) and manual
            // generate (coordinator) calls for the same weekly_key, preventing a
            // duplicate-key race against the unique constraint.
            $existing = DB::table('student_reports')->where('weekly_key', $weeklyKey)->lockForUpdate()->first();

            if ($existing) {
                DB::table('student_reports')->where('id', $existing->id)->update($payload);
                $id = $existing->id;
            } else {
                $id = DB::table('student_reports')->insertGetId(array_merge($payload, [
                    'student_id' => $studentId,
                    'project_id' => $projectId,
                    'task_id' => null,
                    'report_type' => 'weekly',
                    'weekly_key' => $weeklyKey,
                    'approval_status' => 'pending',
                    'submitted_at' => now(),
                    'created_at' => now(),
                ]));
            }

            return self::find($id);
        });
    }

    /**
     * Groups a week's daily reports by task and concatenates the given field's
     * non-empty values into one readable, dated summary. Same presentation style
     * used consistently for work_done, tasks_completed, next_plan, challenges, remarks.
     */
    private static function formatByTask($dailyReports, string $field): string
    {
        $tasksGrouped = [];
        foreach ($dailyReports as $dr) {
            $value = trim((string) ($dr->{$field} ?? ''));
            if ($value === '') {
                continue;
            }

            $tId = $dr->task_id ?: 'general';
            if (!isset($tasksGrouped[$tId])) {
                $statusMap = [
                    'todo' => 'Todo',
                    'in_progress' => 'In Progress',
                    'completed' => 'Completed',
                    'blocked' => 'Blocked',
                ];
                $tasksGrouped[$tId] = [
                    'taskCode' => $dr->task_id ? 'T-' . $dr->task_id : 'General',
                    'taskTitle' => $dr->task_title ?: 'General Work',
                    'taskStatus' => $statusMap[strtolower($dr->task_status ?: 'todo')] ?? ucfirst($dr->task_status ?: 'Todo'),
                    'entries' => [],
                ];
            }
            $tasksGrouped[$tId]['entries'][] = [
                'date' => $dr->report_date,
                'value' => $value,
            ];
        }

        if (empty($tasksGrouped)) {
            return '';
        }

        $formattedText = '';
        foreach ($tasksGrouped as $tg) {
            $formattedText .= "{$tg['taskCode']} — {$tg['taskTitle']}\n";
            $formattedText .= "Status: {$tg['taskStatus']}\n";
            foreach ($tg['entries'] as $entry) {
                $formattedDate = date('M j', strtotime($entry['date']));
                $formattedText .= "• [{$formattedDate}] {$entry['value']}\n";
            }
            $formattedText .= "\n";
        }

        return trim($formattedText);
    }
}
