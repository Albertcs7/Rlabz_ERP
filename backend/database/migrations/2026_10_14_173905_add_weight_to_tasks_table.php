<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
public function up()
{
    if (!Schema::hasColumn('tasks', 'weight')) {
        Schema::table('tasks', function (Blueprint $table) {
            $table->integer('weight')->default(1)->after('description');
        });
    }
}

public function down()
{
    Schema::table('tasks', function (Blueprint $table) {
        $table->dropColumn('weight');
    });
}
};
