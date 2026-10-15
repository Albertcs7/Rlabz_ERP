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
        // 1. Add 'admin' to users role ENUM
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('director', 'coordinator', 'finance', 'faculty', 'student', 'developer', 'design_head', 'admin') NOT NULL");

        // 2. Add 'status' column if it doesn't already exist
        if (!Schema::hasColumn('users', 'status')) {
            Schema::table('users', function (Blueprint $table) {
                $table->enum('status', ['active', 'suspended'])->default('active')->after('role');
                $table->index('status', 'idx_users_status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'status')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex('idx_users_status');
                $table->dropColumn('status');
            });
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('director', 'coordinator', 'finance', 'faculty', 'student', 'developer', 'design_head') NOT NULL");
    }
};
