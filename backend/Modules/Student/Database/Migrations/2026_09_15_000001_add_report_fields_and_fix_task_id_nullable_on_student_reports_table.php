<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('student_reports', 'tasks_completed')) {
                if (Schema::hasColumn('student_reports', 'work_done')) {
                    $table->text('tasks_completed')->nullable()->after('work_done');
                } else {
                    $table->text('tasks_completed')->nullable();
                }
            }
            if (!Schema::hasColumn('student_reports', 'hours_worked')) {
                $table->decimal('hours_worked', 5, 2)->nullable();
            }
            if (!Schema::hasColumn('student_reports', 'remarks')) {
                if (Schema::hasColumn('student_reports', 'challenges')) {
                    $table->text('remarks')->nullable()->after('challenges');
                } else {
                    $table->text('remarks')->nullable();
                }
            }
        });

        // Live schema has task_id as NOT NULL, but weekly rows (report_type='weekly')
        // aggregate multiple tasks and have no single task_id. doctrine/dbal isn't
        // installed (same reason the certificates description-widening migration used
        // raw SQL instead of ->change()). Only relaxes NOT NULL -> NULL; type, FK, and
        // existing data are untouched. Guarded so it's a no-op if already applied.
        if (Schema::hasColumn('student_reports', 'task_id')) {
            $column = DB::selectOne("SHOW COLUMNS FROM student_reports WHERE Field = 'task_id'");
            if ($column && strtoupper($column->Null) === 'NO') {
                DB::statement('ALTER TABLE student_reports MODIFY task_id BIGINT UNSIGNED NULL');
            }
        }
    }

    public function down(): void
    {
        Schema::table('student_reports', function (Blueprint $table) {
            if (Schema::hasColumn('student_reports', 'remarks')) {
                $table->dropColumn('remarks');
            }
            if (Schema::hasColumn('student_reports', 'hours_worked')) {
                $table->dropColumn('hours_worked');
            }
            if (Schema::hasColumn('student_reports', 'tasks_completed')) {
                $table->dropColumn('tasks_completed');
            }
        });

        // Restoring NOT NULL is only safe if no row currently has task_id = NULL.
        // Weekly reports generated after this migration ran legitimately have
        // task_id = NULL; forcing NOT NULL back would fail or corrupt those rows.
        $nullCount = DB::table('student_reports')->whereNull('task_id')->count();
        if ($nullCount > 0) {
            throw new \RuntimeException(
                "Cannot reverse task_id NOT NULL constraint: {$nullCount} row(s) have " .
                "task_id = NULL (weekly reports created after this migration ran). " .
                "Resolve those rows before rolling back."
            );
        }
        DB::statement('ALTER TABLE student_reports MODIFY task_id BIGINT UNSIGNED NOT NULL');
    }
};
