<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;

class RequirementChangeTest extends TestCase
{
    private array $insertedIds = [];

    protected function tearDown(): void
    {
        if (!empty($this->insertedIds)) {
            DB::table('requirement_changes')->whereIn('id', $this->insertedIds)->delete();
        }
        parent::tearDown();
    }

    private function loginAndGetToken(string $email, string $password): string
    {
        $response = $this->postJson('/api/auth/login', ['email' => $email, 'password' => $password]);
        $response->assertStatus(200);
        $token = $response->json('access_token');
        $this->assertNotNull($token);
        return $token;
    }

    public function test_logging_a_requirement_change_succeeds_and_stores_correct_values(): void
    {
        // Uses a real, existing client_requirements row — none are created.
        $requirement = DB::table('client_requirements')->first();
        if (!$requirement) {
            $this->markTestSkipped('No client_requirements row exists to exercise this test against.');
        }

        // Snapshot every pre-existing requirement_changes row (whatever IDs/content
        // they actually have, not assumed) so we can prove afterward that none of
        // them were touched — no hardcoded ID or seeded description relied on.
        $priorChanges = DB::table('requirement_changes')->get()->keyBy('id');
        $priorCount = $priorChanges->count();

        $token = $this->loginAndGetToken('coordinator@rajagiri.edu', 'password123');
        $marker = 'AUTOMATED_TEST_CHANGE_' . uniqid();
        $reason = 'Automated test reason ' . $marker;
        $newDescription = 'Test new description ' . $marker;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/coordinator/projects/{$requirement->project_id}/requirement-changes", [
                'client_requirement_id' => $requirement->id,
                'change_description' => $marker,
                'new_description' => $newDescription,
                'reason' => $reason,
            ]);

        $response->assertStatus(201);
        $newId = $response->json('data.id');
        $this->assertNotNull($newId);
        $this->insertedIds[] = $newId; // only this exact row will ever be deleted

        $stored = DB::table('requirement_changes')->where('id', $newId)->first();
        $this->assertNotNull($stored);
        $this->assertEquals($requirement->id, $stored->client_requirement_id);
        $this->assertEquals($requirement->project_id, $stored->project_id);
        $this->assertEquals($requirement->description, $stored->previous_description);
        $this->assertEquals($newDescription, $stored->new_description);
        $this->assertEquals($marker, $stored->change_description);
        $this->assertEquals($reason, $stored->reason);
        $this->assertNotNull($stored->requested_by);
        $this->assertNotNull($stored->changed_on);
        $this->assertEquals('pending', $stored->status);
        $this->assertNull($stored->approved_by);
        $this->assertNull($stored->approved_at);

        // Exactly one new row was added.
        $this->assertEquals($priorCount + 1, DB::table('requirement_changes')->count());

        // Every pre-existing row (whatever it contained) is byte-for-byte unchanged —
        // proves history was preserved, not overwritten, without assuming any
        // specific seeded ID or description.
        foreach ($priorChanges as $id => $originalRow) {
            $currentRow = DB::table('requirement_changes')->where('id', $id)->first();
            $this->assertNotNull($currentRow, "Pre-existing requirement_changes row #{$id} was unexpectedly deleted.");
            $this->assertEquals(
                (array) $originalRow,
                (array) $currentRow,
                "Pre-existing requirement_changes row #{$id} was modified."
            );
        }
    }
}
