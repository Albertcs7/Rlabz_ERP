<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('meeting_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained('meetings')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('attendance_status', ['invited', 'attended', 'absent']);
            $table->timestamps();

            $table->index(['meeting_id', 'user_id'], 'idx_meetpart_meeting_user');
            $table->index(['user_id', 'attendance_status'], 'idx_meetpart_user_attendance');
        });
    }

    public function down()
    {
        Schema::dropIfExists('meeting_participants');
    }
};
