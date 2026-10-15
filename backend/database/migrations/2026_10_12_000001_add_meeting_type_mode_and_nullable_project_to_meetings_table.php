<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        Schema::table('meetings', function (Blueprint $table) {
            $table->string('meeting_type', 50)->nullable()->after('title');
            $table->string('mode', 20)->nullable()->after('location');
        });

        // doctrine/dbal is not installed, so Blueprint::nullable() cannot alter an
        // existing column — change it directly, same approach used earlier for
        // student_reports.task_id. Drop the FK first (required before modifying
        // the column it's defined on), then recreate it with nullOnDelete so a
        // deleted project doesn't cascade-delete meetings that no longer require one.
        DB::statement('ALTER TABLE meetings DROP FOREIGN KEY meetings_project_id_foreign');
        DB::statement('ALTER TABLE meetings MODIFY project_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE meetings ADD CONSTRAINT meetings_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL');
    }

    public function down()
    {
        DB::statement('ALTER TABLE meetings DROP FOREIGN KEY meetings_project_id_foreign');
        DB::statement('ALTER TABLE meetings MODIFY project_id BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE meetings ADD CONSTRAINT meetings_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE');

        Schema::table('meetings', function (Blueprint $table) {
            $table->dropColumn(['meeting_type', 'mode']);
        });
    }
};
