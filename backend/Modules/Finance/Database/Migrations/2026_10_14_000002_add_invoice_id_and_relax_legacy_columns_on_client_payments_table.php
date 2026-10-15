<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Aligns client_payments with the current invoice-based payment code.
 *
 * 2026_01_22_000000_create_client_payments_table was edited in place after it
 * had already run (project_finance_id/payment_type/status replaced by
 * invoice_id), so databases migrated before that edit never received
 * invoice_id. The code (Invoice::clientPayments(), ClientPayment) needs it.
 *
 * Additive only:
 *  - adds a nullable invoice_id -> invoices.id (ON DELETE CASCADE, the same
 *    rule the edited create migration gives fresh installs);
 *  - makes the legacy project_finance_id / payment_type / status columns
 *    nullable, because the current code inserts payments without them.
 * No column is dropped and no row is changed: existing payments keep their
 * values and get invoice_id = NULL (they are not linked to any invoice).
 *
 * Every step is guarded, so on a fresh install (where the create migration
 * already produced invoice_id and none of the legacy columns) this is a no-op.
 */
return new class extends Migration
{
    private const TABLE = 'client_payments';
    private const PF_FOREIGN_KEY = 'client_payments_project_finance_id_foreign';

    public function up()
    {
        if (!Schema::hasColumn(self::TABLE, 'invoice_id')) {
            Schema::table(self::TABLE, function (Blueprint $table) {
                $table->foreignId('invoice_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('invoices')
                    ->cascadeOnDelete();
            });
        }

        // doctrine/dbal is not installed, so existing columns are altered with
        // raw statements (same approach as the meetings migration). MySQL/MariaDB only.
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        if (Schema::hasColumn(self::TABLE, 'project_finance_id')) {
            $this->setProjectFinanceIdNullable(true);
        }
        if (Schema::hasColumn(self::TABLE, 'payment_type')) {
            DB::statement("ALTER TABLE client_payments MODIFY payment_type ENUM('advance','partial','full') NULL");
        }
        if (Schema::hasColumn(self::TABLE, 'status')) {
            DB::statement("ALTER TABLE client_payments MODIFY status ENUM('pending','received','failed') NULL");
        }
    }

    /**
     * Restores the pre-migration schema ONLY when that cannot lose data.
     * It refuses (throws, changing nothing) if any payment is linked to an
     * invoice — dropping invoice_id would delete those links — or has a NULL
     * project_finance_id / payment_type / status, which the NOT NULL columns
     * could not hold. In that case restore from a database backup instead.
     */
    public function down()
    {
        if (DB::getDriverName() !== 'mysql' || !Schema::hasColumn(self::TABLE, 'project_finance_id')) {
            // Fresh-install schema: up() changed nothing here.
            return;
        }

        $blocking = DB::table(self::TABLE)
            ->where(function ($q) {
                $q->whereNotNull('invoice_id')
                    ->orWhereNull('project_finance_id')
                    ->orWhereNull('payment_type')
                    ->orWhereNull('status');
            })
            ->count();

        if ($blocking > 0) {
            throw new RuntimeException(
                "Cannot roll back: {$blocking} client_payments row(s) are linked to an invoice or have no "
                . 'project_finance_id/payment_type/status. Rolling back would lose that data; restore from a backup instead.'
            );
        }

        DB::statement("ALTER TABLE client_payments MODIFY status ENUM('pending','received','failed') NOT NULL");
        DB::statement("ALTER TABLE client_payments MODIFY payment_type ENUM('advance','partial','full') NOT NULL");
        $this->setProjectFinanceIdNullable(false);

        if (Schema::hasColumn(self::TABLE, 'invoice_id')) {
            Schema::table(self::TABLE, function (Blueprint $table) {
                $table->dropForeign(['invoice_id']);
                $table->dropColumn('invoice_id');
            });
        }
    }

    /**
     * The foreign key has to be dropped before its column can be modified, then
     * it is recreated with the original ON DELETE CASCADE rule.
     */
    private function setProjectFinanceIdNullable(bool $nullable): void
    {
        if ($this->foreignKeyExists(self::PF_FOREIGN_KEY)) {
            DB::statement('ALTER TABLE client_payments DROP FOREIGN KEY ' . self::PF_FOREIGN_KEY);
        }

        DB::statement('ALTER TABLE client_payments MODIFY project_finance_id BIGINT UNSIGNED ' . ($nullable ? 'NULL' : 'NOT NULL'));

        DB::statement('ALTER TABLE client_payments ADD CONSTRAINT ' . self::PF_FOREIGN_KEY
            . ' FOREIGN KEY (project_finance_id) REFERENCES project_finances(id) ON DELETE CASCADE');
    }

    private function foreignKeyExists(string $name): bool
    {
        return DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', DB::raw('DATABASE()'))
            ->where('TABLE_NAME', self::TABLE)
            ->where('CONSTRAINT_NAME', $name)
            ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
            ->exists();
    }
};
