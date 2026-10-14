<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add design_head to users role ENUM
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('director', 'coordinator', 'finance', 'faculty', 'student', 'developer', 'design_head') NOT NULL");

        // 2. Add profile fields if not already present
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'bio')) {
                $table->text('bio')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('users', 'location')) {
                $table->string('location', 150)->nullable()->default('Kochi, India')->after('bio');
            }
            if (!Schema::hasColumn('users', 'avatar')) {
                $table->string('avatar', 500)->nullable()->after('location');
            }
            if (!Schema::hasColumn('users', 'department')) {
                $table->string('department', 150)->nullable()->after('avatar');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'department')) {
                $table->dropColumn('department');
            }
            if (Schema::hasColumn('users', 'avatar')) {
                $table->dropColumn('avatar');
            }
            if (Schema::hasColumn('users', 'location')) {
                $table->dropColumn('location');
            }
            if (Schema::hasColumn('users', 'bio')) {
                $table->dropColumn('bio');
            }
        });

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('director', 'coordinator', 'finance', 'faculty', 'student', 'developer') NOT NULL");
    }
};
