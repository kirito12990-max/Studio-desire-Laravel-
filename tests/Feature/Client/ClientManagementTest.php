<?php

namespace Tests\Feature\Client;

use App\Models\Client;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::create([
            'name' => 'Studio Owner',
            'username' => 'owner',
            'email' => 'owner@studiodesire.com',
            'password' => 'StudioPass123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);
    }

    public function test_owner_can_list_clients_with_relation_counts(): void
    {
        $client = Client::create([
            'name' => 'Rajesh Khandelwal',
            'email' => 'rajesh@khandelwal.in',
            'phone' => '+91 94140 12345',
            'company' => 'Khandelwal Jewellers',
            'status' => 'ACTIVE',
        ]);

        $category = PortfolioCategory::create(['name' => 'Commercial', 'slug' => 'commercial']);

        Project::create([
            'title' => 'Khandelwal Flagship Boutique',
            'slug' => 'khandelwal-flagship-boutique',
            'category_id' => $category->id,
            'category' => $category->name,
            'client_id' => $client->id,
            'is_published' => true,
        ]);

        ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0010',
            'name' => 'Rajesh Khandelwal',
            'email' => 'rajesh@khandelwal.in',
            'message' => 'Discussion regarding showroom expansion.',
            'client_id' => $client->id,
            'status' => 'IN_DISCUSSION',
        ]);

        $response = $this->actingAs($this->owner, 'sanctum')->getJson('/api/admin/clients');

        $response->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('clients.0.name', 'Rajesh Khandelwal')
            ->assertJsonPath('clients.0.projects_count', 1)
            ->assertJsonPath('clients.0.enquiries_count', 1);
    }

    public function test_owner_can_create_and_update_client(): void
    {
        // Create client
        $createResponse = $this->actingAs($this->owner, 'sanctum')->postJson('/api/admin/clients', [
            'name' => 'Sunil Chhabra',
            'email' => 'sunil@chhabra.com',
            'phone' => '+91 98111 22233',
            'company' => 'Chhabra Heritage Group',
            'notes' => 'Prefers communication via assistant.',
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('client.name', 'Sunil Chhabra');

        $clientId = $createResponse->json('client.id');

        // Update client
        $updateResponse = $this->actingAs($this->owner, 'sanctum')->putJson("/api/admin/clients/{$clientId}", [
            'phone' => '+91 98111 99999',
            'notes' => 'Updated: Direct WhatsApp channel established.',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('client.phone', '+91 98111 99999');

        $this->assertDatabaseHas('clients', [
            'id' => $clientId,
            'phone' => '+91 98111 99999',
        ]);
    }

    public function test_owner_can_view_detailed_client_profile_with_associated_records(): void
    {
        $client = Client::create([
            'name' => 'Neelam Verma',
            'email' => 'neelam@verma.org',
            'status' => 'ACTIVE',
        ]);

        $category = PortfolioCategory::create(['name' => 'Residential', 'slug' => 'residential']);

        $project = Project::create([
            'title' => 'Verma Villa 04',
            'slug' => 'verma-villa-04',
            'category_id' => $category->id,
            'category' => $category->name,
            'client_id' => $client->id,
            'publishing_status' => 'draft',
            'is_published' => false,
        ]);

        $enquiry = ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0011',
            'name' => 'Neelam Verma',
            'email' => 'neelam@verma.org',
            'message' => 'Interior styling inquiry.',
            'client_id' => $client->id,
            'status' => 'CONVERTED',
            'converted_project_id' => $project->id,
        ]);

        $response = $this->actingAs($this->owner, 'sanctum')->getJson("/api/admin/clients/{$client->id}");

        $response->assertStatus(200)
            ->assertJsonPath('client.name', 'Neelam Verma')
            ->assertJsonCount(1, 'client.projects')
            ->assertJsonPath('client.projects.0.title', 'Verma Villa 04')
            ->assertJsonCount(1, 'client.enquiries')
            ->assertJsonPath('client.enquiries.0.reference_number', 'SD-20261018-0011');
    }

    public function test_safe_client_deletion_preserves_associated_projects_and_enquiries(): void
    {
        $client = Client::create([
            'name' => 'Temporary Client',
            'email' => 'temp@client.com',
            'status' => 'ACTIVE',
        ]);

        $category = PortfolioCategory::create(['name' => 'Workspace', 'slug' => 'workspace']);

        $project = Project::create([
            'title' => 'Creative Co-Op Studio',
            'slug' => 'creative-co-op-studio',
            'category_id' => $category->id,
            'category' => $category->name,
            'client_id' => $client->id,
            'is_published' => true,
        ]);

        $enquiry = ProjectEnquiry::create([
            'reference_number' => 'SD-20261018-0012',
            'name' => 'Temporary Client',
            'email' => 'temp@client.com',
            'message' => 'Studio enquiry.',
            'client_id' => $client->id,
            'status' => 'CLOSED',
        ]);

        $deleteResponse = $this->actingAs($this->owner, 'sanctum')->deleteJson("/api/admin/clients/{$client->id}");
        $deleteResponse->assertStatus(200);

        // Client deleted
        $this->assertDatabaseMissing('clients', ['id' => $client->id]);

        // Associated project & enquiry remain intact with null client_id
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'client_id' => null]);
        $this->assertDatabaseHas('project_enquiries', ['id' => $enquiry->id, 'client_id' => null]);
    }
}
