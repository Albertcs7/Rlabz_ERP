<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('faculty_profiles', 'photo')) {
            Schema::table('faculty_profiles', function (Blueprint $table) {
                $table->string('photo')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('faculty_profiles', 'photo')) {
            Schema::table('faculty_profiles', function (Blueprint $table) {
                $table->dropColumn('photo');
            });
        }
    }
};