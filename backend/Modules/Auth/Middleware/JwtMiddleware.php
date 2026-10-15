<?php

namespace Modules\Auth\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class JwtMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken() ?: $request->query('token');
        if (!$token) {
            return response()->json(['status' => 'Authorization Token not found'], 401);
        }

        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $signature = hash_hmac('sha256', $parts[0] . "." . $parts[1], config('app.key'), true);
            $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
            
            if (hash_equals($base64UrlSignature, $parts[2])) {
                $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
                
                if (isset($payload['exp']) && $payload['exp'] >= time()) {
                    $userId = $payload['sub'] ?? null;
                    if ($userId && Schema::hasTable('users')) {
                        $freshUser = DB::table('users')->where('id', $userId)->first();

                        if (!$freshUser) {
                            return response()->json(['status' => 'User no longer exists', 'error' => 'Unauthorized'], 401);
                        }

                        if (isset($freshUser->status) && $freshUser->status === 'suspended') {
                            return response()->json(['status' => 'Account is suspended', 'error' => 'Account is suspended. Please contact administrator.'], 403);
                        }

                        // Ensure changes to permissions, role, and status take effect immediately
                        $payload['role'] = $freshUser->role ?? ($payload['role'] ?? null);
                        $payload['status'] = $freshUser->status ?? 'active';
                        $payload['permissions'] = is_string($freshUser->permissions)
                            ? (json_decode($freshUser->permissions, true) ?: [])
                            : (is_array($freshUser->permissions) ? $freshUser->permissions : []);
                    }

                    $request->merge([
                        'auth_user' => $payload
                    ]);
                    return $next($request);
                }
                return response()->json(['status' => 'Token is Expired'], 401);
            }
        }

        return response()->json(['status' => 'Token is Invalid'], 401);
    }
}
