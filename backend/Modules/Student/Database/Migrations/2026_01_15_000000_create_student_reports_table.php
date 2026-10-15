<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('student_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->enum('report_type', ['daily', 'weekly']);
            $table->date('report_date');
            $table->text('work_done');
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('feedback')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->index(['student_id', 'report_date'], 'idx_studrep_student_date');
            $table->index(['student_id', 'approval_status'], 'idx_studrep_student_approval');
            $table->index('approval_status', 'idx_studrep_approval_status');
            $table->index('report_type', 'idx_studrep_report_type');
        });
    }

    public function down()
    {
        Schema::dropIfExists('student_reports');
    }
};
