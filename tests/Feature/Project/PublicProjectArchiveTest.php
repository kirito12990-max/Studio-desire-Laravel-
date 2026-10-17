<?php

namespace Tests\Feature\Project;

use App\Models\Media;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectMedia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProjectArchiveTest extends TestCase
{
    use RefreshDatabase;

    protected PortfolioCategory $interior;
    protected PortfolioCategory $architecture;

    protected function setUp(): void
    {
        parent::setUp();

        $this->interior = PortfolioCategory::create([
            'name' => 'Interior',
            'slug' => 'interior',
            'description' => 'Interior architecture',
            'display_order' => 1,
            'is_active' => true,
        ]);

        $this->architecture = PortfolioCategory::create([
            'name' => 'Architecture',
            'slug' => 'architecture',
            'description' => 'Architectural design',
            'display_order' => 2,
            'is_active' => true,
        ]);
    }

    public function test_public_archive_only_returns_published_projects(): void
    {
        // 1. Published project
        Project::create([
            'title' => 'Cafe 08',
            'slug' => 'cafe-08',
            'category_id' => $this->interior->id,
            'location' => 'Jaipur',
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        // 2. Draft project
        Project::create([
            'title' => 'Draft Residence',
            'slug' => 'draft-residence',
            'category_id' => $this->architecture->id,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        // 3. Archived project
        Project::create([
            'title' => 'Archived Office',
            'slug' => 'archived-office',
            'category_id' => $this->architecture->id,
            'publishing_status' => 'archived',
            'is_published' => false,
        ]);

        $response = $this->getJson('/api/projects');
        $response->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('projects.0.slug', 'cafe-08');
    }

    public function test_public_detail_returns_cafe_08_approved_structure_and_media(): void
    {
        $cafe = Project::create([
            'title' => 'Cafe 08',
            'slug' => 'cafe-08',
            'subtitle' => 'Artisanal Roastery in Terracotta, Lime, & Cast Bronze',
            'location' => 'Jaipur',
            'year' => 2024,
            'category_id' => $this->interior->id,
            'category' => 'Interior',
            'project_type' => 'Specialty Cafe & Roastery',
            'area' => '2,200 sq.ft',
            'description' => "Honoring Jaipur's terracotta pottery heritage, Cafe 08 features a sculptural central counter cast entirely from indigenous pink terracotta clay.",
            'cover_image' => 'https://images.unsplash.com/photo-1554118811-1e0d58224f24',
            'publishing_status' => 'published',
            'is_published' => true,
            'featured' => true,
        ]);

        ProjectMedia::create([
            'project_id' => $cafe->id,
            'url' => 'https://images.unsplash.com/photo-1554118811-1e0d58224f24',
            'caption' => 'Sculptural terracotta brew bar with custom brass pour-over fittings.',
            'alt_text' => 'Terracotta brew bar',
            'sort_order' => 1,
            'is_published' => true,
        ]);

        ProjectMedia::create([
            'project_id' => $cafe->id,
            'url' => 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb',
            'caption' => 'Seating alcoves recessed into arched lime plaster niches.',
            'alt_text' => 'Seating niches and arches',
            'sort_order' => 2,
            'is_published' => true,
        ]);

        $response = $this->getJson('/api/projects/cafe-08');
        $response->assertStatus(200)
            ->assertJsonPath('title', 'Cafe 08')
            ->assertJsonPath('location', 'Jaipur')
            ->assertJsonPath('year', 2024)
            ->assertJsonPath('area', '2,200 sq.ft')
            ->assertJsonPath('category', 'Interior')
            ->assertJsonCount(2, 'media')
            ->assertJsonPath('media.0.caption', 'Sculptural terracotta brew bar with custom brass pour-over fittings.')
            ->assertJsonPath('media.0.sort_order', 1)
            ->assertJsonPath('media.1.sort_order', 2);
    }

    public function test_public_detail_returns_404_for_draft_and_archived_projects(): void
    {
        Project::create([
            'title' => 'Unpublished Space',
            'slug' => 'unpublished-space',
            'category_id' => $this->architecture->id,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        Project::create([
            'title' => 'Old Archived Space',
            'slug' => 'old-archived-space',
            'category_id' => $this->architecture->id,
            'publishing_status' => 'archived',
            'is_published' => false,
        ]);

        $this->getJson('/api/projects/unpublished-space')->assertStatus(404);
        $this->getJson('/api/projects/old-archived-space')->assertStatus(404);
    }

    public function test_public_filtering_by_category(): void
    {
        Project::create([
            'title' => 'Interior Loft',
            'slug' => 'interior-loft',
            'category_id' => $this->interior->id,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        Project::create([
            'title' => 'Civic Museum',
            'slug' => 'civic-museum',
            'category_id' => $this->architecture->id,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        // Filter by category slug
        $interiorResponse = $this->getJson('/api/projects?category=interior');
        $interiorResponse->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('projects.0.slug', 'interior-loft');

        // Filter by category_id
        $archResponse = $this->getJson("/api/projects?category_id={$this->architecture->id}");
        $archResponse->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('projects.0.slug', 'civic-museum');
    }

    public function test_public_featured_endpoint_returns_published_featured_project(): void
    {
        Project::create([
            'title' => 'Non Featured Space',
            'slug' => 'non-featured',
            'category_id' => $this->architecture->id,
            'publishing_status' => 'published',
            'is_published' => true,
            'featured' => false,
        ]);

        Project::create([
            'title' => 'Star Feature Project',
            'slug' => 'star-feature',
            'category_id' => $this->architecture->id,
            'publishing_status' => 'published',
            'is_published' => true,
            'featured' => true,
        ]);

        $response = $this->getJson('/api/projects/featured');
        $response->assertStatus(200)
            ->assertJsonPath('slug', 'star-feature');
    }
}
