<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes — Studio Desire Single-Page Architectural Portfolio
|--------------------------------------------------------------------------
|
| Serves the compiled static React production frontend directly.
| Hash-based client routing (#projects, #gallery, #contact, #owner/login)
| enables instant static delivery across shared and dedicated PHP hosting.
|
*/

Route::get('/', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response(file_get_contents($indexPath), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }
    return view('welcome');
});

Route::fallback(function (\Illuminate\Http\Request $request) {
    if ($request->is('api/*') || $request->expectsJson()) {
        return response()->json(['message' => 'API endpoint not found.'], 404);
    }

    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response(file_get_contents($indexPath), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }
    return response()->json(['message' => 'Resource not found'], 404);
});
