<?php

use Illuminate\Support\Facades\Route;
use Modules\Developer\Controllers\DeveloperController;
use Modules\Auth\Middleware\JwtMiddleware;

Route::group(['prefix' => 'developer', 'middleware' => [JwtMiddleware::class]], function () {
    Route::get('/overview', [DeveloperController::class, 'getOverview']);
    Route::get('/projects', [DeveloperController::class, 'getProjects']);
    Route::get('/proposals', [DeveloperController::class, 'getProposals']);
    Route::get('/finance', [DeveloperController::class, 'getFinanceSummary']);
    Route::get('/audit-logs', [DeveloperController::class, 'getAuditLogs']);
    Route::get('/faculties', [DeveloperController::class, 'getFaculties']);
    Route::get('/client-requirements', [DeveloperController::class, 'getClientRequirements']);
    Route::get('/students', [DeveloperController::class, 'getStudents']);
    Route::get('/students/{id}', [DeveloperController::class, 'getStudentDetail']);
    Route::post('/proposals/{proposalId}/status', [DeveloperController::class, 'updateProposalStatus']);
    Route::post('/projects/{projectId}/start', [DeveloperController::class, 'startProject']);
    Route::post('/projects/{projectId}/assign-faculty', [DeveloperController::class, 'assignFaculty']);
});
