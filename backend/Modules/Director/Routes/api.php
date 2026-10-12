<?php

use Illuminate\Support\Facades\Route;
use Modules\Director\Controllers\DirectorController;
use Modules\Auth\Middleware\JwtMiddleware;

Route::group(['prefix' => 'director', 'middleware' => [JwtMiddleware::class]], function () {
    Route::get('/overview', [DirectorController::class, 'getOverview']);
    Route::get('/projects', [DirectorController::class, 'getProjects']);
    Route::get('/proposals', [DirectorController::class, 'getProposals']);
    Route::get('/finance', [DirectorController::class, 'getFinanceSummary']);
    Route::get('/audit-logs', [DirectorController::class, 'getAuditLogs']);
    Route::get('/faculties', [DirectorController::class, 'getFaculties']);
    Route::get('/client-requirements', [DirectorController::class, 'getClientRequirements']);
    Route::get('/students', [DirectorController::class, 'getStudents']);
    Route::get('/students/{id}', [DirectorController::class, 'getStudentDetail']);
});
