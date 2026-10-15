<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained('modules')->onDelete('cascade');
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->foreignId('assigned_to')->constrained('users');
            $table->enum('status', ['todo', 'in_progress', 'completed', 'blocked']);
            $table->date('due_date')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->enum('review_status', ['pending', 'approved', 'rejected'])->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['module_id', 'status'], 'idx_tasks_module_status');
            $table->index(['assigned_to', 'status'], 'idx_tasks_assigned_status');
            $table->index('status', 'idx_tasks_status');
            $table->index(['status', 'due_date'], 'idx_tasks_status_due_date');
            $table->index('due_date', 'idx_tasks_due_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('tasks');
    }
};
