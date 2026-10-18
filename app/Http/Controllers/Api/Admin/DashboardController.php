<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\FeaturedItem;
use App\Models\Media;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Provide uncluttered, authentic statistics and activity feeds for the owner dashboard.
     */
    public function stats(Request $request): JsonResponse
    {
        $publishedCount = Project::published()->count();
        $draftCount = Project::draft()->count();
        $archivedCount = Project::archived()->count();
        $totalProjects = Project::count();
        $activeProjects = Project::whereIn('publishing_status', ['published', 'draft'])->count();

        $newEnquiriesCount = ProjectEnquiry::where('status', 'NEW')->count();
        $pendingFollowUpCount = ProjectEnquiry::whereIn('status', ['NEW', 'CONTACTED', 'IN_DISCUSSION'])->count();
        $totalEnquiries = ProjectEnquiry::count();

        $totalClients = Client::count();
        $totalPhotos = Media::whereIn('media_type', ['image', 'photo'])->count();
        $totalVideos = Media::where('media_type', 'video')->count();
        $totalMedia = Media::count();
        $unassignedMedia = Media::doesntHave('projectAssignments')->count();
        $featuredSliderCount = FeaturedItem::where('is_active', true)->count();

        $recentEnquiries = ProjectEnquiry::select('id', 'reference_number', 'name', 'email', 'project_type', 'status', 'created_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get();

        $recentProjects = Project::select('id', 'title', 'slug', 'category', 'publishing_status', 'is_published', 'updated_at')
            ->orderByDesc('updated_at')
            ->limit(5)
            ->get();

        return response()->json([
            'total_projects' => $totalProjects,
            'active_projects' => $activeProjects,
            'published_projects' => $publishedCount,
            'published_projects_count' => $publishedCount,
            'draft_projects' => $draftCount,
            'draft_projects_count' => $draftCount,
            'archived_projects' => $archivedCount,
            'total_clients' => $totalClients,
            'total_enquiries' => $totalEnquiries,
            'new_enquiries' => $newEnquiriesCount,
            'pending_follow_up' => $pendingFollowUpCount,
            'total_photos' => $totalPhotos,
            'total_visualizations' => $totalPhotos,
            'total_videos' => $totalVideos,
            'total_media' => $totalMedia,
            'unassigned_media_count' => $unassignedMedia,
            'featured_slider_count' => $featuredSliderCount,
            'total_blueprints' => 0,
            'total_products' => 0,
            'tasks_due_today' => 0,
            'overdue_tasks' => 0,
            'upcoming_meetings_count' => 0,
            'pending_approvals_count' => 0,
            'total_project_value' => 0,
            'total_amount_received' => 0,
            'recent_enquiries' => $recentEnquiries,
            'recent_projects' => $recentProjects,
        ]);
    }
}
