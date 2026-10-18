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
use Tests\TestCase;

class MediaUrlCanonicalizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_uploaded_media_stores_canonical_relative_path_not_localhost(): void
    {
        $owner = User::factory()->create([
            'role' => 'owner',
        ]);

        $fakeImage = UploadedFile::fake()->image('architectural-elevation.jpg', 1200, 800);

        $response = $this->actingAs($owner, 'sanctum')->post('/api/admin/media/upload', [
            'file' => $fakeImage,
            'title' => 'Main Elevation',
            'alt_text' => 'Bespoke elevation visualization',
        ]);

        $response->assertStatus(201);
        $data = $response->json('media');

        // URL must be canonical relative path
        $this->assertStringStartsWith('/storage/media/', $data['url']);
        $this->assertStringNotContainsString('http://127.0.0.1', $data['url']);
        $this->assertStringNotContainsString('http://localhost', $data['url']);

        // Verify in database
        $this->assertDatabaseHas('media', [
            'original_name' => 'architectural-elevation.jpg',
            'url' => $data['url'],
        ]);
    }

    public function test_project_model_strips_localhost_origins_from_legacy_cover_image(): void
    {
        $category = PortfolioCategory::create([
            'name' => 'Commercial',
            'slug' => 'commercial',
        ]);

        $project = Project::create([
            'title' => 'Legacy Localhost Project',
            'slug' => 'legacy-localhost-project',
            'category_id' => $category->id,
            'cover_image' => 'http://127.0.0.1:8080/storage/media/test-cover.webp',
        ]);

        $this->assertEquals('/storage/media/test-cover.webp', $project->cover_image);

        $projectLocalhost = Project::create([
            'title' => 'Legacy Localhost Port 8000',
            'slug' => 'legacy-localhost-8000',
            'category_id' => $category->id,
            'cover_image' => 'http://localhost:8000/uploads/projects/test.webp',
        ]);

        $this->assertEquals('/uploads/projects/test.webp', $projectLocalhost->cover_image);
    }

    public function test_project_resolves_cover_image_via_cover_media_id_foreign_key(): void
    {
        $category = PortfolioCategory::create([
            'name' => 'Bespoke Villas',
            'slug' => 'bespoke-villas',
        ]);

        $media = Media::create([
            'filename' => 'bespoke-villa-cover.webp',
            'original_name' => 'villa-facade.webp',
            'url' => '/storage/media/bespoke-villa-cover.webp',
            'media_type' => 'image',
            'mime_type' => 'image/webp',
            'file_size' => 102400,
        ]);

        $project = Project::create([
            'title' => 'Villa Aashiyana',
            'slug' => 'villa-aashiyana',
            'category_id' => $category->id,
            'cover_image' => null,
            'cover_media_id' => $media->id,
        ]);

        $project->load('coverMedia');
        $this->assertEquals('/storage/media/bespoke-villa-cover.webp', $project->cover_image);
    }

    public function test_project_media_normalizes_stored_urls(): void
    {
        $category = PortfolioCategory::create([
            'name' => 'Hospitality',
            'slug' => 'hospitality',
        ]);

        $project = Project::create([
            'title' => 'Boutique Hotel',
            'slug' => 'boutique-hotel',
            'category_id' => $category->id,
        ]);

        $projectMedia = ProjectMedia::create([
            'project_id' => $project->id,
            'url' => 'http://127.0.0.1:8080/storage/media/hotel-lobby.webp',
            'thumbnail_url' => 'http://localhost:8080/storage/media/hotel-lobby-thumb.webp',
            'media_type' => 'image',
        ]);

        $this->assertEquals('/storage/media/hotel-lobby.webp', $projectMedia->url);
        $this->assertEquals('/storage/media/hotel-lobby-thumb.webp', $projectMedia->thumbnail_url);
    }
}
