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
        Schema::table('hosting_charges', function (Blueprint $table) {
            $table->string('domain_name')->nullable()->after('expiry_date');
            $table->index('domain_name', 'idx_hostchg_domain_name');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('hosting_charges', function (Blueprint $table) {
            $table->dropIndex('idx_hostchg_domain_name');
            $table->dropColumn('domain_name');
        });
    }
};
