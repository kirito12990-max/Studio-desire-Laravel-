<?php

namespace Tests\Feature\Project;

use App\Models\Client;
use App\Models\Media;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectMedia;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectManagerTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected PortfolioCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::create([
            'name' => 'Studio Principal',
            'username' => 'principal',
            'email' => 'principal@studiodesire.com',
            'password' => 'SecurePass123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $this->category = PortfolioCategory::create([
            'name' => 'Architecture',
            'slug' => 'architecture',
            'description' => 'Architectural spaces',
            'display_order' => 1,
            'is_active' => true,
        ]);
    }

    public function test_owner_can_list_and_search_projects(): void
    {
        Sanctum::actingAs($this->owner);

        Project::create([
            'title' => 'The Desert Pavilion',
            'category_id' => $this->category->id,
            'location' => 'Jodhpur',
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        Project::create([
            'title' => 'Coastal Sanctuary',
            'category_id' => $this->category->id,
            'location' => 'Goa',
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        $response = $this->getJson('/api/admin/projects');
        $response->assertStatus(200)
            ->assertJsonPath('total', 2);

        // Search by query
        $searchResponse = $this->getJson('/api/admin/projects?q=Pavilion');
        $searchResponse->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('projects.0.title', 'The Desert Pavilion');

        // Filter by status
        $statusResponse = $this->getJson('/api/admin/projects?status=draft');
        $statusResponse->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('projects.0.title', 'Coastal Sanctuary');
    }

    public function test_owner_can_create_project_as_draft_without_requiring_optional_fields(): void
    {
        Sanctum::actingAs($this->owner);

        // Draft creation requires only title and category
        $response = $this->postJson('/api/admin/projects', [
            'title' => 'Minimal Draft Project',
            'category_id' => $this->category->id,
            'publishing_status' => 'draft',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('project.title', 'Minimal Draft Project')
            ->assertJsonPath('project.slug', 'minimal-draft-project')
            ->assertJsonPath('project.publishing_status', 'draft')
            ->assertJsonPath('project.is_published', false);

        $this->assertDatabaseHas('projects', [
            'title' => 'Minimal Draft Project',
            'slug' => 'minimal-draft-project',
            'is_published' => false,
        ]);
    }

    public function test_publishing_validates_required_fields(): void
    {
        Sanctum::actingAs($this->owner);

        // Saving directly as published without cover image fails
        $response = $this->postJson('/api/admin/projects', [
            'title' => 'Incomplete Published Attempt',
            'category_id' => $this->category->id,
            'publishing_status' => 'published',
            'cover_image' => null,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cover_image']);
    }

    public function test_owner_can_publish_and_archive_project(): void
    {
        Sanctum::actingAs($this->owner);

        $project = Project::create([
            'title' => 'Urban Penthouse',
            'category_id' => $this->category->id,
            'location' => 'Mumbai',
            'cover_image' => 'https://example.com/cover.jpg',
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        // Publish
        $publishResponse = $this->patchJson("/api/admin/projects/{$project->id}/publish");
        $publishResponse->assertStatus(200)
            ->assertJsonPath('project.publishing_status', 'published')
            ->assertJsonPath('project.is_published', true);

        $this->assertTrue($project->fresh()->is_published);

        // Archive
        $archiveResponse = $this->patchJson("/api/admin/projects/{$project->id}/archive");
        $archiveResponse->assertStatus(200)
            ->assertJsonPath('project.publishing_status', 'archived')
            ->assertJsonPath('project.is_published', false);

        $this->assertFalse($project->fresh()->is_published);
        $this->assertEquals('archived', $project->fresh()->publishing_status);
    }

    public function test_owner_can_duplicate_project_as_draft_reusing_media(): void
    {
        Sanctum::actingAs($this->owner);

        $project = Project::create([
            'title' => 'Pavilion Alpha',
            'category_id' => $this->category->id,
            'location' => 'Jaipur',
            'cover_image' => 'https://example.com/alpha.jpg',
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $media = Media::create([
            'filename' => 'alpha_plate_1.jpg',
            'original_name' => 'plate_1.jpg',
            'url' => 'https://example.com/alpha_plate_1.jpg',
            'media_type' => 'image',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
            'is_public' => true,
        ]);

        ProjectMedia::create([
            'project_id' => $project->id,
            'media_id' => $media->id,
            'url' => $media->url,
            'caption' => 'Main courtyard perspective',
            'sort_order' => 1,
            'is_published' => true,
        ]);

        $response = $this->postJson("/api/admin/projects/{$project->id}/duplicate");
        $response->assertStatus(201)
            ->assertJsonPath('project.title', 'Pavilion Alpha (Copy)')
            ->assertJsonPath('project.slug', 'pavilion-alpha-copy')
            ->assertJsonPath('project.publishing_status', 'draft')
            ->assertJsonPath('project.is_published', false);

        // Verify media assignments were cloned pointing to same underlying media record
        $this->assertEquals(2, ProjectMedia::where('media_id', $media->id)->count());
        $this->assertEquals(1, Media::count()); // No duplicate file record created!
    }

    public function test_owner_can_safely_delete_project_preserving_shared_media_and_client(): void
    {
        Sanctum::actingAs($this->owner);

        $client = Client::create([
            'name' => 'Acme Heritage Trust',
            'email' => 'trust@acme.org',
            'phone' => '+91 9876543210',
        ]);

        $project = Project::create([
            'title' => 'Heritage Restoration',
            'category_id' => $this->category->id,
            'client_id' => $client->id,
            'location' => 'Jaipur',
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $media = Media::create([
            'filename' => 'facade.jpg',
            'original_name' => 'facade.jpg',
            'url' => 'https://example.com/facade.jpg',
            'media_type' => 'image',
            'mime_type' => 'image/jpeg',
            'file_size' => 2048,
            'is_public' => true,
        ]);

        ProjectMedia::create([
            'project_id' => $project->id,
            'media_id' => $media->id,
            'url' => $media->url,
            'sort_order' => 1,
            'is_published' => true,
        ]);

        $deleteResponse = $this->deleteJson("/api/admin/projects/{$project->id}");
        $deleteResponse->assertStatus(200);

        // Project was removed
        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('project_media', ['project_id' => $project->id]);

        // Client and shared Media are completely preserved
        $this->assertDatabaseHas('clients', ['id' => $client->id]);
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_authenticated_owner_can_preview_draft_project_while_anonymous_is_rejected(): void
    {
        $project = Project::create([
            'title' => 'Secret Concept Draft',
            'category_id' => $this->category->id,
            'location' => 'Confidential',
            'cover_image' => 'https://example.com/secret.jpg',
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        // Anonymous preview request is rejected
        $anonResponse = $this->getJson("/api/admin/projects/{$project->id}/preview");
        $anonResponse->assertStatus(401);

        // Authenticated owner can preview draft layout
        Sanctum::actingAs($this->owner);
        $ownerResponse = $this->getJson("/api/admin/projects/{$project->id}/preview");
        $ownerResponse->assertStatus(200)
            ->assertJsonPath('preview_mode', true)
            ->assertJsonPath('title', 'Secret Concept Draft')
            ->assertJsonPath('publishing_status', 'draft');
    }
}
