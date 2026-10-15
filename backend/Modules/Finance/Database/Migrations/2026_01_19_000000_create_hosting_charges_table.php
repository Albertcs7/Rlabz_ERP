<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('hosting_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_finance_id')->constrained('project_finances')->onDelete('cascade');
            $table->enum('charge_type', ['ssl', 'domain', 'api', 'hosting']);
            $table->decimal('amount', 12, 2);
            $table->date('purchase_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->text('reference_details')->nullable();
            $table->timestamps();

            $table->index(['charge_type', 'expiry_date'], 'idx_hostchg_type_expiry');
            $table->index('expiry_date', 'idx_hostchg_expiry_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('hosting_charges');
    }
};
