<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOwner
{
    /**
     * Handle an incoming request and enforce Studio Desire Owner role.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated. Owner session required.',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Account is suspended or inactive. Please contact the administrator.',
            ], 403);
        }

        if (! $user->isOwner()) {
            return response()->json([
                'message' => 'Access denied. Studio Desire owner or administrator privileges required.',
            ], 403);
        }

        return $next($request);
    }
}
