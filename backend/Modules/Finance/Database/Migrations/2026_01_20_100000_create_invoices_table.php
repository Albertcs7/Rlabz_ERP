<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_finance_id')->constrained('project_finances')->onDelete('cascade');
            $table->string('invoice_number')->unique();
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->decimal('amount_before_gst', 12, 2);
            $table->decimal('gst_percentage', 5, 2)->default(18.00);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['project_finance_id', 'invoice_date'], 'idx_invoices_projfin_date');
            $table->index('invoice_date', 'idx_invoices_invoice_date');
            $table->index('due_date', 'idx_invoices_due_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('invoices');
    }
};
