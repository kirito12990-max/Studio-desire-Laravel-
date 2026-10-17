<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\FeaturedItem;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeaturedController extends Controller
{
    /**
     * List configured featured projects on the homepage slider.
     */
    public function index(): JsonResponse
    {
        $items = FeaturedItem::with(['project.category'])
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $data = $items->map(function (FeaturedItem $item) {
            $p = $item->project;
            return [
                'id' => $item->id,
                'project_id' => $item->project_id,
                'title' => $item->title_override ?: $p?->title,
                'subtitle' => $item->subtitle_override ?: $p?->subtitle,
                'cover_image' => $item->image_override ?: $p?->cover_image,
                'display_order' => $item->display_order,
                'is_active' => (bool) $item->is_active,
                'project' => $p ? [
                    'id' => $p->id,
                    'title' => $p->title,
                    'slug' => $p->slug,
                    'location' => $p->location,
                    'category' => $p->category_name,
                    'publishing_status' => $p->publishing_status,
                    'is_published' => (bool) $p->is_published,
                ] : null,
                'created_at' => $item->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'featured_items' => $data,
        ]);
    }

    /**
     * Add a published project to the featured slider.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id|unique:featured_items,project_id',
            'title_override' => 'nullable|string|max:255',
            'subtitle_override' => 'nullable|string|max:500',
            'image_override' => 'nullable|string|max:1000',
            'display_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $project = Project::findOrFail($validated['project_id']);

        // Strictly enforce eligibility: only published projects may appear on homepage slider
        if (!$project->is_published || $project->publishing_status !== 'published') {
            return response()->json([
                'message' => 'Only published projects can be added to the homepage featured slider.',
                'errors' => ['project_id' => ['Selected project is in draft or archived state. Please publish the project first.']],
            ], 422);
        }

        $nextOrder = $validated['display_order'] ?? (FeaturedItem::max('display_order') + 1);
        $validated['display_order'] = $nextOrder;

        $item = FeaturedItem::create($validated);

        // Synchronize featured flag on project model as well
        $project->featured = true;
        $project->save();

        return response()->json([
            'message' => "Project '{$project->title}' added to homepage featured slider.",
            'featured_item' => $item->load('project'),
        ], 201);
    }

    /**
     * Persist reordered slider items in the database.
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ordered_ids' => 'required|array|min:1',
            'ordered_ids.*' => 'required|integer|exists:featured_items,id',
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['ordered_ids'] as $index => $id) {
                FeaturedItem::where('id', $id)->update(['display_order' => $index + 1]);
            }
        });

        return response()->json([
            'message' => 'Homepage featured slider order updated successfully.',
            'featured_items' => FeaturedItem::with('project')->orderBy('display_order')->get(),
        ]);
    }

    /**
     * Remove project from the featured slider.
     */
    public function destroy(int $id): JsonResponse
    {
        $item = FeaturedItem::findOrFail($id);
        $project = Project::find($item->project_id);
        if ($project) {
            $project->featured = false;
            $project->save();
        }

        $item->delete();

        return response()->json([
            'message' => 'Project removed from featured slider.',
        ]);
    }
}
