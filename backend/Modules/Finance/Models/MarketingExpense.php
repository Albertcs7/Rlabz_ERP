<?php

namespace Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class MarketingExpense extends Model
{
    protected $fillable = [
        'project_finance_id',
        'title',
        'category',
        'amount',
        'expense_date',
        'vendor',
        'recorded_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
    ];

    public function projectFinance()
    {
        return $this->belongsTo(ProjectFinance::class);
    }

    public function recordedByUser()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
