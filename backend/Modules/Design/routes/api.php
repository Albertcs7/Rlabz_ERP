<?php

use Illuminate\Support\Facades\Route;
use Modules\Design\Controllers\DesignController;
use Modules\Auth\Middleware\JwtMiddleware;

Route::group(['prefix' => 'design', 'middleware' => [JwtMiddleware::class]], function () {
    Route::get('/dashboard', [DesignController::class, 'getDashboard']);
    Route::get('/projects', [DesignController::class, 'getProjects']);
    Route::get('/assets', [DesignController::class, 'getAssets']);
    Route::post('/assets', [DesignController::class, 'createAsset']);
});
