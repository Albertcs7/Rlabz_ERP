<?php

use Illuminate\Support\Facades\Route;
use Modules\Admin\Controllers\AdminUserController;
use Modules\Auth\Middleware\JwtMiddleware;

/*
|--------------------------------------------------------------------------
| Admin Module API Routes
|--------------------------------------------------------------------------
|
| Secured by JwtMiddleware with backend role and permission verification
| in the controller.
|
*/

Route::group(['prefix' => 'admin', 'middleware' => [JwtMiddleware::class]], function () {
    Route::get('/overview', [AdminUserController::class, 'overview']);
    Route::get('/permissions-catalog', [AdminUserController::class, 'permissionsCatalog']);
    Route::get('/users', [AdminUserController::class, 'index']);
    Route::get('/users/{id}', [AdminUserController::class, 'show']);
    Route::post('/users', [AdminUserController::class, 'store']);
    Route::put('/users/{id}', [AdminUserController::class, 'update']);
    Route::put('/users/{id}/permissions', [AdminUserController::class, 'updatePermissions']);
    Route::post('/users/{id}/reset-password', [AdminUserController::class, 'resetPassword']);
    Route::put('/users/{id}/status', [AdminUserController::class, 'updateStatus']);
    Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);
    Route::get('/audit-logs', [AdminUserController::class, 'auditLogs']);
});
