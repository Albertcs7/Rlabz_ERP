<?php

namespace Tests\Feature;

use Tests\TestCase;

class CoordinatorReportsAuthTest extends TestCase
{
    public function test_coordinator_reports_route_requires_authentication(): void
    {
        $response = $this->get('/api/coordinator/reports');

        $response->assertStatus(401);
    }

    public function test_student_role_cannot_access_coordinator_reports(): void
    {
        $login = $this->postJson('/api/auth/login', [
            'email' => 'alex.varghese@rajagiri.edu',
            'password' => 'student123',
        ]);
        $login->assertStatus(200);
        $token = $login->json('access_token');
        $this->assertNotNull($token, 'Login response did not include an access_token.');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->get('/api/coordinator/reports');

        $response->assertStatus(403);
    }
}
