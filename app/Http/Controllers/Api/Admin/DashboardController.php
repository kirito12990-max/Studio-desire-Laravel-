<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlueprintDrawing;
use App\Models\Product;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use App\Models\VisualizationSpace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Provide high-level publishing and enquiry statistics for owner dashboard.
     */
    public function stats(Request $request): JsonResponse
    {
        return response()->json([
            'total_projects' => Project::count(),
            'published_projects' => Project::where('is_published', true)->count(),
            'total_products' => Product::count(),
            'total_visualizations' => VisualizationSpace::count(),
            'total_blueprints' => BlueprintDrawing::count(),
            'total_enquiries' => ProjectEnquiry::count(),
            'new_enquiries' => ProjectEnquiry::where('status', 'NEW')->count(),
        ]);
    }
}
