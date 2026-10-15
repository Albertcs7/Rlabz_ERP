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
        if (!Schema::hasTable('marketing_expenses')) {
            Schema::create('marketing_expenses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_finance_id')->constrained('project_finances')->onDelete('cascade');
                $table->string('title');
                $table->string('category')->default('other');
                $table->decimal('amount', 12, 2);
                $table->date('expense_date');
                $table->string('vendor')->nullable();
                $table->foreignId('recorded_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamps();

                $table->index(['project_finance_id', 'expense_date'], 'idx_mktexp_projfin_date');
                $table->index('expense_date', 'idx_mktexp_expense_date');
                $table->index('category', 'idx_mktexp_category');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('marketing_expenses');
    }
};
