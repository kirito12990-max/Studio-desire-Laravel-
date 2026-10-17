<?php

namespace Tests\Feature\Database;

use App\Models\Client;
use App\Models\EnquiryAttachment;
use App\Models\Media;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use App\Models\ProjectMedia;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RelationshipAndDeletionRulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_category_deletion_is_blocked_when_projects_exist(): void
    {
        $category = PortfolioCategory::create([
            'name' => 'RESIDENTIAL',
            'slug' => 'residential',
        ]);

        $project = Project::create([
            'category_id' => $category->id,
            'title' => 'Minimalist Concrete Villa',
            'location' => 'Ahmedabad',
            'description' => 'Architectural exploration of spatial daylight.',
        ]);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage("Cannot delete category 'RESIDENTIAL' because it contains associated projects.");

        // Attempting to delete should be blocked by model deleting event and foreign key rules
        $category->delete();

        // Ensure category and project remain intact in database
        $this->assertDatabaseHas('portfolio_categories', ['id' => $category->id]);
        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    public function test_deleting_project_preserves_shared_media(): void
    {
        $category = PortfolioCategory::create([
            'name' => 'COMMERCIAL',
            'slug' => 'commercial',
        ]);

        $media = Media::create([
            'filename' => 'facade_elevation_1.webp',
            'original_name' => 'facade.png',
            'url' => '/uploads/projects/facade_elevation_1.webp',
            'media_type' => 'image',
            'mime_type' => 'image/webp',
            'file_size' => 102400,
        ]);

        $project = Project::create([
            'category_id' => $category->id,
            'title' => 'Monolithic Commercial Tower',
            'location' => 'Mumbai',
            'description' => 'Commercial high-rise.',
        ]);

        $assignment = ProjectMedia::create([
            'project_id' => $project->id,
            'media_id' => $media->id,
            'url' => $media->url,
            'sort_order' => 1,
        ]);

        // Delete the project
        $project->delete();

        // Project and project_media assignment are gone
        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('project_media', ['id' => $assignment->id]);

        // Shared media asset MUST NOT be deleted
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }

    public function test_deleting_project_preserves_client_record(): void
    {
        $category = PortfolioCategory::create([
            'name' => 'HOSPITALITY',
            'slug' => 'hospitality',
        ]);

        $client = Client::create([
            'name' => 'Oberoi Family Trust',
            'email' => 'estates@oberoi.com',
            'company' => 'Oberoi Hospitality Group',
        ]);

        $project = Project::create([
            'category_id' => $category->id,
            'client_id' => $client->id,
            'title' => 'Serene Pavilion Resort',
            'location' => 'Udaipur',
            'description' => 'Boutique hospitality suite.',
        ]);

        $project->delete();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        // Client record MUST remain intact
        $this->assertDatabaseHas('clients', ['id' => $client->id, 'name' => 'Oberoi Family Trust']);
    }

    public function test_deleting_project_preserves_original_enquiry(): void
    {
        $category = PortfolioCategory::create([
            'name' => 'OFFICE',
            'slug' => 'office',
        ]);

        $project = Project::create([
            'category_id' => $category->id,
            'title' => 'Design Studio HQ',
            'location' => 'Surat',
            'description' => 'Studio headquarters.',
        ]);

        $enquiry = ProjectEnquiry::create([
            'name' => 'Patel Associates',
            'email' => 'info@patel.com',
            'phone' => '+919876543210',
            'project_type' => 'Office',
            'message' => 'Design consultation needed.',
            'converted_project_id' => $project->id,
            'status' => 'WON',
        ]);

        // Deleting project must set converted_project_id to null and keep enquiry
        $project->delete();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $enquiry->refresh();

        $this->assertNull($enquiry->converted_project_id);
        $this->assertDatabaseHas('project_enquiries', ['id' => $enquiry->id]);
    }

    public function test_deleting_enquiry_cascade_deletes_its_attachments(): void
    {
        $enquiry = ProjectEnquiry::create([
            'name' => 'Client With Drawing',
            'email' => 'client@drawing.com',
            'phone' => '+1234567890',
            'project_type' => 'Residence',
            'message' => 'Drawing attached.',
        ]);

        $attachment = EnquiryAttachment::create([
            'enquiry_id' => $enquiry->id,
            'original_filename' => 'blueprint.pdf',
            'filename' => 'stored_blueprint.pdf',
            'file_type' => 'pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 20480,
            'storage_path' => 'private/enquiry_attachments/stored_blueprint.pdf',
        ]);

        $enquiry->delete();

        $this->assertDatabaseMissing('project_enquiries', ['id' => $enquiry->id]);
        $this->assertDatabaseMissing('enquiry_attachments', ['id' => $attachment->id]);
    }

    public function test_project_generates_unique_slug_automatically(): void
    {
        $category = PortfolioCategory::create([
            'name' => 'RETAIL',
            'slug' => 'retail',
        ]);

        $project1 = Project::create([
            'category_id' => $category->id,
            'title' => 'Atelier Flagship Store',
            'location' => 'Delhi',
            'description' => 'Flagship store.',
        ]);

        $this->assertEquals('atelier-flagship-store', $project1->slug);

        // Project with identical title receives disambiguated slug
        $project2 = Project::create([
            'category_id' => $category->id,
            'title' => 'Atelier Flagship Store',
            'location' => 'Mumbai',
            'description' => 'Second flagship.',
        ]);

        $this->assertEquals('atelier-flagship-store-1', $project2->slug);
    }

    public function test_enquiry_generates_reference_number_automatically(): void
    {
        $enquiry = ProjectEnquiry::create([
            'name' => 'Rajesh Sharma',
            'email' => 'rajesh@example.com',
            'phone' => '+919999999999',
            'project_type' => 'Private Residence',
            'message' => 'Looking for complete interior design.',
        ]);

        $year = date('Y');
        $this->assertStringStartsWith("ENQ-{$year}-", $enquiry->reference_number);
    }
}
