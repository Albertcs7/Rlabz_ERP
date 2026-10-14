<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

/**
 * Regression test for the client_payments.invoice_id schema mismatch
 * (Finance pages returned HTTP 500 "Unknown column client_payments.invoice_id").
 * Runs once 2026_10_14_000002_add_invoice_id_and_relax_legacy_columns_on_client_payments_table
 * has been applied; skipped before that.
 */
class FinanceClientPaymentsSchemaTest extends TestCase
{
    private array $userIds = [];
    private array $paymentIds = [];
    private array $auth = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (!Schema::hasColumn('client_payments', 'invoice_id')) {
            $this->markTestSkipped('client_payments.invoice_id migration has not been run on this database.');
        }

        $email = 'financetest_' . uniqid() . '@rajagiri.edu';
        $this->userIds[] = DB::table('users')->insertGetId([
            'name' => 'Finance Schema Test',
            'email' => $email,
            'password' => Hash::make('finpass123'),
            'role' => 'finance',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'finpass123'])
            ->assertStatus(200)->json('access_token');
        $this->auth = ['Authorization' => 'Bearer ' . $token];
    }

    protected function tearDown(): void
    {
        if ($this->paymentIds) {
            DB::table('client_payments')->whereIn('id', $this->paymentIds)->delete();
        }
        if ($this->userIds) {
            DB::table('users')->whereIn('id', $this->userIds)->delete();
        }
        parent::tearDown();
    }

    public function test_finance_dashboard_endpoints_load(): void
    {
        foreach (['/api/finance/dashboard', '/api/finance/projects', '/api/finance/invoices', '/api/finance/transactions'] as $endpoint) {
            $this->withHeaders($this->auth)->getJson($endpoint)->assertStatus(200);
        }
    }

    public function test_legacy_columns_accept_null_so_current_code_can_insert(): void
    {
        $columns = collect(DB::select('SHOW COLUMNS FROM client_payments'))->keyBy('Field');

        $this->assertSame('YES', $columns['invoice_id']->Null);
        foreach (['project_finance_id', 'payment_type', 'status'] as $legacy) {
            if ($columns->has($legacy)) {
                $this->assertSame('YES', $columns[$legacy]->Null, "{$legacy} should be nullable");
            }
        }
    }

    public function test_client_payment_can_be_recorded_against_an_invoice(): void
    {
        $invoice = \Modules\Finance\Models\Invoice::with(['clientPayments', 'projectFinance.project'])->first();
        $projectStatus = $invoice?->projectFinance?->project?->status;
        if (!$invoice || $invoice->pending_amount < 1 || in_array($projectStatus, ['closed', 'completed', 'cancelled'], true)) {
            $this->markTestSkipped('No open invoice with a pending balance to record a test payment against.');
        }

        $response = $this->withHeaders($this->auth)->postJson('/api/finance/client-payments', [
            'invoice_id' => $invoice->id,
            'amount' => 1,
            'payment_date' => now()->toDateString(),
            'remarks' => 'Automated schema test payment',
        ])->assertStatus(200);

        $paymentId = $response->json('payment.id');
        $this->paymentIds[] = $paymentId;

        $saved = DB::table('client_payments')->where('id', $paymentId)->first();
        $this->assertSame($invoice->id, (int) $saved->invoice_id);
        $this->assertSame('1.00', (string) $saved->amount);
        $this->assertSame(now()->toDateString(), (string) $saved->payment_date);
        $this->assertSame('Automated schema test payment', $saved->remarks);
        $this->assertSame($this->userIds[0], (int) $saved->recorded_by);

        // The payment now counts towards that invoice's paid total.
        $paidBefore = $invoice->clientPayments->sum('amount');
        $paidAfter = \Modules\Finance\Models\Invoice::with('clientPayments')->find($invoice->id)->clientPayments->sum('amount');
        $this->assertEquals($paidBefore + 1, $paidAfter);
    }
}
