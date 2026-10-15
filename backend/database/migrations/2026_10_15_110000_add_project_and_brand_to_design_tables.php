<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('design_tickets')) {
            Schema::table('design_tickets', function (Blueprint $table) {
                if (!Schema::hasColumn('design_tickets', 'project_id')) {
                    $table->unsignedBigInteger('project_id')->nullable()->after('work_type');
                    $table->foreign('project_id')->references('id')->on('projects')->onDelete('set null');
                }
                if (!Schema::hasColumn('design_tickets', 'brand_kit_name')) {
                    $table->string('brand_kit_name', 150)->nullable()->default('RLabZ Core Platform')->after('brand_constraints');
                }
            });
        }

        if (Schema::hasTable('design_assets')) {
            Schema::table('design_assets', function (Blueprint $table) {
                if (!Schema::hasColumn('design_assets', 'project_id')) {
                    $table->unsignedBigInteger('project_id')->nullable()->after('title');
                    $table->foreign('project_id')->references('id')->on('projects')->onDelete('set null');
                }
                if (!Schema::hasColumn('design_assets', 'brand_kit_name')) {
                    $table->string('brand_kit_name', 150)->nullable()->default('RLabZ Core Platform')->after('campaign');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('design_tickets')) {
            Schema::table('design_tickets', function (Blueprint $table) {
                if (Schema::hasColumn('design_tickets', 'project_id')) {
                    $table->dropForeign(['project_id']);
                    $table->dropColumn('project_id');
                }
                if (Schema::hasColumn('design_tickets', 'brand_kit_name')) {
                    $table->dropColumn('brand_kit_name');
                }
            });
        }

        if (Schema::hasTable('design_assets')) {
            Schema::table('design_assets', function (Blueprint $table) {
                if (Schema::hasColumn('design_assets', 'project_id')) {
                    $table->dropForeign(['project_id']);
                    $table->dropColumn('project_id');
                }
                if (Schema::hasColumn('design_assets', 'brand_kit_name')) {
                    $table->dropColumn('brand_kit_name');
                }
            });
        }
    }
};
