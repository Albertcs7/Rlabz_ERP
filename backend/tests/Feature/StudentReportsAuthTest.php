<?php

namespace Tests\Feature;

use Tests\TestCase;

class StudentReportsAuthTest extends TestCase
{
    public function test_student_reports_route_requires_authentication(): void
    {
        $response = $this->get('/api/student/reports');

        $response->assertStatus(401);
    }
}
