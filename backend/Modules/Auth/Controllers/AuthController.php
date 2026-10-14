<?php

namespace Modules\Auth\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AuthController extends Controller
{
    /**
     * @route POST /api/auth/register
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|in:director,coordinator,finance,faculty,student,developer',
            'phone' => 'nullable|string|max:20',
        ]);
        $validated['password'] = Hash::make($validated['password']);
        $validated['permissions'] = json_encode([]); // Default empty permissions
        
        $userId = DB::table('users')->insertGetId($validated);
        $user = DB::table('users')->where('id', $userId)->first();
        
        $token = $this->generateJwt($user);
        
        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user
        ], 201);
    }

    /**
     * @route POST /api/auth/login
     */
    public function login(Request $request)
    {
        $email = $request->input('email');
        $password = $request->input('password');

        if (!is_string($email) || $email === '' || !str_contains($email, '@rajagiri.edu')) {
            $this->recordFailedLogin(
                $request,
                is_string($email) ? $email : '',
                'Login Failed - Invalid Domain',
                'Email must contain @rajagiri.edu.'
            );
            return response()->json(['error' => 'Email must contain @rajagiri.edu'], 401);
        }

        $user = DB::table('users')->where('email', $email)->first();

        if (!$user || !is_string($password) || !Hash::check($password, $user->password)) {
            $this->recordFailedLogin($request, $email, 'Login Failed - Invalid Credentials', 'Invalid credentials.', $user->id ?? null);
            return response()->json(['error' => 'Invalid email or password.'], 401);
        }

        $token = $this->generateJwt($user);

        // Record authentication login event in audit_logs table
        if (\Illuminate\Support\Facades\Schema::hasTable('audit_logs')) {
            DB::table('audit_logs')->insert([
                'user_id' => $user->id,
                'action' => 'System Login',
                'description' => "User {$user->name} ({$user->role}) logged in successfully.",
                'created_at' => now()
            ]);
        }

        return $this->respondWithToken($token, $user);
    }

