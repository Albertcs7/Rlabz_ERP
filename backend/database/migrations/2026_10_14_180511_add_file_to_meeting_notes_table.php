
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('meeting_notes', 'file')) {
            Schema::table('meeting_notes', function (Blueprint $table) {
                $table->string('file')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('meeting_notes', 'file')) {
            Schema::table('meeting_notes', function (Blueprint $table) {
                $table->dropColumn('file');
            });
        }
    }
};
