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
        Schema::table('project_finances', function (Blueprint $table) {
            if (!Schema::hasColumn('project_finances', 'marketing_budget')) {
                $table->decimal('marketing_budget', 12, 2)->default(0.00)->nullable()->after('total_development_amount');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('project_finances', function (Blueprint $table) {
            if (Schema::hasColumn('project_finances', 'marketing_budget')) {
                $table->dropColumn('marketing_budget');
            }
        });
    }
};
