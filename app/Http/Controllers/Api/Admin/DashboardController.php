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
        $publishedCount = Project::where('is_published', true)->count();
        $draftCount = Project::where('publishing_status', 'draft')
            ->orWhere(function ($q) {
                $q->whereNull('publishing_status')->where('is_published', false);
            })->count();
        $archivedCount = Project::where('publishing_status', 'archived')->count();

        $newEnquiriesCount = ProjectEnquiry::where('status', 'NEW')->count();
        $pendingFollowUpCount = ProjectEnquiry::whereIn('status', ['NEW', 'CONTACTED', 'IN_DISCUSSION'])->count();

        $recentEnquiries = ProjectEnquiry::select('id', 'reference_number', 'name', 'email', 'project_type', 'status', 'created_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get();

        $recentProjects = Project::select('id', 'title', 'slug', 'category', 'publishing_status', 'is_published', 'updated_at')
            ->orderByDesc('updated_at')
            ->limit(5)
            ->get();

        return response()->json([
            'published_projects' => $publishedCount,
            'draft_projects' => $draftCount,
            'archived_projects' => $archivedCount,
            'total_projects' => Project::count(),
            'total_products' => 0,
            'total_visualizations' => Media::where('media_type', 'image')->count(),
            'total_blueprints' => 0,
            'new_enquiries' => $newEnquiriesCount,
            'pending_follow_up' => $pendingFollowUpCount,
            'total_enquiries' => ProjectEnquiry::count(),
            'total_clients' => Client::count(),
            'featured_slider_count' => FeaturedItem::where('is_active', true)->count(),
            'total_media' => Media::count(),
            'recent_enquiries' => $recentEnquiries,
            'recent_projects' => $recentProjects,
        ]);
    }
}
