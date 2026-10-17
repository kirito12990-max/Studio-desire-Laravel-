<?php

namespace Tests\Feature\Enquiry;

use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicEnquiryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('enquiry_submission|127.0.0.1');
        RateLimiter::clear('contact_submission|127.0.0.1');
        Storage::fake('local');
    }

    public function test_visitor_can_submit_valid_enquiry_with_minimal_fields(): void
    {
        $response = $this->postJson('/api/enquiries', [
            'name' => 'Aarav Sharma',
            'email' => 'aarav.sharma@example.com',
            'message' => 'We are planning a new contemporary residence in Vaishali Nagar.',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'reference_number',
                'enquiry_id',
            ]);

        $this->assertDatabaseHas('project_enquiries', [
            'name' => 'Aarav Sharma',
            'email' => 'aarav.sharma@example.com',
            'status' => 'NEW',
        ]);

        $enquiry = ProjectEnquiry::where('email', 'aarav.sharma@example.com')->first();
        $this->assertNotNull($enquiry->reference_number);
        $this->assertMatchesRegularExpression('/^(ENQ|SD)-\d{4}/', $enquiry->reference_number);
    }

    public function test_visitor_can_submit_full_enquiry_with_originating_project_and_attachment(): void
    {
        $category = PortfolioCategory::create([
            'name' => 'Residential',
            'slug' => 'residential',
        ]);

        $originatingProject = Project::create([
            'title' => 'CAFE 08',
            'slug' => 'cafe-08',
            'category_id' => $category->id,
            'category' => $category->name,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $fakeFile = UploadedFile::fake()->create('concept_brief.pdf', 250, 'application/pdf');

        $response = $this->post('/api/enquiries', [
            'name' => 'Meera Patel',
            'email' => 'meera@example.com',
            'phone' => '+91 98765 43210',
            'message' => 'Inspired by CAFE 08. We require interior architecture and bespoke joinery for a penthouse.',
            'project_type' => 'Residential Penthouse',
            'location' => 'Jaipur, Rajasthan',
            'budget' => '1.5 - 2 Crore',
            'timeline' => 'Q4 2026',
            'source_page' => '/projects/cafe-08',
            'originating_project_id' => $originatingProject->id,
            'attachment' => $fakeFile,
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('project_enquiries', [
            'name' => 'Meera Patel',
            'email' => 'meera@example.com',
            'phone' => '+91 98765 43210',
            'location' => 'Jaipur, Rajasthan',
            'budget' => '1.5 - 2 Crore',
            'timeline' => 'Q4 2026',
            'source_page' => '/projects/cafe-08',
            'originating_project_id' => $originatingProject->id,
            'status' => 'NEW',
        ]);

        $enquiry = ProjectEnquiry::where('email', 'meera@example.com')->first();
        $this->assertCount(1, $enquiry->attachments);
        $this->assertEquals('concept_brief.pdf', $enquiry->attachments->first()->original_filename);
    }

    public function test_client_supplied_status_and_internal_notes_are_never_trusted(): void
    {
        $response = $this->postJson('/api/enquiries', [
            'name' => 'Sneaky Submitter',
            'email' => 'sneaky@example.com',
            'message' => 'Attempting status override.',
            'status' => 'CONVERTED',
            'internal_notes' => 'Owner approved discount 50%',
            'is_published' => true,
        ]);

        $response->assertStatus(201);

        $enquiry = ProjectEnquiry::where('email', 'sneaky@example.com')->first();
        // Status must be NEW and internal_notes must not be overwritten by visitor
        $this->assertEquals('NEW', $enquiry->status);
        $this->assertNull($enquiry->internal_notes);
    }

    public function test_enquiry_validation_rejects_missing_required_fields(): void
    {
        $response = $this->postJson('/api/enquiries', [
            'email' => 'not-a-valid-email',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'message']);
    }

    public function test_honeypot_spam_drop_silently_discards_bot_submissions(): void
    {
        $response = $this->postJson('/api/enquiries', [
            'name' => 'Spam Bot',
            'email' => 'bot@spammer.com',
            'message' => 'Buy cheap links now!',
            '_honey' => 'http://spam-link.ru',
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseMissing('project_enquiries', [
            'email' => 'bot@spammer.com',
        ]);
    }

    public function test_rate_limiting_protects_public_enquiry_endpoint(): void
    {
        $payload = [
            'name' => 'Rate Limit Test',
            'email' => 'test@example.com',
            'message' => 'Testing rate limits.',
        ];

        // 5 allowed submissions
        for ($i = 0; $i < 5; $i++) {
            $res = $this->postJson('/api/enquiries', $payload);
            $res->assertStatus(201);
        }

        // 6th attempt must be throttled
        $throttled = $this->postJson('/api/enquiries', $payload);
        $throttled->assertStatus(429);
    }

    public function test_public_contact_endpoint_records_enquiry(): void
    {
        $response = $this->postJson('/api/contact', [
            'name' => 'Priya Mehta',
            'email' => 'priya.mehta@example.com',
            'phone' => '+91 99887 76655',
            'subject' => 'Exhibition Inquiry',
            'message' => 'We would like to feature Studio Desire projects in our architectural review.',
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('contact_inquiries', [
            'name' => 'Priya Mehta',
            'email' => 'priya.mehta@example.com',
            'subject' => 'Exhibition Inquiry',
            'status' => 'NEW',
        ]);
    }

    public function test_public_enquiry_config_returns_project_types_and_budget_ranges(): void
    {
        $response = $this->getJson('/api/enquiries/config');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'project_types',
                'budget_ranges',
                'timeline_options',
            ]);
    }
}
