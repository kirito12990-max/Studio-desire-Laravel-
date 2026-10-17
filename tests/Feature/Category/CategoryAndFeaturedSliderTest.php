<?php

namespace Tests\Feature\Category;

use App\Models\FeaturedItem;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoryAndFeaturedSliderTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::create([
            'name' => 'Studio Design Lead',
            'username' => 'designlead',
            'email' => 'lead@studiodesire.com',
            'password' => 'DesignLead123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);
    }

    public function test_owner_can_list_and_create_categories_with_project_counts(): void
    {
        Sanctum::actingAs($this->owner);

        $cat = PortfolioCategory::create([
            'name' => 'Landscape',
            'slug' => 'landscape',
            'description' => 'Landscape Architecture',
            'display_order' => 1,
            'is_active' => true,
        ]);

        Project::create([
            'title' => 'Botanical Pavilions',
            'category_id' => $cat->id,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        Project::create([
            'title' => 'Courtyard Study',
            'category_id' => $cat->id,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        $response = $this->getJson('/api/admin/categories');
        $response->assertStatus(200)
            ->assertJsonPath('categories.0.name', 'Landscape')
            ->assertJsonPath('categories.0.total_projects', 2)
            ->assertJsonPath('categories.0.published_projects', 1)
            ->assertJsonPath('categories.0.draft_projects', 1);

        // Create new category
        $createResponse = $this->postJson('/api/admin/categories', [
            'name' => 'Hospitality',
            'description' => 'Boutique hotels & cafes',
        ]);
        $createResponse->assertStatus(201)
            ->assertJsonPath('category.slug', 'hospitality');
    }

    public function test_deleting_category_with_projects_is_blocked(): void
    {
        Sanctum::actingAs($this->owner);

        $cat = PortfolioCategory::create([
            'name' => 'Retail',
            'slug' => 'retail',
        ]);

        Project::create([
            'title' => 'Flagship Atelier',
            'category_id' => $cat->id,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $response = $this->deleteJson("/api/admin/categories/{$cat->id}");
        $response->assertStatus(422)
            ->assertJsonFragment(['projects_count' => 1]);

        $this->assertDatabaseHas('portfolio_categories', ['id' => $cat->id]);
    }

    public function test_reassign_and_delete_safely_migrates_projects_and_deletes_source_category(): void
    {
        Sanctum::actingAs($this->owner);

        $sourceCat = PortfolioCategory::create([
            'name' => 'Legacy Spaces',
            'slug' => 'legacy-spaces',
        ]);

        $targetCat = PortfolioCategory::create([
            'name' => 'Modern Architecture',
            'slug' => 'modern-architecture',
        ]);

        $project1 = Project::create([
            'title' => 'Space 01',
            'category_id' => $sourceCat->id,
            'category' => $sourceCat->name,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $project2 = Project::create([
            'title' => 'Space 02',
            'category_id' => $sourceCat->id,
            'category' => $sourceCat->name,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        $response = $this->postJson("/api/admin/categories/{$sourceCat->id}/reassign-and-delete", [
            'target_category_id' => $targetCat->id,
        ]);

        $response->assertStatus(200);

        // Source category was deleted
        $this->assertDatabaseMissing('portfolio_categories', ['id' => $sourceCat->id]);

        // Target category exists
        $this->assertDatabaseHas('portfolio_categories', ['id' => $targetCat->id]);

        // Projects reassigned to target category
        $this->assertEquals($targetCat->id, $project1->fresh()->category_id);
        $this->assertEquals('Modern Architecture', $project1->fresh()->category);
        $this->assertEquals($targetCat->id, $project2->fresh()->category_id);
    }

    public function test_only_published_projects_can_be_added_to_featured_slider(): void
    {
        Sanctum::actingAs($this->owner);

        $cat = PortfolioCategory::create(['name' => 'General', 'slug' => 'general']);

        $draftProject = Project::create([
            'title' => 'Unpublished Draft',
            'category_id' => $cat->id,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        $publishedProject = Project::create([
            'title' => 'Published Showpiece',
            'category_id' => $cat->id,
            'cover_image' => 'https://example.com/showpiece.jpg',
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        // Adding draft project to slider fails
        $failResponse = $this->postJson('/api/admin/featured', [
            'project_id' => $draftProject->id,
        ]);
        $failResponse->assertStatus(422)
            ->assertJsonValidationErrors(['project_id']);

        // Adding published project succeeds
        $passResponse = $this->postJson('/api/admin/featured', [
            'project_id' => $publishedProject->id,
            'title_override' => 'Premier Architectural Showcase',
        ]);
        $passResponse->assertStatus(201)
            ->assertJsonPath('featured_item.title_override', 'Premier Architectural Showcase');

        $this->assertDatabaseHas('featured_items', [
            'project_id' => $publishedProject->id,
        ]);
    }

    public function test_reordering_featured_slider_items_persists(): void
    {
        Sanctum::actingAs($this->owner);

        $cat = PortfolioCategory::create(['name' => 'General', 'slug' => 'general']);

        $p1 = Project::create([
            'title' => 'Project 1',
            'category_id' => $cat->id,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $p2 = Project::create([
            'title' => 'Project 2',
            'category_id' => $cat->id,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $item1 = FeaturedItem::create(['project_id' => $p1->id, 'display_order' => 1]);
        $item2 = FeaturedItem::create(['project_id' => $p2->id, 'display_order' => 2]);

        // Invert order: item2 then item1
        $response = $this->putJson('/api/admin/featured/reorder', [
            'ordered_ids' => [$item2->id, $item1->id],
        ]);
        $response->assertStatus(200);

        $this->assertEquals(1, $item2->fresh()->display_order);
        $this->assertEquals(2, $item1->fresh()->display_order);
    }
}
