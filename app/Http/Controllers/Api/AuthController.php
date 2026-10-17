<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    /**
     * Provide active CSRF token and set client-readable cookie.
     */
    public function csrfToken(Request $request): JsonResponse
    {
        $token = csrf_token();

        return response()->json([
            'csrf_token' => $token,
        ])->cookie('csrf_token', $token, 120, '/', null, config('session.secure', false), false, false, 'lax');
    }

    /**
     * Authenticate owner/admin user with brute-force rate limiting and session regeneration.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $throttleKey = $request->throttleKey();

        // Enforce 5 attempts per minute max
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            Log::warning('Rate limit triggered for owner login attempt', [
                'ip' => $request->ip(),
                'identifier' => $request->input('username'),
                'retry_after' => $seconds,
            ]);

            return response()->json([
                'message' => "Too many login attempts. Please try again in {$seconds} seconds.",
                'detail' => "Too many login attempts. Please try again in {$seconds} seconds.",
                'retry_after' => $seconds,
            ], 429);
        }

        $identifier = $request->input('username');
        $password = (string) $request->input('password');

        // Allow login via either username or email
        $user = User::where(function ($query) use ($identifier) {
            $query->where('username', $identifier)
                  ->orWhere('email', $identifier);
        })->first();

        if (! $user || ! Hash::check($password, $user->password) || ! $user->is_active) {
            RateLimiter::hit($throttleKey, 60);

            Log::warning('Failed owner login attempt', [
                'ip' => $request->ip(),
                'identifier' => $identifier,
            ]);

            return response()->json([
                'message' => 'Invalid credentials or inactive account.',
                'detail' => 'Invalid credentials or inactive account.',
            ], 401);
        }

        RateLimiter::clear($throttleKey);

        // Establish session and regenerate ID against session fixation attacks
        Auth::login($user, $request->boolean('remember', false));
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // Generate Sanctum access token for API/mobile clients
        $token = $user->createToken('owner-session')->plainTextToken;

        Log::info('Successful owner login', [
            'user_id' => $user->id,
            'username' => $user->username ?? $user->email,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'user_id' => $user->id,
            'username' => $user->username ?? $user->name,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'must_change_password' => (bool) $user->must_change_password,
            'token' => $token,
            'csrf_token' => csrf_token(),
            'user' => [
                'id' => $user->id,
                'username' => $user->username ?? $user->name,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * Terminate active owner session and revoke token.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. If explicit Bearer token was provided in the header, revoke it from database
        $bearer = $request->bearerToken();
        if ($bearer) {
            $personalAccessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($bearer);
            $personalAccessToken?->delete();
        }

        // 2. If authenticated via Sanctum token directly
        if ($user) {
            $token = $user->currentAccessToken();
            if ($token && method_exists($token, 'delete')) {
                $token->delete();
            }

            // Invalidate any active owner-session tokens for this user
            $user->tokens()->where('name', 'owner-session')->delete();
        }

        // 3. Clear web guard, forget cached guards and invalidate HTTP session
        Auth::guard('web')->logout();
        Auth::forgetGuards();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        Log::info('Owner logged out successfully', [
            'user_id' => $user?->id,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Return authenticated user profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'username' => $user->username ?? $user->name,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'must_change_password' => (bool) $user->must_change_password,
        ]);
    }

    /**
     * Change owner password securely.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->input('current_password'), $user->password)) {
            return response()->json([
                'message' => 'The provided current password does not match our records.',
                'detail' => 'The provided current password does not match our records.',
            ], 422);
        }

        $user->password = $request->input('new_password');
        $user->must_change_password = false;
        $user->save();

        Log::info('Owner changed password', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    /**
     * Update owner profile metadata.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($request->filled('name')) {
            $user->name = $request->input('name');
        }
        if ($request->filled('username')) {
            $user->username = $request->input('username');
        }
        if ($request->filled('email')) {
            $user->email = $request->input('email');
        }

        $user->save();

        Log::info('Owner profile updated', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'id' => $user->id,
            'username' => $user->username ?? $user->name,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'must_change_password' => (bool) $user->must_change_password,
        ]);
    }
}
