<?php

namespace Tests\Feature\EndToEnd;

use App\Models\EnquiryAttachment;
use App\Models\Media;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use App\Models\ProjectMedia;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CompleteLifecycleE2ETest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
    }

    /**
     * Test the complete 12-step lifecycle:
     * 1. Owner logs in.
     * 2. Owner creates a category.
     * 3. Owner uploads media.
     * 4. Owner creates a draft project.
     * 5. Owner adds and reorders gallery images.
     * 6. Owner previews and publishes the project.
     * 7. The project appears correctly on the public website.
     * 8. Owner edits or archives the project.
     * 9. A visitor submits an enquiry.
     * 10. Owner updates the enquiry status.
     * 11. Owner converts the enquiry into a draft project.
     * 12. Owner confirms that private enquiry data is not publicly exposed.
     */
    public function test_full_business_lifecycle_and_privacy_separation(): void
    {
        // -------------------------------------------------------------
        // Step 1: Owner logs in
        // -------------------------------------------------------------
        $owner = User::create([
            'name' => 'Zenith Suthar',
            'username' => 'zenith',
            'email' => 'zenith@studiodesire.com',
            'password' => 'ArchitectMaster2026!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'username' => 'zenith',
            'password' => 'ArchitectMaster2026!',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'username', 'role'],
            ]);

        $token = $loginResponse->json('token');
        $authHeaders = ['Authorization' => 'Bearer ' . $token];

        // -------------------------------------------------------------
        // Step 2: Owner creates a category
        // -------------------------------------------------------------
        $categoryResponse = $this->withHeaders($authHeaders)->postJson('/api/admin/categories', [
            'name' => 'Bespoke Sanctuaries',
            'slug' => 'bespoke-sanctuaries',
            'description' => 'Calibrated architectural sanctuaries crafted with natural stone and timber.',
            'display_order' => 1,
        ]);

        $categoryResponse->assertStatus(201)
            ->assertJsonPath('category.name', 'Bespoke Sanctuaries');

        $categoryId = $categoryResponse->json('category.id');
        $this->assertDatabaseHas('portfolio_categories', ['id' => $categoryId]);

        // -------------------------------------------------------------
        // Step 3: Owner uploads media
        // -------------------------------------------------------------
        $fakeImage1 = UploadedFile::fake()->image('courtyard_stone.webp', 1920, 1080);
        $fakeImage2 = UploadedFile::fake()->image('millwork_detail.webp', 1920, 1080);

        $uploadRes1 = $this->withHeaders($authHeaders)->post('/api/admin/media/upload', [
            'file' => $fakeImage1,
            'title' => 'Courtyard Stone Perspective',
            'category_id' => $categoryId,
        ]);
        $uploadRes1->assertStatus(201);
        $mediaId1 = $uploadRes1->json('media.id');

        $uploadRes2 = $this->withHeaders($authHeaders)->post('/api/admin/media/upload', [
            'file' => $fakeImage2,
            'title' => 'Calibrated Millwork Detail',
            'category_id' => $categoryId,
        ]);
        $uploadRes2->assertStatus(201);
        $mediaId2 = $uploadRes2->json('media.id');

        $this->assertDatabaseHas('media', ['id' => $mediaId1]);
        $this->assertDatabaseHas('media', ['id' => $mediaId2]);

        // -------------------------------------------------------------
        // Step 4: Owner creates a draft project
        // -------------------------------------------------------------
        $projectResponse = $this->withHeaders($authHeaders)->postJson('/api/admin/projects', [
            'title' => 'The Stone Pavilion',
            'category_id' => $categoryId,
            'location' => 'Jaipur, Rajasthan',
            'year' => 2026,
            'scale' => '6,500 sq.ft.',
            'description' => 'A serene residential sanctuary rooted in honest materiality and daylight.',
            'publishing_status' => 'draft',
        ]);

        $projectResponse->assertStatus(201)
            ->assertJsonPath('project.publishing_status', 'draft')
            ->assertJsonPath('project.is_published', false);

        $projectId = $projectResponse->json('project.id');
        $projectSlug = $projectResponse->json('project.slug');

        // -------------------------------------------------------------
        // Step 5: Owner adds and reorders gallery images
        // -------------------------------------------------------------
        $assignRes1 = $this->withHeaders($authHeaders)->postJson('/api/admin/media/assign', [
            'project_id' => $projectId,
            'media_id' => $mediaId1,
            'caption' => 'Central courtyard stone water feature',
            'display_order' => 1,
        ]);
        $assignRes1->assertStatus(201);

        $assignRes2 = $this->withHeaders($authHeaders)->postJson('/api/admin/media/assign', [
            'project_id' => $projectId,
            'media_id' => $mediaId2,
            'caption' => 'Concealed timber joinery detail',
            'display_order' => 2,
        ]);
        $assignRes2->assertStatus(201);

        $this->assertEquals(2, ProjectMedia::where('project_id', $projectId)->count());

        // Reorder gallery: swap order
        $reorderRes = $this->withHeaders($authHeaders)->postJson("/api/admin/projects/{$projectId}/media/reorder", [
            'ordered_ids' => [
                $assignRes2->json('assignment.id'),
                $assignRes1->json('assignment.id'),
            ],
        ]);
        $reorderRes->assertStatus(200);

        // -------------------------------------------------------------
        // Step 6: Owner previews draft, public cannot see, then publishes
        // -------------------------------------------------------------
        // Owner preview succeeds
        $previewRes = $this->withHeaders($authHeaders)->getJson("/api/admin/projects/{$projectId}/preview");
        $previewRes->assertStatus(200)
            ->assertJsonPath('project.title', 'The Stone Pavilion');

        // Public visitor cannot access draft project
        $publicDraftRes = $this->getJson("/api/projects/{$projectSlug}");
        $publicDraftRes->assertStatus(404);

        // Public project listing excludes draft
        $publicListBefore = $this->getJson('/api/projects');
        $publicListBefore->assertStatus(200);
        $this->assertFalse(collect($publicListBefore->json('projects'))->contains('slug', $projectSlug));

        // Owner publishes project
        $publishRes = $this->withHeaders($authHeaders)->patchJson("/api/admin/projects/{$projectId}/publish");
        $publishRes->assertStatus(200)
            ->assertJsonPath('project.publishing_status', 'published')
            ->assertJsonPath('project.is_published', true);

        // -------------------------------------------------------------
        // Step 7: Project appears correctly on public website
        // -------------------------------------------------------------
        $publicShowRes = $this->getJson("/api/projects/{$projectSlug}");
        $publicShowRes->assertStatus(200)
            ->assertJsonPath('project.title', 'The Stone Pavilion')
            ->assertJsonPath('project.is_published', true);

        $publicListAfter = $this->getJson('/api/projects');
        $publicListAfter->assertStatus(200);
        $this->assertTrue(collect($publicListAfter->json('projects'))->contains('slug', $projectSlug));

        // -------------------------------------------------------------
        // Step 8: Owner edits project narrative and archives it
        // -------------------------------------------------------------
        $editRes = $this->withHeaders($authHeaders)->putJson("/api/admin/projects/{$projectId}", [
            'title' => 'The Stone Pavilion — Phase II',
            'location' => 'Amer, Jaipur',
        ]);
        $editRes->assertStatus(200)
            ->assertJsonPath('project.title', 'The Stone Pavilion — Phase II');

        // Owner archives project
        $archiveRes = $this->withHeaders($authHeaders)->patchJson("/api/admin/projects/{$projectId}/archive");
        $archiveRes->assertStatus(200)
            ->assertJsonPath('project.publishing_status', 'archived')
            ->assertJsonPath('project.is_published', false);

        // Public access now returns 404 because project is archived
        $publicArchivedRes = $this->getJson("/api/projects/{$projectSlug}");
        $publicArchivedRes->assertStatus(404);

        // -------------------------------------------------------------
        // Step 9: A visitor submits an enquiry with confidential details
        // -------------------------------------------------------------
        $fakePdf = UploadedFile::fake()->create('client_concept_sketch.pdf', 300, 'application/pdf');

        $enquiryRes = $this->post('/api/enquiries', [
            'name' => 'Maharaja Siddharth',
            'email' => 'siddharth@heritage.in',
            'phone' => '+91 99999 12345',
            'project_type' => 'Heritage Villa Renovation',
            'location' => 'Jaipur',
            'budget' => '5 Crores',
            'timeline' => 'Immediate (Within 1 Month)',
            'message' => 'CONFIDENTIAL: Client personal vault and private suite requirements.',
            'originating_project_id' => $projectId,
            'source_page' => "/projects/{$projectSlug}",
            'attachment' => $fakePdf,
        ]);

        $enquiryRes->assertStatus(201);
        $enquiryId = $enquiryRes->json('enquiry_id');
        $refNumber = $enquiryRes->json('reference_number');

        $this->assertDatabaseHas('project_enquiries', [
            'id' => $enquiryId,
            'email' => 'siddharth@heritage.in',
            'status' => 'NEW',
        ]);

        // -------------------------------------------------------------
        // Step 10: Owner updates enquiry status with timestamped history
        // -------------------------------------------------------------
        $updateStatusRes = $this->withHeaders($authHeaders)->patchJson("/api/admin/enquiries/{$enquiryId}", [
            'status' => 'IN_DISCUSSION',
            'internal_notes' => 'PRIVATE: Initial site consultation scheduled for next Tuesday.',
        ]);

        $updateStatusRes->assertStatus(200)
            ->assertJsonPath('enquiry.status', 'IN_DISCUSSION');

        $enquiry = ProjectEnquiry::findOrFail($enquiryId);
        $this->assertCount(2, $enquiry->status_history);
        $this->assertEquals('IN_DISCUSSION', $enquiry->status_history[1]['status']);
        $this->assertEquals('Zenith Suthar', $enquiry->status_history[1]['actor']);

        // -------------------------------------------------------------
        // Step 11: Owner converts enquiry to a draft project
        // -------------------------------------------------------------
        $convertRes = $this->withHeaders($authHeaders)->postJson("/api/admin/enquiries/{$enquiryId}/convert-to-project", [
            'title' => 'Heritage Villa Sanctuary',
            'category_id' => $categoryId,
            'location' => 'Civil Lines, Jaipur',
            'description' => 'Carefully preserved heritage architecture balanced with modern daylight volumes.',
        ]);

        $convertRes->assertStatus(201)
            ->assertJsonPath('success', true);

        $convertedProjectId = $convertRes->json('project_id');
        $convertedProject = Project::findOrFail($convertedProjectId);

        // -------------------------------------------------------------
        // Step 12: Confirm strict privacy separation & draft state
        // -------------------------------------------------------------
        // 12a. Converted project must be strictly DRAFT and NOT published
        $this->assertEquals('draft', $convertedProject->publishing_status);
        $this->assertFalse($convertedProject->is_published);

        // 12b. Confidential enquiry data must NEVER leak onto the project
        $this->assertStringNotContainsString('CONFIDENTIAL', $convertedProject->description);
        $this->assertStringNotContainsString('5 Crores', $convertedProject->description);
        $this->assertStringNotContainsString('vault', $convertedProject->description);
        $this->assertStringNotContainsString('site consultation scheduled', $convertedProject->description);

        // 12c. Client profile was established without exposing private notes publicly
        $client = $convertedProject->client;
        $this->assertNotNull($client);
        $this->assertEquals('Maharaja Siddharth', $client->name);
        $this->assertEquals('siddharth@heritage.in', $client->email);

        // 12d. Enquiry is marked CONVERTED and links to the new project
        $this->assertEquals('CONVERTED', $enquiry->fresh()->status);
        $this->assertEquals($convertedProjectId, $enquiry->fresh()->converted_project_id);
    }

    /**
     * Verify that production SPA frontend index.html is served on GET / and client-side web routes.
     */
    public function test_production_frontend_spa_serving_and_route_handling(): void
    {
        // 1. Root route serves compiled index.html
        $rootResponse = $this->get('/');
        $rootResponse->assertStatus(200);
        $this->assertStringContainsString('STUDIO DESIRE', $rootResponse->getContent());
        $this->assertStringContainsString('id="root"', $rootResponse->getContent());

        // 2. Client-side deep link fallback serves index.html
        $fallbackResponse = $this->get('/projects');
        $fallbackResponse->assertStatus(200);
        $this->assertStringContainsString('STUDIO DESIRE', $fallbackResponse->getContent());

        // 3. API endpoints return JSON 404 for missing resources
        $api404Response = $this->getJson('/api/non-existent-endpoint');
        $api404Response->assertStatus(404);
    }

    /**
     * Verify that unauthorized visitors cannot access privileged owner endpoints.
     */
    public function test_unauthorized_access_to_owner_endpoints_is_strictly_prevented(): void
    {
        $guestEndpoints = [
            ['GET', '/api/admin/dashboard/stats'],
            ['GET', '/api/admin/projects'],
            ['POST', '/api/admin/projects'],
            ['GET', '/api/admin/media'],
            ['POST', '/api/admin/media/upload'],
            ['GET', '/api/admin/categories'],
            ['GET', '/api/admin/enquiries'],
            ['GET', '/api/admin/clients'],
            ['GET', '/api/admin/content'],
        ];

        foreach ($guestEndpoints as [$method, $endpoint]) {
            $response = $this->json($method, $endpoint);
            $this->assertEquals(401, $response->status(), "Endpoint {$method} {$endpoint} should reject unauthorized guest.");
        }
    }

    /**
     * Verify file upload validation prevents unauthorized or dangerous files.
     */
    public function test_file_upload_validation_rejects_dangerous_extensions(): void
    {
        $owner = User::create([
            'name' => 'Principal',
            'username' => 'principal2',
            'email' => 'principal2@studiodesire.com',
            'password' => 'SecureOwner2026!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $dangerousFile = UploadedFile::fake()->create('exploit.php', 10, 'application/x-php');

        $response = $this->actingAs($owner, 'sanctum')->post('/api/admin/media/upload', [
            'file' => $dangerousFile,
        ]);

        // Upload must be rejected
        $response->assertStatus(422);
    }
}
