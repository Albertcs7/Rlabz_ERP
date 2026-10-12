<?php

use Illuminate\Support\Facades\Route;
use Modules\Coordinator\Http\Controllers\CoordinatorController;

Route::group(['prefix' => 'coordinator', 'middleware' => ['auth.jwt']], function () {
    Route::get('/projects', [CoordinatorController::class, 'index']);
    Route::post('/projects', [CoordinatorController::class, 'store']);
    Route::get('/projects/{project}', [CoordinatorController::class, 'show']);

    Route::get('/students/eligible', [CoordinatorController::class, 'eligibleStudents']);
    Route::post('/projects/{project}/students', [CoordinatorController::class, 'assignStudent']);
    Route::delete('/projects/{project}/students/{studentId}', [CoordinatorController::class, 'removeStudent']);

    // Module/task creation, editing, and student-to-module assignment are a Faculty
    // responsibility (see Modules\Faculty\Http\Controllers\FacultyController) — the
    // Coordinator module intentionally has no write endpoints for modules or tasks.
    // Read-only module/task data remains available via GET /projects/{project}
    // (project.modules.tasks, eager-loaded in show()).

    // Faculty assignment is a Director responsibility (see Modules\Dashboard) — the
    // Coordinator module intentionally has no faculty assignment/removal endpoint.
    // Read-only faculty listing (GET /faculty) remains, for display purposes only.

    Route::get('/projects/{project}/requirements', [CoordinatorController::class, 'requirements']);
    Route::post('/projects/{project}/requirements', [CoordinatorController::class, 'storeRequirement']);

    Route::get('/projects/{project}/requirement-changes', [CoordinatorController::class, 'requirementChanges']);
    Route::post('/projects/{project}/requirement-changes', [CoordinatorController::class, 'storeRequirementChange']);

    Route::get('/students', [CoordinatorController::class, 'students']);
    Route::post('/students', [CoordinatorController::class, 'storeStudent']);

    Route::get('/faculty', [CoordinatorController::class, 'faculty']);

    Route::get('/meetings', [CoordinatorController::class, 'meetings']);
    Route::post('/meetings', [CoordinatorController::class, 'storeMeeting']);
    Route::post('/meetings/{id}/status', [CoordinatorController::class, 'updateMeetingStatus']);

    Route::post('/projects/{project}/close', [CoordinatorController::class, 'close']);

    Route::get('/reports', [CoordinatorController::class, 'reports']);
    Route::post('/reports/{id}/review', [CoordinatorController::class, 'reviewReport']);
    Route::get('/reports/{id}/download', [CoordinatorController::class, 'downloadReportFile']);
    Route::post('/reports/weekly/generate', [CoordinatorController::class, 'generateWeeklyReport']);
    Route::get('/notifications', [CoordinatorController::class, 'getNotifications']);
    Route::post('/notifications/{id}/read', [CoordinatorController::class, 'markNotificationRead']);
    Route::post('/notifications/mark-all-read', [CoordinatorController::class, 'markAllNotificationsRead']);
});

