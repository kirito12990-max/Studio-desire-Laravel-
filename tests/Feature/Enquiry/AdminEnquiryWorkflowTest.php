<?php

namespace Tests\Feature\Enquiry;

use App\Models\Client;
use App\Models\EnquiryAttachment;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminEnquiryWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::create([
            'name' => 'Principal Architect',
            'username' => 'principal',
            'email' => 'principal@studiodesire.com',
            'password' => 'SecurePass123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        Storage::fake('local');
    }

    public function test_guest_cannot_access_owner_enquiries(): void
    {
        $response = $this->getJson('/api/admin/enquiries');
        $response->assertStatus(401);
    }

    public function test_owner_can_list_and_search_enquiries(): void
    {
        ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0001',
            'name' => 'Vikram Singhania',
            'email' => 'vikram@singhania.com',
            'message' => 'Luxury villa design in Alwar.',
            'status' => 'NEW',
        ]);

        ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0002',
            'name' => 'Ananya Roy',
            'email' => 'ananya@roy.com',
            'message' => 'Commercial gallery redesign.',
            'status' => 'IN_DISCUSSION',
        ]);

        // List all
        $listResponse = $this->actingAs($this->owner, 'sanctum')->getJson('/api/admin/enquiries');
        $listResponse->assertStatus(200)
            ->assertJsonPath('total', 2);

        // Search by query
        $searchResponse = $this->actingAs($this->owner, 'sanctum')->getJson('/api/admin/enquiries?q=Singhania');
        $searchResponse->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('enquiries.0.name', 'Vikram Singhania');

        // Filter by status
        $filterResponse = $this->actingAs($this->owner, 'sanctum')->getJson('/api/admin/enquiries?status=IN_DISCUSSION');
        $filterResponse->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('enquiries.0.name', 'Ananya Roy');
    }

    public function test_owner_can_view_enquiry_details_with_originating_project_and_history(): void
    {
        $category = PortfolioCategory::create(['name' => 'Hospitality', 'slug' => 'hospitality']);
        $originating = Project::create([
            'title' => 'The Amber Pavilion',
            'slug' => 'the-amber-pavilion',
            'category_id' => $category->id,
            'category' => $category->name,
            'is_published' => true,
        ]);

        $enquiry = ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0003',
            'name' => 'Kabir Sen',
            'email' => 'kabir@sen.com',
            'message' => 'Boutique hotel restaurant design.',
            'status' => 'NEW',
            'originating_project_id' => $originating->id,
            'source_page' => '/projects/the-amber-pavilion',
        ]);

        $response = $this->actingAs($this->owner, 'sanctum')->getJson("/api/admin/enquiries/{$enquiry->id}");
        $response->assertStatus(200)
            ->assertJsonPath('enquiry.name', 'Kabir Sen')
            ->assertJsonPath('enquiry.originating_project.title', 'The Amber Pavilion')
            ->assertJsonPath('enquiry.source_page', '/projects/the-amber-pavilion');
    }

    public function test_owner_can_update_status_and_track_status_history(): void
    {
        $enquiry = ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0004',
            'name' => 'Rohan Joshi',
            'email' => 'rohan@joshi.com',
            'message' => 'Penthouse architectural styling.',
            'status' => 'NEW',
        ]);

        // Update status to CONTACTED
        $res1 = $this->actingAs($this->owner, 'sanctum')->patchJson("/api/admin/enquiries/{$enquiry->id}", [
            'status' => 'CONTACTED',
            'internal_notes' => 'Spoke with Rohan regarding site dimensions.',
        ]);
        $res1->assertStatus(200)
            ->assertJsonPath('enquiry.status', 'CONTACTED');

        // Update status to IN_DISCUSSION
        $res2 = $this->actingAs($this->owner, 'sanctum')->patchJson("/api/admin/enquiries/{$enquiry->id}", [
            'status' => 'IN_DISCUSSION',
            'internal_notes' => 'Sent initial spatial moodboard.',
        ]);
        $res2->assertStatus(200)
            ->assertJsonPath('enquiry.status', 'IN_DISCUSSION');

        $fresh = $enquiry->fresh();
        $this->assertEquals('IN_DISCUSSION', $fresh->status);
        $this->assertCount(3, $fresh->status_history); // Initial creation + 2 updates
        $this->assertEquals('CONTACTED', $fresh->status_history[1]['status']);
        $this->assertEquals('IN_DISCUSSION', $fresh->status_history[2]['status']);
        $this->assertEquals('Principal Architect', $fresh->status_history[2]['changed_by']);
    }

    public function test_owner_can_convert_enquiry_to_draft_project_with_safeguards(): void
    {
        $category = PortfolioCategory::create(['name' => 'Residential', 'slug' => 'residential']);

        $enquiry = ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0005',
            'name' => 'Devendra Rathore',
            'email' => 'devendra@rathore.com',
            'phone' => '+91 99999 88888',
            'location' => 'Jaipur',
            'project_type' => 'Private Villa',
            'budget' => '3 Crore',
            'message' => 'CONFIDENTIAL: Client personal requirement notes.',
            'internal_notes' => 'PRIVATE: Client expects handover by November.',
            'status' => 'IN_DISCUSSION',
        ]);

        $convertResponse = $this->actingAs($this->owner, 'sanctum')->postJson("/api/admin/enquiries/{$enquiry->id}/convert-to-project", [
            'title' => 'Rathore Courtyard Residence',
            'category_id' => $category->id,
            'location' => 'Civil Lines, Jaipur',
            'description' => 'A serene modern courtyard villa with stone jali screens.',
        ]);

        $convertResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'project_id',
                'project' => [
                    'id',
                    'title',
                    'slug',
                    'publishing_status',
                    'is_published',
                    'client_id',
                ],
            ]);

        $projectId = $convertResponse->json('project_id');
        $project = Project::findOrFail($projectId);

        // Assert draft state and privacy separation
        $this->assertEquals('draft', $project->publishing_status);
        $this->assertFalse($project->is_published);
        $this->assertEquals('Rathore Courtyard Residence', $project->title);
        $this->assertEquals('Civil Lines, Jaipur', $project->location);

        // Ensure private enquiry message and budget are NOT leaked into public project fields
        $this->assertStringNotContainsString('CONFIDENTIAL', $project->description);
        $this->assertStringNotContainsString('3 Crore', $project->description);

        // Check enquiry status and links
        $freshEnquiry = $enquiry->fresh();
        $this->assertEquals('CONVERTED', $freshEnquiry->status);
        $this->assertEquals($projectId, $freshEnquiry->converted_project_id);
        $this->assertNotNull($freshEnquiry->client_id);

        // Check client was automatically created/linked
        $client = Client::find($freshEnquiry->client_id);
        $this->assertNotNull($client);
        $this->assertEquals('Devendra Rathore', $client->name);
        $this->assertEquals('devendra@rathore.com', $client->email);

        // Attempt duplicate conversion without force should return 422
        $duplicateAttempt = $this->actingAs($this->owner, 'sanctum')->postJson("/api/admin/enquiries/{$enquiry->id}/convert-to-project", [
            'title' => 'Another Project Attempt',
        ]);
        $duplicateAttempt->assertStatus(422)
            ->assertJsonPath('already_converted', true);
    }

    public function test_owner_can_convert_enquiry_to_client_with_deduplication(): void
    {
        // Existing client
        $existingClient = Client::create([
            'name' => 'Suresh Mittal',
            'email' => 'suresh@mittalcorp.com',
            'phone' => '+91 98290 11223',
            'status' => 'ACTIVE',
        ]);

        // Enquiry from the same email
        $enquiry = ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0006',
            'name' => 'Suresh Mittal',
            'email' => 'suresh@mittalcorp.com',
            'message' => 'New corporate headquarters reception redesign.',
            'status' => 'NEW',
        ]);

        $response = $this->actingAs($this->owner, 'sanctum')->postJson("/api/admin/enquiries/{$enquiry->id}/convert-to-client");
        $response->assertStatus(200)
            ->assertJsonPath('client.id', $existingClient->id);

        // Assert client wasn't duplicated
        $this->assertEquals(1, Client::where('email', 'suresh@mittalcorp.com')->count());
        $this->assertEquals($existingClient->id, $enquiry->fresh()->client_id);
    }

    public function test_owner_can_safely_download_confidential_attachment(): void
    {
        $enquiry = ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0007',
            'name' => 'Harsh Vardhan',
            'email' => 'harsh@vardhan.com',
            'message' => 'Attached structural survey.',
            'status' => 'NEW',
        ]);

        $filePath = 'enquiry_attachments/test_survey.pdf';
        Storage::disk('local')->put($filePath, '%PDF-1.4 DUMMY ATTACHMENT CONTENT');

        $attachment = EnquiryAttachment::create([
            'enquiry_id' => $enquiry->id,
            'original_filename' => 'site_structural_survey.pdf',
            'filename' => 'test_survey.pdf',
            'file_type' => 'pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 32,
            'storage_path' => $filePath,
        ]);

        $response = $this->actingAs($this->owner, 'sanctum')->get("/api/admin/enquiries/{$enquiry->id}/attachments/{$attachment->id}");
        $response->assertStatus(200)
            ->assertHeader('Content-Disposition', 'attachment; filename=site_structural_survey.pdf')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }
}
