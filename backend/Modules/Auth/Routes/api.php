<?php

use Illuminate\Support\Facades\Route;
use Modules\Auth\Controllers\AuthController;
use Modules\Auth\Controllers\ProfilePhotoController;

/*
|--------------------------------------------------------------------------
| API Routes for Auth Module
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your module. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group.
|
*/

use Modules\Auth\Middleware\JwtMiddleware;

Route::group(['prefix' => 'auth'], function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    
    // Protected routes
    Route::group(['middleware' => [JwtMiddleware::class]], function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('users', [AuthController::class, 'searchUsers']);

        // The logged-in user's own profile photo (any role).
        Route::get('profile-photo', [ProfilePhotoController::class, 'show']);
        Route::post('profile-photo', [ProfilePhotoController::class, 'store']);
        Route::delete('profile-photo', [ProfilePhotoController::class, 'destroy']);
        
        // Example of a route protected by both JWT and our custom Permission middleware
        Route::get('me', function () {
            // MOCK: In reality this would return auth()->user();
            return response()->json(['message' => 'This is a protected route. User is authenticated.']);
        })->middleware('permission:view-dashboard');
    });
});
