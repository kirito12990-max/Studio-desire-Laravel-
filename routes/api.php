<?php

use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\EnquiryController as AdminEnquiryController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Authentication & Security Handshake
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::get('/csrf-token', [AuthController::class, 'csrfToken']);
    Route::post('/login', [AuthController::class, 'login']);
});

/*
|--------------------------------------------------------------------------
| Authenticated Session & API Endpoints
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/update-profile', [AuthController::class, 'updateProfile']);
    });

    /*
    |--------------------------------------------------------------------------
    | Owner Panel Protected Endpoints (Requires OWNER or ADMIN Role)
    |--------------------------------------------------------------------------
    */
    Route::prefix('admin')->middleware('owner')->group(function () {
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);

        // Enquiries and confidential proposal attachments
        Route::get('/enquiries', [AdminEnquiryController::class, 'index']);
        Route::get('/enquiries/{id}', [AdminEnquiryController::class, 'show']);
        Route::patch('/enquiries/{id}/status', [AdminEnquiryController::class, 'updateStatus']);
        Route::get('/enquiries/{id}/attachments/{attachmentId}', [AdminEnquiryController::class, 'downloadAttachment']);
    });
});