    /**
     * Audit a failed login without ever failing the login request itself.
     *
     * audit_logs.user_id is NOT NULL with a foreign key to users, so a row can
     * only be written when the attempt matches a real user (e.g. wrong
     * password). Attempts with no matching user (unknown or non-@rajagiri.edu
     * email) go to the application log instead — never a made-up user id.
     * The password is never logged.
     */
    private function recordFailedLogin(Request $request, string $email, string $action, string $reason, ?int $userId = null): void
    {
        $description = "Failed login attempt for '{$email}'. {$reason}";

        if ($userId === null) {
            Log::notice($action, ['email' => $email, 'ip' => $request->ip()]);
            return;
        }

        try {
            if (Schema::hasTable('audit_logs')) {
                DB::table('audit_logs')->insert([
                    'user_id' => $userId,
                    'action' => $action,
                    'description' => $description,
                    'created_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('Could not write failed-login audit row', ['email' => $email, 'error' => $e->getMessage()]);
        }
    }

    /**
     * @route POST /api/auth/logout
     */
    public function logout()
    {
        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * @route POST /api/auth/refresh
     */
    public function refresh()
    {
        // JWT Refresh could be implemented here
        return response()->json(['error' => 'Not implemented'], 501);
    }

    /**
     * Helper to format token response.
     */
    protected function respondWithToken($token, $user)
    {
        // Compute frontend-specific UI elements based on role
        $role = $user->role ?? 'student';
        
        $defaultRoutes = [
            'director' => '/director',
            'developer' => '/developer',
            'coordinator' => '/coordinator',
            'finance' => '/finance',
            'faculty' => '/faculty',
            'student' => '/student'
        ];
        
        $modules = [
            'director' => ['director', 'dashboard', 'project', 'finance', 'github', 'audit-notifications', 'certificates', 'student', 'faculty', 'coordinator', 'communication'],
            'developer' => ['developer', 'dashboard', 'project', 'finance', 'github', 'audit-notifications', 'certificates', 'student', 'faculty', 'coordinator', 'communication'],
            'coordinator' => ['coordinator', 'project', 'student', 'communication', 'github', 'certificates'],
            'finance' => ['finance', 'project'],
            'faculty' => ['faculty', 'project', 'communication', 'github'],
            'student' => ['student', 'project', 'communication', 'github', 'certificates']
        ];
        
        // Convert stdClass to array for mutation if using DB facade
        $userArray = (array) $user;
        $userArray['defaultRoute'] = $defaultRoutes[$role] ?? '/student';
        $userArray['modules'] = $modules[$role] ?? $modules['student'];
        $userArray['permissions'] = is_string($user->permissions) ? json_decode($user->permissions, true) : ($user->permissions ?? []);

        if ($role === 'student' && Schema::hasTable('student_profiles')) {
            $profile = DB::table('student_profiles')->where('student_id', $user->id)->first();
            if ($profile) {
                $userArray['designation'] = $profile->designation ? ucfirst($profile->designation) : 'Nova';
                $userArray['course'] = $profile->course ?? 'MCA';
                $userArray['batch'] = $profile->batch ?? '2025-2027';
                $userArray['semester'] = $profile->semester ?? 3;
                $sem = $profile->semester ?? 3;
                $suffix = ($sem == 1) ? 'st' : (($sem == 2) ? 'nd' : (($sem == 3) ? 'rd' : 'th'));
                $yearNum = (int)ceil($sem / 2);
                $yearSuffix = ($yearNum == 1) ? 'st' : (($yearNum == 2) ? 'nd' : (($yearNum == 3) ? 'rd' : 'th'));
                $userArray['semester_text'] = "{$yearNum}{$yearSuffix} Year / {$sem}{$suffix} Semester";
                $userArray['department'] = 'Computer Applications';
            }
        }

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => 86400 * 30,
            'user' => $userArray
        ]);
    }

    private function base64UrlEncode($data)
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    private function generateJwt($user)
    {
        $permissions = is_string($user->permissions) ? json_decode($user->permissions, true) : ($user->permissions ?? []);

        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'sub' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'permissions' => $permissions,
            'exp' => time() + 86400 * 30
        ]);

        $base64UrlHeader = $this->base64UrlEncode($header);
        $base64UrlPayload = $this->base64UrlEncode($payload);

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, config('app.key'), true);
        $base64UrlSignature = $this->base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public function searchUsers(Request $request)
    {
        $role = $request->query('role');
        $search = $request->query('search');

        $query = DB::table('users');

        if ($role) {
            $query->where('role', $role);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        $hasProjects = Schema::hasTable('projects');

        $users = $query->select('id', 'name', 'email', 'role')->take(10)->get()->map(function ($u) use ($hasProjects) {
            $activeProjects = [];
            if ($u->role === 'faculty' && $hasProjects) {
                $queryProj = DB::table('projects')
                    ->where(function($q) use ($u) {
                        if (Schema::hasColumn('projects', 'faculty_id')) {
                            $q->where('faculty_id', $u->id);
                        }
                        if (Schema::hasTable('project_faculty')) {
                            $q->orWhereIn('id', function($sub) use ($u) {
                                $sub->select('project_id')->from('project_faculty')->where('faculty_id', $u->id);
                            });
                        }
                    })
                    ->whereIn('status', ['in_progress', 'accepted', 'active'])
                    ->select('id', 'title', 'status', 'project_type')
                    ->distinct();

                $activeProjects = $queryProj->get()
                    ->map(function($p) {
                        return [
                            'id' => $p->id,
                            'title' => $p->title,
                            'status' => $p->status,
                            'type' => $p->project_type ?? 'Web Application'
                        ];
                    })
                    ->toArray();
            }
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'active_projects_count' => count($activeProjects),
                'active_projects' => $activeProjects
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $users
        ]);
    }
}

