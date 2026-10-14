<?php

namespace Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;
use Modules\Project\Models\Project;

class ProjectFinance extends Model
{
    protected $fillable = [
        'project_id',
        'total_development_amount',
        'marketing_budget',
        'overhead_budget',
        'created_by',
        'approved_by',
        'approved_at',
        'status',
    ];

    protected $casts = [
        'marketing_budget' => 'decimal:2',
        'overhead_budget' => 'decimal:2',
        'total_development_amount' => 'decimal:2',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function developmentAllocations()
    {
        return $this->hasMany(DevelopmentAllocation::class);
    }

    public function hostingCharges()
    {
        return $this->hasMany(HostingCharge::class);
    }

    public function maintenanceSupportCharges()
    {
        return $this->hasMany(MaintenanceSupportCharge::class);
    }

    public function marketingExpenses()
    {
        return $this->hasMany(MarketingExpense::class);
    }

    public function getTotalInvoicedAttribute()
    {
        return $this->invoices->sum('grand_total');
    }

    public function getTotalCollectedAttribute()
    {
        return $this->invoices->sum('total_paid');
    }

    public function getPendingAmountAttribute()
    {
        return max(0, $this->total_invoiced - $this->total_collected);
    }

    public function getConsumedOverheadAttribute()
    {
        $hosting = $this->hostingCharges ? $this->hostingCharges->sum('amount') : 0;
        $maintenance = $this->maintenanceSupportCharges ? $this->maintenanceSupportCharges->sum('amount') : 0;

        $sslRenewals = \DB::table('ssl_renewal_history')
            ->join('hosting_charges', 'ssl_renewal_history.hosting_charge_id', '=', 'hosting_charges.id')
            ->where('hosting_charges.project_finance_id', $this->id)
            ->sum('ssl_renewal_history.renewal_amount');

        return (float) ($hosting + $maintenance + $sslRenewals);
    }

    public function getRemainingOverheadAttribute()
    {
        $budget = (float) ($this->overhead_budget ?? 0);
        return max(0, $budget - $this->consumed_overhead);
    }

    public function getTotalExpensesAttribute()
    {
        $student = \DB::table('student_payments')
            ->join('project_student', 'student_payments.project_student_id', '=', 'project_student.id')
            ->where('project_student.project_id', $this->project_id)
            ->sum('student_payments.amount');

        $faculty = \DB::table('faculty_payments')
            ->join('project_faculty', 'faculty_payments.project_faculty_id', '=', 'project_faculty.id')
            ->where('project_faculty.project_id', $this->project_id)
            ->sum('faculty_payments.amount');

        $marketing = $this->marketingExpenses ? $this->marketingExpenses->sum('amount') : 0;

        return $this->consumed_overhead + $student + $faculty + $marketing;
    }
}
