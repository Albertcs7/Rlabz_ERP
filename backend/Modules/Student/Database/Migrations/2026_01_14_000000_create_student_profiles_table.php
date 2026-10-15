<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->unique()->constrained('users')->onDelete('cascade');
            $table->string('course', 100);
            $table->string('batch', 50);
            $table->tinyInteger('semester');
            $table->enum('designation', ['nova', 'orbit', 'spark'])->nullable();
            $table->timestamps();

            $table->index('course', 'idx_studprof_course');
            $table->index('batch', 'idx_studprof_batch');
            $table->index('semester', 'idx_studprof_semester');
            $table->index('designation', 'idx_studprof_designation');
        });
    }

    public function down()
    {
        Schema::dropIfExists('student_profiles');
    }
};
