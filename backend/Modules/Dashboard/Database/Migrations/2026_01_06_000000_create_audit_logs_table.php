<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('action', 100);
            $table->text('description')->nullable();
            $table->timestamp('created_at');

            $table->index('created_at', 'idx_audit_logs_created_at');
            $table->index('action', 'idx_audit_logs_action');
        });
    }

    public function down()
    {
        Schema::dropIfExists('audit_logs');
    }
};
