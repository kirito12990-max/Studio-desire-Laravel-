<?php

namespace Tests\Feature\Auth;

use App\Models\EnquiryAttachment;
use App\Models\ProjectEnquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OwnerAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_visitor_cannot_access_dashboard_stats(): void
    {
        $response = $this->getJson('/api/admin/dashboard/stats');
        $response->assertStatus(401);
    }

    public function test_unauthenticated_visitor_cannot_access_enquiries(): void
    {
        $response = $this->getJson('/api/admin/enquiries');
        $response->assertStatus(401);
    }

    public function test_non_owner_user_is_forbidden_from_owner_dashboard(): void
    {
        $staffUser = User::create([
            'name' => 'General Staff',
            'username' => 'staffuser',
            'email' => 'staff@studiodesire.com',
            'password' => 'Password123!',
            'role' => 'EDITOR', // Not OWNER/ADMIN
            'is_active' => true,
        ]);

        $response = $this->actingAs($staffUser, 'sanctum')->getJson('/api/admin/dashboard/stats');
        $response->assertStatus(403);
    }

    public function test_non_owner_user_cannot_access_client_enquiries(): void
    {
        $staffUser = User::create([
            'name' => 'General Staff',
            'username' => 'staffuser',
            'email' => 'staff@studiodesire.com',
            'password' => 'Password123!',
            'role' => 'VIEWER',
            'is_active' => true,
        ]);

        $response = $this->actingAs($staffUser, 'sanctum')->getJson('/api/admin/enquiries');
        $response->assertStatus(403);
    }

    public function test_owner_user_can_access_dashboard_stats(): void
    {
        $owner = User::create([
            'name' => 'Studio Owner',
            'username' => 'owneruser',
            'email' => 'owner@studiodesire.com',
            'password' => 'Password123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $response = $this->actingAs($owner, 'sanctum')->getJson('/api/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_projects',
                'published_projects',
                'total_products',
                'total_visualizations',
                'total_blueprints',
                'total_enquiries',
                'new_enquiries',
            ]);
    }

    public function test_owner_can_view_enquiry_and_update_status(): void
    {
        $owner = User::create([
            'name' => 'Studio Owner',
            'username' => 'owneruser',
            'email' => 'owner@studiodesire.com',
            'password' => 'Password123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $enquiry = ProjectEnquiry::create([
            'name' => 'Prospective Client',
            'email' => 'client@example.com',
            'phone' => '+1234567890',
            'project_type' => 'Private Residence',
            'location' => 'Ahmedabad',
            'message' => 'Interested in bespoke villa architectural planning.',
            'status' => 'NEW',
        ]);

        // Owner views single enquiry
        $viewResponse = $this->actingAs($owner, 'sanctum')->getJson("/api/admin/enquiries/{$enquiry->id}");
        $viewResponse->assertStatus(200)
            ->assertJson([
                'id' => $enquiry->id,
                'name' => 'Prospective Client',
                'status' => 'NEW',
            ]);

        // Owner updates enquiry status
        $updateResponse = $this->actingAs($owner, 'sanctum')->patchJson("/api/admin/enquiries/{$enquiry->id}/status", [
            'status' => 'CONTACTED',
            'internal_notes' => 'Called client on phone. Scheduled initial discovery meeting.',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJson([
                'enquiry' => [
                    'status' => 'CONTACTED',
                ],
            ]);

        $enquiry->refresh();
        $this->assertEquals('CONTACTED', $enquiry->status);
    }

    public function test_owner_can_download_private_enquiry_attachment(): void
    {
        Storage::fake('local');

        $owner = User::create([
            'name' => 'Studio Owner',
            'username' => 'owneruser',
            'email' => 'owner@studiodesire.com',
            'password' => 'Password123!',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $enquiry = ProjectEnquiry::create([
            'name' => 'Client With Attachment',
            'email' => 'client2@example.com',
            'phone' => '+1234567890',
            'project_type' => 'Villa',
            'message' => 'Please find attached preliminary site plan.',
            'status' => 'NEW',
        ]);

        $filePath = 'private/enquiry_attachments/test_site_plan.pdf';
        Storage::disk('local')->put($filePath, 'PDF-DUMMY-CONTENT');

        $attachment = EnquiryAttachment::create([
            'enquiry_id' => $enquiry->id,
            'original_filename' => 'site_plan.pdf',
            'filename' => 'test_site_plan.pdf',
            'file_type' => 'pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 16,
            'storage_path' => $filePath,
        ]);

        // Unauthenticated access fails
        $guestResponse = $this->getJson("/api/admin/enquiries/{$enquiry->id}/attachments/{$attachment->id}");
        $guestResponse->assertStatus(401);

        // Owner access succeeds
        $ownerResponse = $this->actingAs($owner, 'sanctum')
            ->get("/api/admin/enquiries/{$enquiry->id}/attachments/{$attachment->id}");

        $ownerResponse->assertStatus(200)
            ->assertHeader('Content-Disposition', 'attachment; filename=site_plan.pdf')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }
}
