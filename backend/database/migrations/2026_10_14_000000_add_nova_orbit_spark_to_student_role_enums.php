<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const LEGACY = ['project_lead', 'developer', 'designer', 'tester', 'other'];
    private const ADDED = ['nova', 'orbit', 'spark'];

    /**
     * Additive only: widens the project_student.role and student_roles.role ENUMs
     * so the coordinator's Assign Student flow can save Nova/Orbit/Spark. Every
     * existing value is kept, so no existing row is changed. doctrine/dbal is not
     * installed, so the column is altered directly (same approach as the
     * meetings migration).
     */
    public function up()
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        $values = $this->enumList(array_merge(self::LEGACY, self::ADDED));
        DB::statement("ALTER TABLE project_student MODIFY role ENUM({$values}) NOT NULL");
        DB::statement("ALTER TABLE student_roles MODIFY role ENUM({$values}) NOT NULL");
    }

    /**
     * Narrowing the ENUM back would make MySQL fail on (or blank out) rows that
     * already use the new values, so refuse instead of losing data.
     */
    public function down()
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        foreach (['project_student', 'student_roles'] as $table) {
            if (DB::table($table)->whereIn('role', self::ADDED)->exists()) {
                throw new RuntimeException("Cannot roll back: {$table} has rows with role nova/orbit/spark.");
            }
        }

        $values = $this->enumList(self::LEGACY);
        DB::statement("ALTER TABLE project_student MODIFY role ENUM({$values}) NOT NULL");
        DB::statement("ALTER TABLE student_roles MODIFY role ENUM({$values}) NOT NULL");
    }

    private function enumList(array $values): string
    {
        return implode(',', array_map(fn ($v) => "'{$v}'", $values));
    }
};
