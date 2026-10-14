<?php

namespace Modules\Auth\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
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
            'role' => 'required|in:director,coordinator,finance,faculty,student,developer,design_head',
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

        if (!$email || !str_contains($email, '@rajagiri.edu')) {
            if (\Illuminate\Support\Facades\Schema::hasTable('audit_logs')) {
                DB::table('audit_logs')->insert([
                    'user_id' => 1,
                    'action' => 'Login Failed - Invalid Domain',
                    'description' => "Failed login attempt for '{$email}'. Email must contain @rajagiri.edu.",
                    'created_at' => now()
                ]);
            }
            return response()->json(['error' => 'Email must contain @rajagiri.edu'], 401);
        }

        $user = DB::table('users')->where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            if (\Illuminate\Support\Facades\Schema::hasTable('audit_logs')) {
                DB::table('audit_logs')->insert([
                    'user_id' => $user->id ?? 1,
                    'action' => 'Login Failed - Invalid Credentials',
                    'description' => "Failed login attempt for '{$email}'. Invalid credentials.",
                    'created_at' => now()
                ]);
            }
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
            'student' => '/student',
            'design_head' => '/design',
        ];
        
        $modules = [
            'director' => ['director', 'dashboard', 'project', 'finance', 'github', 'audit-notifications', 'certificates', 'student', 'faculty', 'coordinator', 'communication', 'design', 'profile'],
            'developer' => ['developer', 'dashboard', 'project', 'finance', 'github', 'audit-notifications', 'certificates', 'student', 'faculty', 'coordinator', 'communication', 'design', 'profile'],
            'coordinator' => ['coordinator', 'project', 'student', 'communication', 'github', 'certificates', 'design', 'profile'],
            'finance' => ['finance', 'project', 'profile'],
            'faculty' => ['faculty', 'project', 'communication', 'github', 'profile'],
            'student' => ['student', 'project', 'communication', 'github', 'certificates', 'profile'],
            'design_head' => ['design', 'project', 'communication', 'profile'],
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

    public function getProfile(Request $request)
    {
        $userId = $request->auth_user['sub'] ?? null;
        if (!$userId) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $user = DB::table('users')->where('id', $userId)->first();
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $userArray = (array) $user;
        unset($userArray['password']);
        $userArray['permissions'] = is_string($user->permissions) ? json_decode($user->permissions, true) : ($user->permissions ?? []);

        // Retrieve teams / projects (finance head oversees finances across all projects, so no team assignment)
        $projects = [];
        if (Schema::hasTable('projects') && $user->role !== 'finance') {
            $projects = DB::table('projects')
                ->where('created_by', $userId)
                ->orWhereIn('id', function ($q) use ($userId) {
                    $q->select('project_id')->from('project_student')->where('student_id', $userId);
                })
                ->orWhereIn('id', function ($q) use ($userId) {
                    $q->select('project_id')->from('project_faculty')->where('faculty_id', $userId);
                })
                ->select('id', 'title', 'project_type', 'status')
                ->take(8)
                ->get();

            // If user is admin/director/design_head/coordinator without direct assignment, show top active projects
            if ($projects->isEmpty()) {
                $projects = DB::table('projects')->select('id', 'title', 'project_type', 'status')->take(4)->get();
            }
        }

        // Student metadata if applicable
        if ($user->role === 'student' && Schema::hasTable('student_profiles')) {
            $studentProf = DB::table('student_profiles')->where('student_id', $userId)->first();
            if ($studentProf) {
                $userArray['course'] = $studentProf->course ?? 'MCA';
                $userArray['batch'] = $studentProf->batch ?? '2025-2027';
                $userArray['semester'] = $studentProf->semester ?? 3;
                $userArray['designation'] = $studentProf->designation ? ucfirst($studentProf->designation) : 'Nova';
            }
        }

        // Faculty metadata if applicable
        if ($user->role === 'faculty' && Schema::hasTable('faculty_profiles')) {
            $facProf = DB::table('faculty_profiles')->where('faculty_id', $userId)->first();
            if ($facProf) {
                $userArray['department'] = $facProf->department ?? 'Computer Applications';
                $userArray['designation'] = $facProf->designation ?? 'Faculty Member';
            }
        }

        return response()->json([
            'status' => 'success',
            'user' => $userArray,
            'teams' => $projects,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $userId = $request->auth_user['sub'] ?? null;
        if (!$userId) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'phone' => 'nullable|string|max:30',
            'bio' => 'nullable|string|max:1000',
            'location' => 'nullable|string|max:150',
            'department' => 'nullable|string|max:150',
            'avatar' => 'nullable|string',
        ]);

        $updateData = [
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('users', 'bio')) $updateData['bio'] = $validated['bio'] ?? null;
        if (Schema::hasColumn('users', 'location')) $updateData['location'] = $validated['location'] ?? 'Kochi, India';
        if (Schema::hasColumn('users', 'department')) $updateData['department'] = $validated['department'] ?? null;
        if (Schema::hasColumn('users', 'avatar')) $updateData['avatar'] = $validated['avatar'] ?? null;

        DB::table('users')->where('id', $userId)->update($updateData);

        if (Schema::hasTable('audit_logs')) {
            DB::table('audit_logs')->insert([
                'user_id' => $userId,
                'action' => 'Profile Updated',
                'description' => "User {$validated['name']} updated personal profile details.",
                'created_at' => now(),
            ]);
        }

        $user = DB::table('users')->where('id', $userId)->first();
        $userArray = (array) $user;
        unset($userArray['password']);
        $userArray['permissions'] = is_string($user->permissions) ? json_decode($user->permissions, true) : ($user->permissions ?? []);

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully',
            'user' => $userArray,
        ]);
    }

    public function changePassword(Request $request)
    {
        $userId = $request->auth_user['sub'] ?? null;
        if (!$userId) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|different:current_password',
            'confirm_password' => 'required|same:new_password',
        ]);

        $user = DB::table('users')->where('id', $userId)->first();
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'Current password does not match.'], 422);
        }

        DB::table('users')->where('id', $userId)->update([
            'password' => Hash::make($request->new_password),
            'updated_at' => now(),
        ]);

        if (Schema::hasTable('audit_logs')) {
            DB::table('audit_logs')->insert([
                'user_id' => $userId,
                'action' => 'Password Changed',
                'description' => "User {$user->name} securely changed account password.",
                'created_at' => now(),
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Password changed successfully.'
        ]);
    }
}

