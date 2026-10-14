<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additive only: a nullable column holding the path of the user's own
     * profile photo on the "public" storage disk (e.g. profile_photos/abc.jpg),
     * never an absolute filesystem path. Existing rows get NULL, which the UI
     * shows as the default initials avatar.
     */
    public function up()
    {
        if (!Schema::hasColumn('users', 'profile_photo_path')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('profile_photo_path', 255)->nullable()->after('phone');
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('users', 'profile_photo_path')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('profile_photo_path');
            });
        }
    }
};
