<?php

require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

function runTest($name, $callable) {
    echo "Running: $name... ";
    try {
        $callable();
        echo "[PASSED]\n";
    } catch (\Throwable $e) {
        echo "[FAILED]\n";
        echo "Error: " . $e->getMessage() . "\n";
        echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
        exit(1);
    }
}

function callApi($method, $uri, $data = [], $token = null) {
    $server = [
        'REQUEST_METHOD' => $method,
        'CONTENT_TYPE' => 'application/json',
        'HTTP_ACCEPT' => 'application/json',
    ];
    if ($token) {
        $server['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
    }

    $content = json_encode($data);
    $request = Request::create($uri, $method, [], [], [], $server, $content);
    $response = app()->handle($request);
    
    return [
        'status' => $response->getStatusCode(),
        'json' => json_decode($response->getContent(), true),
        'raw' => $response->getContent()
    ];
}

$adminToken = null;
$createdUserId = null;

runTest("1. Admin Login (POST /api/auth/login)", function() use (&$adminToken) {
    $res = callApi('POST', '/api/auth/login', [
        'email' => 'admin@rajagiri.edu',
        'password' => 'admin123',
    ]);
    if ($res['status'] !== 200) {
        throw new Exception("Login failed with status {$res['status']}: " . $res['raw']);
    }
    $token = $res['json']['access_token'] ?? ($res['json']['token'] ?? null);
    if (empty($token)) {
        throw new Exception("No access_token in login response: " . $res['raw']);
    }
    if (($res['json']['user']['role'] ?? '') !== 'admin') {
        throw new Exception("Expected role 'admin', got: " . ($res['json']['user']['role'] ?? 'null'));
    }
    $adminToken = $token;
});

runTest("2. Overview Stats (GET /api/admin/overview)", function() use (&$adminToken) {
    $res = callApi('GET', '/api/admin/overview', [], $adminToken);
    if ($res['status'] !== 200) {
        throw new Exception("Overview failed: " . $res['raw']);
    }
    $stats = $res['json']['data'] ?? ($res['json']['stats'] ?? []);
    if (!isset($stats['total_users']) || $stats['total_users'] < 1) {
        throw new Exception("Invalid total_users count: " . json_encode($stats));
    }
});

runTest("3. Permissions Catalog (GET /api/admin/permissions-catalog)", function() use (&$adminToken) {
    $res = callApi('GET', '/api/admin/permissions-catalog', [], $adminToken);
    if ($res['status'] !== 200) {
        throw new Exception("Catalog failed: " . $res['raw']);
    }
    if (empty($res['json']['catalog']['Administrative'])) {
        throw new Exception("Catalog missing Administrative group: " . $res['raw']);
    }
});

runTest("4. List Users with Pagination & Filter (GET /api/admin/users)", function() use (&$adminToken) {
    $res = callApi('GET', '/api/admin/users?role=admin', [], $adminToken);
    if ($res['status'] !== 200) {
        throw new Exception("List users failed: " . $res['raw']);
    }
    $users = $res['json']['data'] ?? ($res['json']['users']['data'] ?? []);
    if (empty($users)) {
        throw new Exception("Expected at least one admin user: " . $res['raw']);
    }
});

runTest("5. Create Test User (POST /api/admin/users)", function() use (&$adminToken, &$createdUserId) {
    // Delete test user if already exists from prior test runs
    DB::table('users')->where('email', 'test_dev_agent@rajagiri.edu')->delete();

    $res = callApi('POST', '/api/admin/users', [
        'name' => 'Agent Test User',
        'email' => 'test_dev_agent@rajagiri.edu',
        'password' => 'secret123',
        'role' => 'developer',
        'status' => 'active',
        'department' => 'Software Engineering',
        'permissions' => ['view-projects', 'project.task.update'],
    ], $adminToken);

    if ($res['status'] !== 201) {
        throw new Exception("Create user failed ({$res['status']}): " . $res['raw']);
    }
    $createdUserId = $res['json']['user']['id'] ?? null;
    if (!$createdUserId) {
        throw new Exception("No user id returned: " . $res['raw']);
    }
});

runTest("6. Fetch User Details (GET /api/admin/users/{id})", function() use (&$adminToken, &$createdUserId) {
    $res = callApi('GET', "/api/admin/users/{$createdUserId}", [], $adminToken);
    if ($res['status'] !== 200) {
        throw new Exception("Fetch user failed: " . $res['raw']);
    }
    $user = $res['json']['user'] ?? [];
    if (($user['email'] ?? '') !== 'test_dev_agent@rajagiri.edu') {
        throw new Exception("User email mismatch: " . $res['raw']);
    }
});

runTest("7. Update User Permissions (PUT /api/admin/users/{id}/permissions)", function() use (&$adminToken, &$createdUserId) {
    $newPermissions = ['view-projects', 'project.task.update', 'view-github', 'view-communication'];
    $res = callApi('PUT', "/api/admin/users/{$createdUserId}/permissions", [
        'permissions' => $newPermissions
    ], $adminToken);

    if ($res['status'] !== 200) {
        throw new Exception("Update permissions failed: " . $res['raw']);
    }

    // Verify persisted directly in users.permissions
    $dbUser = DB::table('users')->where('id', $createdUserId)->first();
    $perms = json_decode($dbUser->permissions, true);
    if ($perms !== $newPermissions) {
        throw new Exception("DB permissions mismatch. Expected: " . json_encode($newPermissions) . ", Got: " . $dbUser->permissions);
    }
});

runTest("8. Reset Password (POST /api/admin/users/{id}/reset-password)", function() use (&$adminToken, &$createdUserId) {
    $res = callApi('POST', "/api/admin/users/{$createdUserId}/reset-password", [
        'password' => 'newPassword123'
    ], $adminToken);

    if ($res['status'] !== 200) {
        throw new Exception("Reset password failed: " . $res['raw']);
    }

    // Try logging in with the new password
    $loginRes = callApi('POST', '/api/auth/login', [
        'email' => 'test_dev_agent@rajagiri.edu',
        'password' => 'newPassword123',
    ]);
    if ($loginRes['status'] !== 200) {
        throw new Exception("Login with new temporary password failed: " . $loginRes['raw']);
    }
});

runTest("9. Suspend User & Verify Access Revocation (PUT /api/admin/users/{id}/status)", function() use (&$adminToken, &$createdUserId) {
    // 1. Get token for the test user
    $loginRes = callApi('POST', '/api/auth/login', [
        'email' => 'test_dev_agent@rajagiri.edu',
        'password' => 'newPassword123',
    ]);
    $userToken = $loginRes['json']['access_token'] ?? ($loginRes['json']['token'] ?? null);

    // 2. Admin suspends the user
    $suspendRes = callApi('PUT', "/api/admin/users/{$createdUserId}/status", [
        'status' => 'suspended'
    ], $adminToken);
    if ($suspendRes['status'] !== 200) {
        throw new Exception("Suspend failed: " . $suspendRes['raw']);
    }

    // 3. User attempts to use their token (e.g. calling /api/admin/users which requires JwtMiddleware)
    // or any authenticated route
    $testReq = callApi('GET', "/api/admin/users", [], $userToken);
    if ($testReq['status'] !== 403) {
        throw new Exception("Expected 403 status for suspended user, got: {$testReq['status']} - " . $testReq['raw']);
    }

    // 4. User attempts new login
    $blockedLogin = callApi('POST', '/api/auth/login', [
        'email' => 'test_dev_agent@rajagiri.edu',
        'password' => 'newPassword123',
    ]);
    if ($blockedLogin['status'] !== 403) {
        throw new Exception("Expected 403 on login for suspended user, got: {$blockedLogin['status']}");
    }

    // 5. Reactivate user
    $reactivateRes = callApi('PUT', "/api/admin/users/{$createdUserId}/status", [
        'status' => 'active'
    ], $adminToken);
    if ($reactivateRes['status'] !== 200) {
        throw new Exception("Reactivate failed: " . $reactivateRes['raw']);
    }
});

runTest("10. Safety Guard: Admin Self-Suspension & Self-Demotion Blocked", function() use (&$adminToken) {
    $admin = DB::table('users')->where('email', 'admin@rajagiri.edu')->first();

    // Try suspending oneself
    $selfSuspend = callApi('PUT', "/api/admin/users/{$admin->id}/status", [
        'status' => 'suspended'
    ], $adminToken);
    if ($selfSuspend['status'] !== 422) {
        throw new Exception("Expected 422 for self-suspension, got: {$selfSuspend['status']}");
    }

    // Try demoting oneself
    $selfDemote = callApi('PUT', "/api/admin/users/{$admin->id}", [
        'name' => 'Administrator',
        'email' => 'admin@rajagiri.edu',
        'role' => 'student',
    ], $adminToken);
    if ($selfDemote['status'] !== 422) {
        throw new Exception("Expected 422 for self-demotion, got: {$selfDemote['status']}");
    }
});

runTest("11. Delete Clean User (DELETE /api/admin/users/{id})", function() use (&$adminToken, &$createdUserId) {
    $res = callApi('DELETE', "/api/admin/users/{$createdUserId}", [], $adminToken);
    if ($res['status'] !== 200) {
        throw new Exception("Delete user failed: " . $res['raw']);
    }

    $stillExists = DB::table('users')->where('id', $createdUserId)->first();
    if ($stillExists) {
        throw new Exception("User was not deleted from DB.");
    }
});

runTest("12. Verify Audit Logs (GET /api/admin/audit-logs)", function() use (&$adminToken) {
    $res = callApi('GET', '/api/admin/audit-logs?limit=10', [], $adminToken);
    if ($res['status'] !== 200) {
        throw new Exception("Audit logs fetch failed: " . $res['raw']);
    }
    $logs = $res['json']['data'] ?? ($res['json']['logs']['data'] ?? []);
    if (empty($logs)) {
        throw new Exception("Expected audit log records from test actions: " . $res['raw']);
    }
});

runTest("13. Non-Regression: Existing Role Logins", function() {
    $roles = [
        ['email' => 'director@rajagiri.edu', 'password' => 'director123', 'role' => 'director'],
        ['email' => 'developer@rajagiri.edu', 'password' => 'developer123', 'role' => 'developer'],
        ['email' => 'coordinator@rajagiri.edu', 'password' => 'password123', 'role' => 'coordinator'],
        ['email' => 'faculty@rajagiri.edu', 'password' => 'faculty123', 'role' => 'faculty'],
        ['email' => 'student@rajagiri.edu', 'password' => 'student123', 'role' => 'student'],
        ['email' => 'finance@rajagiri.edu', 'password' => 'finance123', 'role' => 'finance'],
    ];
    foreach ($roles as $cred) {
        $res = callApi('POST', '/api/auth/login', [
            'email' => $cred['email'],
            'password' => $cred['password'],
        ]);
        if ($res['status'] !== 200) {
            throw new Exception("Login failed for {$cred['email']}: " . $res['raw']);
        }
        $actualRole = $res['json']['user']['role'] ?? null;
        if ($actualRole !== $cred['role']) {
            throw new Exception("Role mismatch for {$cred['email']}. Expected: {$cred['role']}, got: $actualRole");
        }
    }
});

echo "\nALL 13 TESTS (INCLUDING REGRESSION VERIFICATION) PASSED SUCCESSFULLY!\n";
