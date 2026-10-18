<?php

namespace Tests\Feature\Enquiry;

use App\Models\ProjectEnquiry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class EnquiryReferenceCollisionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('enquiry_submission|127.0.0.1');
        RateLimiter::clear('contact_submission|127.0.0.1');
    }

    public function test_deleting_enquiry_does_not_cause_duplicate_reference_collision(): void
    {
        // 1. Create first enquiry
        $res1 = $this->postJson('/api/enquiries', [
            'name' => 'First Client',
            'email' => 'client1@example.com',
            'message' => 'First message requirement.',
        ]);
        $res1->assertStatus(201);
        $enq1 = ProjectEnquiry::where('email', 'client1@example.com')->first();
        $this->assertEquals('ENQ-' . date('Y') . '-0001', $enq1->reference_number);

        // 2. Create second enquiry
        $res2 = $this->postJson('/api/enquiries', [
            'name' => 'Second Client',
            'email' => 'client2@example.com',
            'message' => 'Second message requirement.',
        ]);
        $res2->assertStatus(201);
        $enq2 = ProjectEnquiry::where('email', 'client2@example.com')->first();
        $this->assertEquals('ENQ-' . date('Y') . '-0002', $enq2->reference_number);

        // 3. Delete the first enquiry (in old row-count logic, count() becomes 1, so next enquiry would try 0002 and crash)
        $enq1->delete();
        $this->assertEquals(1, ProjectEnquiry::count());

        // 4. Create third enquiry — should safely become 0003 without collision
        $res3 = $this->postJson('/api/enquiries', [
            'name' => 'Third Client',
            'email' => 'client3@example.com',
            'message' => 'Third message requirement.',
        ]);
        $res3->assertStatus(201);
        $enq3 = ProjectEnquiry::where('email', 'client3@example.com')->first();
        $this->assertEquals('ENQ-' . date('Y') . '-0003', $enq3->reference_number);
    }

    public function test_reference_generator_handles_custom_year_and_sequence(): void
    {
        $ref2025 = ProjectEnquiry::generateUniqueReference('2025');
        $this->assertEquals('ENQ-2025-0001', $ref2025);

        ProjectEnquiry::create([
            'reference_number' => 'ENQ-2025-0099',
            'name' => 'Legacy 2025 Client',
            'email' => 'legacy2025@example.com',
            'message' => 'Existing legacy record with high sequence number.',
        ]);

        $next2025 = ProjectEnquiry::generateUniqueReference('2025');
        $this->assertEquals('ENQ-2025-0100', $next2025);
    }

    public function test_database_uniqueness_constraint_is_enforced(): void
    {
        ProjectEnquiry::create([
            'reference_number' => 'ENQ-2026-7777',
            'name' => 'Original Holder',
            'email' => 'original@example.com',
            'message' => 'Holding reference 7777.',
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        // Directly attempting to insert duplicate reference number must trigger DB unique constraint
        ProjectEnquiry::create([
            'reference_number' => 'ENQ-2026-7777',
            'name' => 'Duplicate Attempt',
            'email' => 'duplicate@example.com',
            'message' => 'Should fail constraint.',
        ]);
    }
}
