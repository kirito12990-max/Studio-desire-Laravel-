<?php

namespace Tests\Feature\Enquiry;

use App\Mail\NewEnquiryNotification;
use App\Models\ContactInquiry;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use App\Models\User;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class Phase2UnifiedEnquiryAndPrivacyTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $regularUser;
    protected PortfolioCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        RateLimiter::clear('enquiry_submission|127.0.0.1');
        RateLimiter::clear('contact_submission|127.0.0.1');

        $this->owner = User::create([
            'name' => 'Studio Desire Owner',
            'username' => 'owner_admin',
            'email' => 'owner@studiodesire.com',
            'password' => Hash::make('SecretPass123!'),
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $this->regularUser = User::create([
            'name' => 'Regular User',
            'username' => 'regular_user',
            'email' => 'user@example.com',
            'password' => Hash::make('UserPass123!'),
            'role' => 'CLIENT',
            'is_active' => true,
        ]);

        $this->category = PortfolioCategory::create([
            'name' => 'Residential Architecture',
            'slug' => 'residential-architecture',
            'is_active' => true,
        ]);
    }

    public function test_contact_submission_appears_in_owner_enquiry_inbox(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/contact', [
            'name' => 'Ananya Deshmukh',
            'email' => 'ananya@deshmukh.org',
            'phone' => '+91 98200 44332',
            'subject' => 'Villa Consultation',
            'message' => 'We are looking to design a sustainable weekend villa near Alibaug.',
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

        // 1. Assert saved in backward-compatible contact_inquiries table
        $this->assertDatabaseHas('contact_inquiries', [
            'name' => 'Ananya Deshmukh',
            'email' => 'ananya@deshmukh.org',
            'subject' => 'Villa Consultation',
        ]);

        // 2. Assert unified into project_enquiries table
        $this->assertDatabaseHas('project_enquiries', [
            'name' => 'Ananya Deshmukh',
            'email' => 'ananya@deshmukh.org',
            'source' => 'contact_form',
            'status' => 'NEW',
        ]);

        // 3. Assert visible in owner's inbox API
        $inboxResponse = $this->actingAs($this->owner, 'sanctum')->getJson('/api/admin/enquiries');
        $inboxResponse->assertStatus(200);

        $items = collect($inboxResponse->json('items'));
        $found = $items->firstWhere('email', 'ananya@deshmukh.org');
        $this->assertNotNull($found);
        $this->assertEquals('Ananya Deshmukh', $found['name']);
        $this->assertEquals('+91 98200 44332', $found['phone']);
        $this->assertEquals('contact_form', $found['source']);
        $this->assertEquals('Villa Consultation', $found['subject']);

        // 4. Assert owner notification email was dispatched
        Mail::assertSent(NewEnquiryNotification::class, function (NewEnquiryNotification $mail) {
            return $mail->enquiry->email === 'ananya@deshmukh.org'
                && $mail->enquiry->source === 'contact_form';
        });
    }

    public function test_unauthorized_visitor_cannot_retrieve_enquiries(): void
    {
        // Public visitor / guest
        $guestIndex = $this->getJson('/api/admin/enquiries');
        $guestIndex->assertStatus(401);

        $guestDetail = $this->getJson('/api/admin/enquiries/1');
        $guestDetail->assertStatus(401);

        // Non-owner authenticated user
        $userIndex = $this->actingAs($this->regularUser, 'sanctum')->getJson('/api/admin/enquiries');
        $userIndex->assertStatus(403);

        $userDetail = $this->actingAs($this->regularUser, 'sanctum')->getJson('/api/admin/enquiries/1');
        $userDetail->assertStatus(403);
    }

    public function test_email_failure_does_not_discard_submitted_enquiry(): void
    {
        // Simulate transport error in notification service
        $mockService = \Mockery::mock(\App\Services\EnquiryNotificationService::class)->makePartial();
        $mockService->shouldReceive('notifyOwner')
            ->once()
            ->andReturnUsing(function (ProjectEnquiry $enquiry, bool $force = false) {
                $enquiry->update([
                    'email_sent' => false,
                    'email_error' => 'Hostinger SMTP Connection Timeout on port 465',
                ]);
                return false;
            });

        $this->app->instance(\App\Services\EnquiryNotificationService::class, $mockService);

        $response = $this->postJson('/api/enquiries', [
            'name' => 'Rohan Varma',
            'email' => 'rohan@varma.com',
            'message' => 'Need 3D interior renders for our penthouse project.',
        ]);

        // Submission MUST still succeed cleanly with 201
        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'email_sent' => false,
            ]);

        // Record must be safely committed in the database
        $enquiry = ProjectEnquiry::where('email', 'rohan@varma.com')->first();
        $this->assertNotNull($enquiry);
        $this->assertFalse((bool) $enquiry->email_sent);
        $this->assertStringContainsString('Hostinger SMTP Connection Timeout', $enquiry->email_error);

        // When SMTP recovers, retry endpoint succeeds
        Mail::fake();
        $this->app->forgetInstance(\App\Services\EnquiryNotificationService::class);

        $retryResponse = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/admin/enquiries/{$enquiry->id}/retry-email");

        $retryResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'email_sent' => true,
            ]);

        $this->assertTrue((bool) $enquiry->fresh()->email_sent);
        $this->assertNull($enquiry->fresh()->email_error);
    }

    public function test_converting_enquiry_creates_unpublished_untitled_project_without_client_data(): void
    {
        $enquiry = ProjectEnquiry::create([
            'reference_number' => 'ENQ-2026-9999',
            'name' => 'Vikram Singhania',
            'email' => 'vikram@singhania-group.com',
            'phone' => '+91 99887 76655',
            'location' => 'Malabar Hill, Mumbai',
            'project_type' => 'Luxury Penthouse',
            'budget' => '10 Crore',
            'timeline' => 'Immediate',
            'message' => 'CONFIDENTIAL: Private client residence details. Do not publish.',
            'source' => 'website',
            'status' => 'IN_DISCUSSION',
        ]);

        // Convert without passing explicit public metadata
        $response = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/admin/enquiries/{$enquiry->id}/convert-to-project");

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $projectId = $response->json('project_id');
        $project = Project::findOrFail($projectId);

        // 1. Strict Privacy & Defaults
        $this->assertEquals('Untitled project', $project->title);
        $this->assertEquals('untitled-project', $project->slug);
        $this->assertNull($project->location);
        $this->assertNull($project->description);

        // 2. Client name, address, and reference must NOT be in public fields
        $this->assertStringNotContainsString('Vikram Singhania', $project->title);
        $this->assertStringNotContainsString('vikram', $project->slug);
        $this->assertStringNotContainsString('Malabar Hill', (string) $project->location);
        $this->assertStringNotContainsString('ENQ-2026-9999', (string) $project->description);
        $this->assertStringNotContainsString('CONFIDENTIAL', (string) $project->description);

        // 3. Draft & Unpublished
        $this->assertEquals('draft', $project->publishing_status);
        $this->assertFalse((bool) $project->is_published);

        // 4. Private internal association retained
        $this->assertEquals($projectId, $enquiry->fresh()->converted_project_id);
        $this->assertEquals('CONVERTED', $enquiry->fresh()->status);

        // 5. Must NOT appear in public projects gallery
        $publicProjects = $this->getJson('/api/projects');
        $publicProjects->assertStatus(200);
        $this->assertStringNotContainsString('Untitled project', $publicProjects->getContent());
        $this->assertStringNotContainsString('untitled-project', $publicProjects->getContent());
    }

    public function test_owner_can_edit_draft_and_publish_intentionally(): void
    {
        $enquiry = ProjectEnquiry::create([
            'reference_number' => 'ENQ-2026-8888',
            'name' => 'Client XYZ',
            'email' => 'client@xyz.com',
            'message' => 'Initial inquiry',
            'status' => 'IN_DISCUSSION',
        ]);

        $convertRes = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/admin/enquiries/{$enquiry->id}/convert-to-project");
        $projectId = $convertRes->json('project_id');

        // Owner edits the draft project to add public architectural information
        $updateRes = $this->actingAs($this->owner, 'sanctum')->putJson("/api/admin/projects/{$projectId}", [
            'title' => 'Serene Pavilion Residence',
            'subtitle' => 'Modern Minimalist Villa',
            'category_id' => $this->category->id,
            'location' => 'Ahmedabad, Gujarat',
            'description' => 'A modern daylight-focused architectural residence with tactile materials.',
            'cover_image' => '/uploads/projects/sample-cover.webp',
        ]);
        $updateRes->assertStatus(200);

        // Owner publishes the project
        $publishRes = $this->actingAs($this->owner, 'sanctum')->patchJson("/api/admin/projects/{$projectId}/publish");
        $publishRes->assertStatus(200)
            ->assertJsonPath('project.is_published', true);

        // Published project is now accessible to the public
        $publicRes = $this->getJson('/api/projects/serene-pavilion-residence');
        $publicRes->assertStatus(200)
            ->assertJsonPath('title', 'Serene Pavilion Residence')
            ->assertJsonPath('location', 'Ahmedabad, Gujarat')
            ->assertJsonPath('is_published', true);

        // Verify public endpoint NEVER leaks client email or enquiry reference
        $content = $publicRes->getContent();
        $this->assertStringNotContainsString('client@xyz.com', $content);
        $this->assertStringNotContainsString('ENQ-2026-8888', $content);
    }

    public function test_email_settings_and_test_endpoint_authorization(): void
    {
        // Guest cannot access settings
        $guestSettings = $this->getJson('/api/admin/email/settings');
        $guestSettings->assertStatus(401);

        // Owner can view safe settings
        $ownerSettings = $this->actingAs($this->owner, 'sanctum')->getJson('/api/admin/email/settings');
        $ownerSettings->assertStatus(200)
            ->assertJsonStructure([
                'sender_name',
                'sender_email',
                'smtp_host',
                'smtp_port',
                'security',
                'smtp_username',
                'has_password',
                'recipients',
            ]);

        // Password MUST NOT be present in response
        $this->assertArrayNotHasKey('smtp_password', $ownerSettings->json());
        $this->assertArrayNotHasKey('password', $ownerSettings->json());

        // Diagnostic test endpoint
        Mail::fake();
        $testRes = $this->actingAs($this->owner, 'sanctum')->postJson('/api/admin/email/test', [
            'to_email' => 'owner@studiodesire.com',
        ]);
        $testRes->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
