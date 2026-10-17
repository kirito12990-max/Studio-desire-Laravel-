<?php

namespace Tests\Feature\Content;

use App\Models\Client;
use App\Models\FeaturedItem;
use App\Models\Media;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use App\Models\User;
use App\Models\WebsiteSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebsiteContentAndDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::create([
            'name' => 'Studio Principal',
            'username' => 'principal',
            'email' => 'principal@studiodesire.com',
            'password' => 'Architect2026!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);
    }

    public function test_public_content_endpoint_returns_fallback_defaults_when_empty(): void
    {
        $response = $this->getJson('/api/content');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'sections' => [
                    'hero',
                    'about',
                    'services',
                    'contact',
                    'philosophy',
                ],
            ]);

        $hero = $response->json('sections.hero');
        $this->assertEquals('ARCHITECTURAL INTEGRITY · TACTILE ATMOSPHERES', $hero['tagline']);

        $about = $response->json('sections.about');
        $this->assertEquals('Studio Desire is a dedicated interior architecture practice founded in Ahmedabad.', $about['intro_heading']);
    }

    public function test_owner_can_update_content_section_with_xss_sanitization(): void
    {
        $dirtyContent = [
            'headline' => 'New Vision for Space <script>alert("XSS")</script>',
            'subheadline' => 'Crafting atmospheres with <b onclick="evil()">tactile stone</b>.',
            'primary_cta_text' => 'Explore',
            'primary_cta_url' => 'javascript:alert(1)', // Unsafe URL
        ];

        $updateResponse = $this->actingAs($this->owner, 'sanctum')
            ->putJson('/api/admin/content/hero', [
                'content' => $dirtyContent,
            ]);

        $updateResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        // Verify stored content in database was sanitized
        $setting = WebsiteSetting::where('key', 'content_hero')->first();
        $this->assertNotNull($setting);
        $saved = json_decode($setting->value, true);

        // <script> must be stripped
        $this->assertStringNotContainsString('<script>', $saved['headline']);
        $this->assertStringNotContainsString('alert("XSS")', $saved['headline']);
        $this->assertEquals('New Vision for Space', trim($saved['headline']));

        // onclick must be stripped, <b> preserved
        $this->assertStringNotContainsString('onclick', $saved['subheadline']);
        $this->assertStringContainsString('<b>tactile stone</b>', $saved['subheadline']);

        // javascript: URL must be neutralized
        $this->assertEquals('#', $saved['primary_cta_url']);

        // Public content endpoint now reflects the sanitized update
        $publicRes = $this->getJson('/api/content/hero');
        $publicRes->assertStatus(200)
            ->assertJsonPath('content.headline', 'New Vision for Space');
    }

    public function test_public_featured_slider_returns_only_published_projects_in_display_order(): void
    {
        $category = PortfolioCategory::create(['name' => 'Hospitality', 'slug' => 'hospitality']);

        $publishedProject = Project::create([
            'title' => 'The Amber Pavilion',
            'slug' => 'the-amber-pavilion',
            'category_id' => $category->id,
            'category' => $category->name,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);

        $draftProject = Project::create([
            'title' => 'Draft Secret Villa',
            'slug' => 'draft-secret-villa',
            'category_id' => $category->id,
            'category' => $category->name,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        // Feature the published project at order 1
        FeaturedItem::create([
            'project_id' => $publishedProject->id,
            'title' => 'Amber Pavilion Showcase',
            'display_order' => 1,
            'is_active' => true,
        ]);

        // Feature the draft project at order 2
        FeaturedItem::create([
            'project_id' => $draftProject->id,
            'title' => 'Draft Villa Showcase',
            'display_order' => 2,
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/featured');
        $response->assertStatus(200);

        $items = $response->json('items');
        // Draft project must be filtered out publicly!
        $this->assertCount(1, $items);
        $this->assertEquals('The Amber Pavilion', $items[0]['title']);
    }

    public function test_owner_dashboard_returns_authentic_database_metrics(): void
    {
        $category = PortfolioCategory::create(['name' => 'Residential', 'slug' => 'residential']);

        // 2 published, 1 draft, 1 archived
        Project::create([
            'title' => 'Project A',
            'slug' => 'project-a',
            'category_id' => $category->id,
            'category' => $category->name,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);
        Project::create([
            'title' => 'Project B',
            'slug' => 'project-b',
            'category_id' => $category->id,
            'category' => $category->name,
            'publishing_status' => 'published',
            'is_published' => true,
        ]);
        Project::create([
            'title' => 'Project C',
            'slug' => 'project-c',
            'category_id' => $category->id,
            'category' => $category->name,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);
        Project::create([
            'title' => 'Project D',
            'slug' => 'project-d',
            'category_id' => $category->id,
            'category' => $category->name,
            'publishing_status' => 'archived',
            'is_published' => false,
        ]);

        // 2 new enquiries, 1 in discussion, 1 closed
        ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0020',
            'name' => 'Enquiry 1',
            'email' => 'e1@example.com',
            'message' => 'Msg 1',
            'status' => 'NEW',
        ]);
        ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0021',
            'name' => 'Enquiry 2',
            'email' => 'e2@example.com',
            'message' => 'Msg 2',
            'status' => 'NEW',
        ]);
        ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0022',
            'name' => 'Enquiry 3',
            'email' => 'e3@example.com',
            'message' => 'Msg 3',
            'status' => 'IN_DISCUSSION',
        ]);
        ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0023',
            'name' => 'Enquiry 4',
            'email' => 'e4@example.com',
            'message' => 'Msg 4',
            'status' => 'CLOSED',
        ]);

        // 1 Client
        Client::create([
            'name' => 'Client One',
            'email' => 'c1@example.com',
            'status' => 'ACTIVE',
        ]);

        $response = $this->actingAs($this->owner, 'sanctum')->getJson('/api/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJson([
                'published_projects' => 2,
                'draft_projects' => 1,
                'archived_projects' => 1,
                'total_projects' => 4,
                'new_enquiries' => 2,
                'pending_follow_up' => 3, // 2 NEW + 1 IN_DISCUSSION
                'total_enquiries' => 4,
                'total_clients' => 1,
            ]);

        $this->assertNotEmpty($response->json('recent_enquiries'));
        $this->assertNotEmpty($response->json('recent_projects'));
    }
}
