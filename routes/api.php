<?php

use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\ClientController as AdminClientController;
use App\Http\Controllers\Api\Admin\ContentController as AdminContentController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\EmailController as AdminEmailController;
use App\Http\Controllers\Api\Admin\EnquiryController as AdminEnquiryController;
use App\Http\Controllers\Api\Admin\FeaturedController as AdminFeaturedController;
use App\Http\Controllers\Api\Admin\MediaController as AdminMediaController;
use App\Http\Controllers\Api\Admin\ProjectController as AdminProjectController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\EnquiryController;
use App\Http\Controllers\Api\ProjectController;
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
| Public Architectural Portfolio & Project Archive Routes
|--------------------------------------------------------------------------
*/
Route::prefix('projects')->group(function () {
    Route::get('/', [ProjectController::class, 'index']);
    Route::get('/categories', [ProjectController::class, 'categories']);
    Route::get('/featured', [ProjectController::class, 'featured']);
    Route::get('/{slug_or_id}', [ProjectController::class, 'show']);
});
Route::get('/categories', [AdminCategoryController::class, 'index']);

/*
|--------------------------------------------------------------------------
| Public Enquiry & Contact Submission
|--------------------------------------------------------------------------
*/
Route::prefix('enquiries')->group(function () {
    Route::post('/', [EnquiryController::class, 'submit']);
    Route::get('/config', [EnquiryController::class, 'config']);
});
Route::post('/contact', [EnquiryController::class, 'contact']);

/*
|--------------------------------------------------------------------------
| Public Website Content & Editorial Sections
|--------------------------------------------------------------------------
*/
Route::prefix('content')->group(function () {
    Route::get('/', [ContentController::class, 'index']);
    Route::get('/{section}', [ContentController::class, 'show']);
});
Route::get('/featured', [ContentController::class, 'featured']);

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

        // Project Management Workflow
        Route::get('/projects', [AdminProjectController::class, 'index']);
        Route::post('/projects', [AdminProjectController::class, 'store']);
        Route::get('/projects/{id}', [AdminProjectController::class, 'show']);
        Route::put('/projects/{id}', [AdminProjectController::class, 'update']);
        Route::delete('/projects/{id}', [AdminProjectController::class, 'destroy']);
        Route::post('/projects/{id}/duplicate', [AdminProjectController::class, 'duplicate']);
        Route::patch('/projects/{id}/publish', [AdminProjectController::class, 'publish']);
        Route::patch('/projects/{id}/archive', [AdminProjectController::class, 'archive']);
        Route::patch('/projects/{id}/draft', [AdminProjectController::class, 'draft']);
        Route::get('/projects/{id}/preview', [AdminProjectController::class, 'preview']);

        // Reusable Media Library & Project Gallery Operations
        Route::get('/media', [AdminMediaController::class, 'index']);
        Route::post('/media/upload', [AdminMediaController::class, 'upload']);
        Route::post('/media/assign', [AdminMediaController::class, 'assign']);
        Route::delete('/media/{id}', [AdminMediaController::class, 'destroy']);
        Route::patch('/media/{id}', [AdminMediaController::class, 'update']);
        Route::post('/media/create-project-from-selection', [AdminMediaController::class, 'createProjectFromSelection']);
        Route::delete('/projects/media/{projectMediaId}', [AdminMediaController::class, 'unassign']);
        Route::post('/projects/{projectId}/media/reorder', [AdminMediaController::class, 'reorder']);
        Route::patch('/projects/media/{projectMediaId}', [AdminMediaController::class, 'updateProjectMedia']);

        // Portfolio Categories & Deletion Resolution
        Route::get('/categories', [AdminCategoryController::class, 'index']);
        Route::post('/categories', [AdminCategoryController::class, 'store']);
        Route::put('/categories/{id}', [AdminCategoryController::class, 'update']);
        Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy']);
        Route::post('/categories/{id}/reassign-and-delete', [AdminCategoryController::class, 'reassignAndDelete']);

        // Homepage Featured Slider Configuration
        Route::get('/featured', [AdminFeaturedController::class, 'index']);
        Route::post('/featured', [AdminFeaturedController::class, 'store']);
        Route::put('/featured/reorder', [AdminFeaturedController::class, 'reorder']);
        Route::delete('/featured/{id}', [AdminFeaturedController::class, 'destroy']);

        // Enquiries and confidential proposal attachments
        Route::get('/enquiries', [AdminEnquiryController::class, 'index']);
        Route::get('/enquiries/{id}', [AdminEnquiryController::class, 'show']);
        Route::patch('/enquiries/{id}', [AdminEnquiryController::class, 'update']);
        Route::patch('/enquiries/{id}/status', [AdminEnquiryController::class, 'updateStatus']);
        Route::delete('/enquiries/{id}', [AdminEnquiryController::class, 'destroy']);
        Route::post('/enquiries/{id}/convert-to-project', [AdminEnquiryController::class, 'convertToProject']);
        Route::post('/enquiries/{id}/convert-to-client', [AdminEnquiryController::class, 'convertToClient']);
        Route::post('/enquiries/{id}/retry-email', [AdminEnquiryController::class, 'retryEmail']);
        Route::get('/enquiries/{id}/attachments/{attachmentId}', [AdminEnquiryController::class, 'downloadAttachment']);

        // Email Notification Settings & Diagnostics
        Route::get('/email/settings', [AdminEmailController::class, 'getSettings']);
        Route::post('/email/test', [AdminEmailController::class, 'testEmail']);

        // Lightweight Client Relationship Management
        Route::get('/clients', [AdminClientController::class, 'index']);
        Route::post('/clients', [AdminClientController::class, 'store']);
        Route::get('/clients/{id}', [AdminClientController::class, 'show']);
        Route::put('/clients/{id}', [AdminClientController::class, 'update']);
        Route::delete('/clients/{id}', [AdminClientController::class, 'destroy']);

        // Website Structured Content Management
        Route::get('/content', [AdminContentController::class, 'index']);
        Route::get('/content/{section}', [AdminContentController::class, 'show']);
        Route::put('/content/{section}', [AdminContentController::class, 'update']);
    });
});

