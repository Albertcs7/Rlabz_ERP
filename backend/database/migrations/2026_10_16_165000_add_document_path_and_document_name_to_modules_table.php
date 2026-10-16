<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('modules', function (Blueprint $table) {
            if (!Schema::hasColumn('modules', 'document_name')) {
                $table->string('document_name', 255)->nullable()->after('description');
            }
            if (!Schema::hasColumn('modules', 'document_path')) {
                $table->string('document_path', 500)->nullable()->after('document_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('modules', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('modules', 'document_path')) {
                $columnsToDrop[] = 'document_path';
            }
            if (Schema::hasColumn('modules', 'document_name')) {
                $columnsToDrop[] = 'document_name';
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
