<?php

use Illuminate\Support\Facades\Route;
use Modules\Design\Controllers\DesignController;
use Modules\Auth\Middleware\JwtMiddleware;

Route::group(['prefix' => 'design', 'middleware' => [JwtMiddleware::class]], function () {
    // 1. Dashboard & Role-based metrics
    Route::get('/dashboard', [DesignController::class, 'getDashboard']);
    Route::get('/reports', [DesignController::class, 'getReports']);

    // 2. Users, Roles & Capacity
    Route::get('/users', [DesignController::class, 'getDesignUsers']);
    Route::put('/users/{id}/profile', [DesignController::class, 'updateUserProfile']);
    Route::get('/team-capacity', [DesignController::class, 'getTeamCapacity']);

    // 3. Request Intake & Ticket Lifecycle
    Route::get('/tickets', [DesignController::class, 'getTickets']);
    Route::post('/tickets', [DesignController::class, 'createTicket']);
    Route::get('/tickets/{id}', [DesignController::class, 'getTicketDetail']);
    Route::patch('/tickets/{id}/status', [DesignController::class, 'updateTicketStatus']);
    
    // 4. Assignment & Scheduling
    Route::post('/tickets/{id}/assign', [DesignController::class, 'assignTicket']);
    Route::get('/schedule/calendar', [DesignController::class, 'getFortnightCalendar']);

    // 5. Version Control & Feedback
    Route::post('/tickets/{id}/versions', [DesignController::class, 'uploadVersion']);
    Route::post('/tickets/{id}/comments', [DesignController::class, 'addComment']);
    Route::patch('/comments/{id}/resolve', [DesignController::class, 'resolveComment']);

    // 6. Approval & Sign-off
    Route::post('/tickets/{id}/approve', [DesignController::class, 'approveDeliverable']);
    Route::post('/tickets/{id}/reject', [DesignController::class, 'rejectDeliverable']);

    // 7. Asset Library
    Route::get('/assets', [DesignController::class, 'getAssets']);
    Route::post('/assets/{id}/clone', [DesignController::class, 'cloneAssetToRequest']);

    // 8. Brand Kit & Guidelines
    Route::get('/brand-kit', [DesignController::class, 'getBrandKit']);
    Route::post('/brand-kits', [DesignController::class, 'createBrandKit']);
    Route::put('/brand-kits/{id}', [DesignController::class, 'updateBrandKit']);
    Route::patch('/brand-kits/{id}/status', [DesignController::class, 'toggleBrandKitStatus']);

    // 9. Notifications
    Route::get('/notifications', [DesignController::class, 'getNotifications']);
    Route::patch('/notifications/{id}/read', [DesignController::class, 'markNotificationRead']);

    // 10. Audit Log
    Route::get('/audit-logs', [DesignController::class, 'getAuditLogs']);
});
