<?php

namespace Tests\Feature\Media;

use App\Models\EnquiryAttachment;
use App\Models\FeaturedItem;
use App\Models\Media;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use App\Models\ProjectMedia;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase3MediaSecurityAndIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected PortfolioCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::fake('local');

        $this->owner = User::factory()->create([
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $this->category = PortfolioCategory::create([
            'name' => 'Architecture',
            'slug' => 'architecture',
            'is_active' => true,
        ]);
    }

    /**
     * Helper to create a valid small 100x100 PNG image binary using GD.
     */
    protected function createValidPng(int $width = 100, int $height = 100): UploadedFile
    {
        $image = imagecreatetruecolor($width, $height);
        $bg = imagecolorallocate($image, 212, 175, 55); // #d4af37 gold
        imagefill($image, 0, 0, $bg);

        $tempPath = tempnam(sys_get_temp_dir(), 'test_img_') . '.png';
        imagepng($image, $tempPath);
        imagedestroy($image);

        return new UploadedFile($tempPath, 'valid_space.png', 'image/png', null, true);
    }

    // =========================================================================
    // 1. SECURE IMAGE UPLOADS
    // =========================================================================

    public function test_valid_image_upload_succeeds_and_generates_thumbnail(): void
    {
        Sanctum::actingAs($this->owner);

        $file = $this->createValidPng(200, 150);

        $response = $this->postJson('/api/admin/media/upload', [
            'file' => $file,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'uploaded' => [
                    '*' => ['id', 'url', 'thumbnail_url', 'filename', 'original_name', 'media_type', 'dimensions'],
                ],
            ]);

        $media = Media::first();
        $this->assertNotNull($media);
        $this->assertEquals('image', $media->media_type);
        $this->assertEquals('image/png', $media->mime_type);
        $this->assertEquals('200x150', $media->dimensions);
        $this->assertStringStartsWith('/storage/media/', $media->url);
        $this->assertNotNull($media->thumbnail_url);
    }

    public function test_rejects_disguised_executable_or_text_file_with_image_extension(): void
    {
        Sanctum::actingAs($this->owner);

        // Disguised file: text/script pretending to be a JPG
        $fakeJpg = UploadedFile::fake()->createWithContent('malicious.jpg', "<?php echo 'pwned'; ?>");

        $response = $this->postJson('/api/admin/media/upload', [
            'file' => $fakeJpg,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.0.file', 'malicious.jpg');

        $this->assertEquals(0, Media::count());
    }

    public function test_rejects_forbidden_dangerous_file_extensions(): void
    {
        Sanctum::actingAs($this->owner);

        foreach (['shell.php', 'script.sh', 'payload.exe', 'macro.vbs', 'evil.bat'] as $dangerousName) {
            $file = UploadedFile::fake()->create($dangerousName, 50);
            $response = $this->postJson('/api/admin/media/upload', [
                'file' => $file,
            ]);

            $response->assertStatus(422);
            $this->assertStringContainsString('prohibited for security', $response->json('errors.0.error'));
        }

        $this->assertEquals(0, Media::count());
    }

    public function test_rejects_oversized_images(): void
    {
        Sanctum::actingAs($this->owner);

        // 16MB image exceeds the 15MB limit
        $oversized = UploadedFile::fake()->image('huge.jpg')->size(16 * 1024);

        $response = $this->postJson('/api/admin/media/upload', [
            'file' => $oversized,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('exceeds maximum allowed size', $response->json('errors.0.error'));
    }

    public function test_rejects_decompression_bomb_extreme_dimensions(): void
    {
        Sanctum::actingAs($this->owner);

        // Create an image with dimensions exceeding safe bounds
        $hugeImg = $this->createValidPng(8500, 100);

        $response = $this->postJson('/api/admin/media/upload', [
            'file' => $hugeImg,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('exceed safe limits', $response->json('errors.0.error'));
    }

    // =========================================================================
    // 2. IN-USE MEDIA PROTECTION
    // =========================================================================

    public function test_cannot_delete_media_used_as_project_cover_image(): void
    {
        Sanctum::actingAs($this->owner);

        $media = Media::create([
            'filename' => 'facade.jpg',
            'original_name' => 'facade.jpg',
            'url' => '/storage/media/2026/10/facade.jpg',
            'mime_type' => 'image/jpeg',
            'media_type' => 'image',
            'file_size' => 1024,
            'is_public' => true,
        ]);

        $project = Project::create([
            'title' => 'Cover Protection Villa',
            'category_id' => $this->category->id,
            'cover_image' => $media->url,
            'cover_media_id' => $media->id,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $response = $this->deleteJson("/api/admin/media/{$media->id}");

        $response->assertStatus(422)
            ->assertJsonPath('in_use', true)
            ->assertJsonPath('references.0', 'used as cover image in 1 project(s)');

        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_cannot_delete_media_used_in_homepage_featured_slider(): void
    {
        Sanctum::actingAs($this->owner);

        $media = Media::create([
            'filename' => 'slider_hero.jpg',
            'original_name' => 'slider_hero.jpg',
            'url' => '/storage/media/2026/10/slider_hero.jpg',
            'mime_type' => 'image/jpeg',
            'media_type' => 'image',
            'file_size' => 2048,
            'is_public' => true,
        ]);

        $project = Project::create([
            'title' => 'Slider Villa',
            'category_id' => $this->category->id,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        FeaturedItem::create([
            'project_id' => $project->id,
            'title_override' => 'Slider Title',
            'image_override' => $media->url,
            'display_order' => 1,
            'is_active' => true,
        ]);

        $response = $this->deleteJson("/api/admin/media/{$media->id}");

        $response->assertStatus(422)
            ->assertJsonPath('in_use', true)
            ->assertJsonPath('references.0', 'active in 1 featured slider item(s)');

        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_cannot_delete_media_used_as_category_cover(): void
    {
        Sanctum::actingAs($this->owner);

        $media = Media::create([
            'filename' => 'category_cover.jpg',
            'original_name' => 'category_cover.jpg',
            'url' => '/storage/media/2026/10/category_cover.jpg',
            'mime_type' => 'image/jpeg',
            'media_type' => 'image',
            'file_size' => 2048,
            'is_public' => true,
        ]);

        $this->category->cover_image = $media->url;
        $this->category->save();

        $response = $this->deleteJson("/api/admin/media/{$media->id}");

        $response->assertStatus(422)
            ->assertJsonPath('in_use', true)
            ->assertJsonPath('references.0', 'used as cover image in 1 portfolio category/categories');

        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_can_safely_delete_unreferenced_media_and_purges_storage(): void
    {
        Sanctum::actingAs($this->owner);

        Storage::disk('public')->put('media/2026/10/unused_test.jpg', 'content');
        Storage::disk('public')->put('thumbnails/2026/10/thumb_unused.webp', 'thumb');

        $media = Media::create([
            'filename' => 'unused_test.jpg',
            'original_name' => 'unused_test.jpg',
            'url' => '/storage/media/2026/10/unused_test.jpg',
            'thumbnail_url' => '/storage/thumbnails/2026/10/thumb_unused.webp',
            'mime_type' => 'image/jpeg',
            'media_type' => 'image',
            'file_size' => 1024,
            'is_public' => true,
        ]);

        $response = $this->deleteJson("/api/admin/media/{$media->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('media', ['id' => $media->id]);
        $this->assertFalse(Storage::disk('public')->exists('media/2026/10/unused_test.jpg'));
        $this->assertFalse(Storage::disk('public')->exists('thumbnails/2026/10/thumb_unused.webp'));
    }

    // =========================================================================
    // 3. PUBLISHING STATUS SINGLE SOURCE OF TRUTH
    // =========================================================================

    public function test_publishing_status_is_canonical_and_public_queries_only_show_published(): void
    {
        $published = Project::create([
            'title' => 'Canonical Published Project',
            'category_id' => $this->category->id,
            'cover_image' => '/storage/media/published.jpg',
            'publishing_status' => 'published',
        ]);

        $draft = Project::create([
            'title' => 'Canonical Draft Project',
            'category_id' => $this->category->id,
            'cover_image' => '/storage/media/draft.jpg',
            'publishing_status' => 'draft',
        ]);

        $archived = Project::create([
            'title' => 'Canonical Archived Project',
            'category_id' => $this->category->id,
            'cover_image' => '/storage/media/archived.jpg',
            'publishing_status' => 'archived',
        ]);

        // Model casts / accessors
        $this->assertTrue($published->is_published);
        $this->assertFalse($draft->is_published);
        $this->assertFalse($archived->is_published);

        // Public index query only returns published
        $res = $this->getJson('/api/projects');
        $res->assertStatus(200);
        $ids = collect($res->json('projects'))->pluck('id')->toArray();

        $this->assertContains($published->id, $ids);
        $this->assertNotContains($draft->id, $ids);
        $this->assertNotContains($archived->id, $ids);

        // Public show query hides draft and archived
        $this->getJson("/api/projects/{$draft->slug}")->assertStatus(404);
        $this->getJson("/api/projects/{$archived->slug}")->assertStatus(404);
        $this->getJson("/api/projects/{$published->slug}")->assertStatus(200);
    }

    // =========================================================================
    // 4. PROJECT & CATEGORY VALIDATION
    // =========================================================================

    public function test_project_handles_year_null_without_500_error(): void
    {
        Sanctum::actingAs($this->owner);

        $res = $this->postJson('/api/admin/projects', [
            'title' => 'Villa with Null Year',
            'category_id' => $this->category->id,
            'year' => null,
            'publishing_status' => 'draft',
        ]);

        $res->assertStatus(201);
        $project = Project::find($res->json('project.id'));
        $this->assertNull($project->year);

        // Update with null year
        $updateRes = $this->putJson("/api/admin/projects/{$project->id}", [
            'year' => null,
        ]);
        $updateRes->assertStatus(200);
        $this->assertNull($project->fresh()->year);
    }

    public function test_validates_custom_slug_uniqueness_and_normalizes_slug(): void
    {
        Sanctum::actingAs($this->owner);

        // Create first project
        $p1 = Project::create([
            'title' => 'Project Alpha',
            'slug' => 'custom-unique-slug',
            'category_id' => $this->category->id,
            'publishing_status' => 'draft',
        ]);

        // Trying to create another project with same custom slug fails with 422
        $res = $this->postJson('/api/admin/projects', [
            'title' => 'Project Beta',
            'slug' => 'custom-unique-slug',
            'category_id' => $this->category->id,
            'publishing_status' => 'draft',
        ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['slug']);

        // Normalizes spaces and symbols safely
        $resNorm = $this->postJson('/api/admin/projects', [
            'title' => 'Project Gamma',
            'slug' => 'Custom Slug With Spaces & Symbols!',
            'category_id' => $this->category->id,
            'publishing_status' => 'draft',
        ]);

        $resNorm->assertStatus(201);
        $this->assertEquals('custom-slug-with-spaces-symbols', $resNorm->json('project.slug'));
    }

    public function test_category_reassign_and_delete_succeeds_without_different_id_bug(): void
    {
        Sanctum::actingAs($this->owner);

        $targetCategory = PortfolioCategory::create([
            'name' => 'Commercial',
            'slug' => 'commercial',
            'is_active' => true,
        ]);

        // Project assigned to source category
        $project = Project::create([
            'title' => 'Project in Source Category',
            'category_id' => $this->category->id,
            'category' => $this->category->name,
            'publishing_status' => 'draft',
        ]);

        // Attempting to delete category with projects without target fails with 422
        $delFail = $this->deleteJson("/api/admin/categories/{$this->category->id}");
        $delFail->assertStatus(422);

        // Attempting to reassign to self fails with 422
        $selfFail = $this->postJson("/api/admin/categories/{$this->category->id}/reassign-and-delete", [
            'target_category_id' => $this->category->id,
        ]);
        $selfFail->assertStatus(422);

        // Successful reassignment and deletion
        $success = $this->postJson("/api/admin/categories/{$this->category->id}/reassign-and-delete", [
            'target_category_id' => $targetCategory->id,
        ]);

        $success->assertStatus(200);
        $this->assertDatabaseMissing('portfolio_categories', ['id' => $this->category->id]);
        $this->assertEquals($targetCategory->id, $project->fresh()->category_id);
        $this->assertEquals('Commercial', $project->fresh()->category);
    }

    public function test_category_index_returns_both_total_projects_and_total_projects_count(): void
    {
        Sanctum::actingAs($this->owner);

        Project::create([
            'title' => 'Project 1',
            'category_id' => $this->category->id,
            'publishing_status' => 'published',
            'cover_image' => '/storage/cover.jpg',
        ]);

        Project::create([
            'title' => 'Project 2',
            'category_id' => $this->category->id,
            'publishing_status' => 'draft',
        ]);

        $res = $this->getJson('/api/admin/categories');
        $res->assertStatus(200);

        $cat = collect($res->json('categories'))->firstWhere('id', $this->category->id);
        $this->assertNotNull($cat);
        $this->assertEquals(2, $cat['total_projects']);
        $this->assertEquals(2, $cat['total_projects_count']);
        $this->assertEquals(1, $cat['published_projects']);
        $this->assertEquals(1, $cat['published_projects_count']);
        $this->assertEquals(1, $cat['draft_projects']);
        $this->assertEquals(1, $cat['draft_projects_count']);
    }

    // =========================================================================
    // 5. ENQUIRY ATTACHMENT CLEANUP
    // =========================================================================

    public function test_enquiry_deletion_purges_unreferenced_private_attachment_files(): void
    {
        Sanctum::actingAs($this->owner);

        $filePath = 'private_attachments/2026/10/confidential_floorplan.pdf';
        Storage::disk('local')->put($filePath, 'PDF CONTENT');

        $enquiry = ProjectEnquiry::create([
            'name' => 'Client With File',
            'email' => 'fileclient@example.com',
            'message' => 'Need architectural plan.',
            'reference_number' => 'SD-20261018-0999',
            'status' => 'NEW',
        ]);

        $attachment = EnquiryAttachment::create([
            'enquiry_id' => $enquiry->id,
            'filename' => 'floorplan_hash.pdf',
            'original_filename' => 'floorplan.pdf',
            'storage_path' => $filePath,
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
        ]);

        $this->assertTrue(Storage::disk('local')->exists($filePath));

        // Delete enquiry
        $res = $this->deleteJson("/api/admin/enquiries/{$enquiry->id}");
        $res->assertStatus(200);

        $this->assertDatabaseMissing('project_enquiries', ['id' => $enquiry->id]);
        $this->assertDatabaseMissing('enquiry_attachments', ['id' => $attachment->id]);
        $this->assertFalse(Storage::disk('local')->exists($filePath));
    }

    public function test_enquiry_deletion_retains_shared_attachment_if_referenced_elsewhere(): void
    {
        Sanctum::actingAs($this->owner);

        $sharedPath = 'private_attachments/2026/10/shared_drawing.pdf';
        Storage::disk('local')->put($sharedPath, 'SHARED PDF CONTENT');

        $e1 = ProjectEnquiry::create([
            'name' => 'Client 1',
            'email' => 'c1@example.com',
            'message' => 'First client message.',
            'reference_number' => 'SD-20261018-1001',
            'status' => 'NEW',
        ]);

        $e2 = ProjectEnquiry::create([
            'name' => 'Client 2',
            'email' => 'c2@example.com',
            'message' => 'Second client message.',
            'reference_number' => 'SD-20261018-1002',
            'status' => 'NEW',
        ]);

        EnquiryAttachment::create([
            'enquiry_id' => $e1->id,
            'filename' => 'shared_hash_1.pdf',
            'original_filename' => 'shared.pdf',
            'storage_path' => $sharedPath,
            'mime_type' => 'application/pdf',
            'file_size' => 2048,
        ]);

        $att2 = EnquiryAttachment::create([
            'enquiry_id' => $e2->id,
            'filename' => 'shared_hash_2.pdf',
            'original_filename' => 'shared.pdf',
            'storage_path' => $sharedPath,
            'mime_type' => 'application/pdf',
            'file_size' => 2048,
        ]);

        // Delete e1 only
        $res = $this->deleteJson("/api/admin/enquiries/{$e1->id}");
        $res->assertStatus(200);

        // Physical file must be retained because e2's attachment still references it
        $this->assertTrue(Storage::disk('local')->exists($sharedPath));
        $this->assertDatabaseHas('enquiry_attachments', ['id' => $att2->id]);
    }

    // =========================================================================
    // 6. API TOKEN EXPIRY & PRUNING
    // =========================================================================

    public function test_login_prunes_stale_tokens_and_enforces_expiration(): void
    {
        $password = 'Secret123!';
        $user = User::factory()->create([
            'username' => 'tokenuser',
            'password' => bcrypt($password),
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        // Pre-create old tokens
        $user->createToken('owner-session');
        $user->createToken('owner-session');
        $this->assertEquals(2, $user->tokens()->where('name', 'owner-session')->count());

        // Login
        $res = $this->postJson('/api/auth/login', [
            'username' => 'tokenuser',
            'password' => $password,
        ]);

        $res->assertStatus(200)
            ->assertJsonStructure(['token', 'user']);

        // Pruned down to 1 active token with expiration
        $tokens = $user->fresh()->tokens()->where('name', 'owner-session')->get();
        $this->assertCount(1, $tokens);
        $activeToken = $tokens->first();
        $this->assertNotNull($activeToken->expires_at);
        $this->assertTrue($activeToken->expires_at->isFuture());
    }
}
