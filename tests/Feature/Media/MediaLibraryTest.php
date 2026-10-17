<?php

namespace Tests\Feature\Media;

use App\Models\Media;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectMedia;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MediaLibraryTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected PortfolioCategory $category;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->owner = User::create([
            'name' => 'Studio Media Director',
            'username' => 'director',
            'email' => 'director@studiodesire.com',
            'password' => 'DirectPass123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $this->category = PortfolioCategory::create([
            'name' => 'Interior',
            'slug' => 'interior',
            'description' => 'Interior design',
            'display_order' => 1,
            'is_active' => true,
        ]);
    }

    public function test_owner_can_upload_valid_media_files(): void
    {
        Sanctum::actingAs($this->owner);

        $file1 = UploadedFile::fake()->image('courtyard_render.jpg', 1200, 800);
        $file2 = UploadedFile::fake()->image('detail_joinery.webp', 800, 600);

        $response = $this->postJson('/api/admin/media/upload', [
            'files' => [$file1, $file2],
            'media_type' => 'image',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('message', '2 file(s) uploaded successfully.')
            ->assertJsonCount(2, 'uploaded');

        $this->assertEquals(2, Media::count());

        $firstMedia = Media::first();
        $this->assertEquals('image', $firstMedia->media_type);
        $this->assertNotEmpty($firstMedia->url);
        $this->assertStringContainsString('courtyard-render', $firstMedia->filename);
    }

    public function test_upload_strictly_rejects_dangerous_executable_extensions(): void
    {
        Sanctum::actingAs($this->owner);

        $phpFile = UploadedFile::fake()->create('malicious.php', 100);
        $exeFile = UploadedFile::fake()->create('exploit.exe', 100);

        $response = $this->postJson('/api/admin/media/upload', [
            'files' => [$phpFile, $exeFile],
        ]);

        $response->assertStatus(422)
            ->assertJsonCount(2, 'errors');

        $this->assertEquals(0, Media::count());
    }

    public function test_media_can_be_reused_across_multiple_projects_without_duplicating_files(): void
    {
        Sanctum::actingAs($this->owner);

        $projectA = Project::create([
            'title' => 'Project Alpha',
            'category_id' => $this->category->id,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $projectB = Project::create([
            'title' => 'Project Beta',
            'category_id' => $this->category->id,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        // Single media record in library
        $sharedMedia = Media::create([
            'filename' => 'reusable_sculptural_stone.jpg',
            'original_name' => 'stone.jpg',
            'url' => 'https://example.com/stone.jpg',
            'media_type' => 'image',
            'mime_type' => 'image/jpeg',
            'file_size' => 2048,
            'is_public' => true,
        ]);

        // Assign to Project A with custom caption A
        $assignAResponse = $this->postJson('/api/admin/media/assign', [
            'media_id' => $sharedMedia->id,
            'project_id' => $projectA->id,
            'caption' => 'Project Alpha Main Feature Wall',
        ]);
        $assignAResponse->assertStatus(201);

        // Assign to Project B with custom caption B
        $assignBResponse = $this->postJson('/api/admin/media/assign', [
            'media_id' => $sharedMedia->id,
            'project_id' => $projectB->id,
            'caption' => 'Project Beta Material Palette Reference',
        ]);
        $assignBResponse->assertStatus(201);

        // Exactly one media file record exists in database
        $this->assertEquals(1, Media::count());

        // But two independent project assignments exist
        $this->assertEquals(2, ProjectMedia::where('media_id', $sharedMedia->id)->count());

        $this->assertEquals(
            'Project Alpha Main Feature Wall',
            ProjectMedia::where('project_id', $projectA->id)->first()->caption
        );

        $this->assertEquals(
            'Project Beta Material Palette Reference',
            ProjectMedia::where('project_id', $projectB->id)->first()->caption
        );
    }

    public function test_unassigning_media_from_project_preserves_shared_library_record(): void
    {
        Sanctum::actingAs($this->owner);

        $project = Project::create([
            'title' => 'Terrace Space',
            'category_id' => $this->category->id,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        $media = Media::create([
            'filename' => 'planter.jpg',
            'original_name' => 'planter.jpg',
            'url' => 'https://example.com/planter.jpg',
            'media_type' => 'image',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
            'is_public' => true,
        ]);

        $assignment = ProjectMedia::create([
            'project_id' => $project->id,
            'media_id' => $media->id,
            'url' => $media->url,
            'sort_order' => 1,
            'is_published' => true,
        ]);

        $response = $this->deleteJson("/api/admin/projects/media/{$assignment->id}");
        $response->assertStatus(200);

        // Assignment was deleted
        $this->assertDatabaseMissing('project_media', ['id' => $assignment->id]);

        // Shared media file is preserved in library
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_cannot_delete_media_record_while_in_use_by_projects(): void
    {
        Sanctum::actingAs($this->owner);

        $project = Project::create([
            'title' => 'Active Space',
            'category_id' => $this->category->id,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $media = Media::create([
            'filename' => 'active_in_use.jpg',
            'original_name' => 'in_use.jpg',
            'url' => 'https://example.com/in_use.jpg',
            'media_type' => 'image',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
            'is_public' => true,
        ]);

        ProjectMedia::create([
            'project_id' => $project->id,
            'media_id' => $media->id,
            'url' => $media->url,
            'sort_order' => 1,
            'is_published' => true,
        ]);

        $response = $this->deleteJson("/api/admin/media/{$media->id}");
        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Cannot delete media asset because it is currently assigned to 1 project(s). Please unassign it first.']);

        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_owner_can_reorder_project_gallery_items(): void
    {
        Sanctum::actingAs($this->owner);

        $project = Project::create([
            'title' => 'Gallery Reorder Space',
            'category_id' => $this->category->id,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        $pm1 = ProjectMedia::create([
            'project_id' => $project->id,
            'url' => 'https://example.com/1.jpg',
            'sort_order' => 1,
            'is_published' => true,
        ]);

        $pm2 = ProjectMedia::create([
            'project_id' => $project->id,
            'url' => 'https://example.com/2.jpg',
            'sort_order' => 2,
            'is_published' => true,
        ]);

        $pm3 = ProjectMedia::create([
            'project_id' => $project->id,
            'url' => 'https://example.com/3.jpg',
            'sort_order' => 3,
            'is_published' => true,
        ]);

        // Drag-and-drop inverted order: 3, 1, 2
        $response = $this->postJson("/api/admin/projects/{$project->id}/media/reorder", [
            'ordered_ids' => [$pm3->id, $pm1->id, $pm2->id],
        ]);

        $response->assertStatus(200);

        $this->assertEquals(1, $pm3->fresh()->sort_order);
        $this->assertEquals(2, $pm1->fresh()->sort_order);
        $this->assertEquals(3, $pm2->fresh()->sort_order);
    }

    public function test_owner_can_create_new_draft_project_from_selected_media(): void
    {
        Sanctum::actingAs($this->owner);

        $m1 = Media::create([
            'filename' => 'select_1.jpg',
            'original_name' => '1.jpg',
            'url' => 'https://example.com/select_1.jpg',
            'media_type' => 'image',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
            'is_public' => true,
        ]);

        $m2 = Media::create([
            'filename' => 'select_2.jpg',
            'original_name' => '2.jpg',
            'url' => 'https://example.com/select_2.jpg',
            'media_type' => 'image',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
            'is_public' => true,
        ]);

        $response = $this->postJson('/api/admin/media/create-project-from-selection', [
            'media_ids' => [$m1->id, $m2->id],
            'title' => 'Selected Curated Space',
            'category_id' => $this->category->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('project.title', 'Selected Curated Space')
            ->assertJsonPath('project.publishing_status', 'draft')
            ->assertJsonPath('project.cover_image', 'https://example.com/select_1.jpg')
            ->assertJsonCount(2, 'project.media');

        $this->assertDatabaseHas('projects', [
            'title' => 'Selected Curated Space',
            'publishing_status' => 'draft',
        ]);
    }
}
