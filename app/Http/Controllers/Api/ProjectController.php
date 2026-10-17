<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * List all published architectural projects for public gallery.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Project::query()
            ->with(['category', 'media'])
            ->where(function ($q) {
                $q->where('is_published', true)
                  ->orWhere('publishing_status', 'published');
            })
            ->where(function ($q) {
                // Ensure draft and archived projects are strictly excluded from public archive
                $q->whereNull('publishing_status')
                  ->orWhere('publishing_status', 'published');
            });

        // Filter by Authoritative Category ID
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }
        // Filter by Category Name or Slug
        elseif ($request->filled('category') && strtoupper($request->input('category')) !== 'ALL') {
            $categoryParam = trim($request->input('category'));
            $matchedCategory = PortfolioCategory::where('slug', strtolower($categoryParam))
                ->orWhere('name', $categoryParam)
                ->first();

            if ($matchedCategory) {
                $query->where(function ($q) use ($matchedCategory) {
                    $q->where('category_id', $matchedCategory->id)
                      ->orWhereRaw('LOWER(category) = ?', [strtolower($matchedCategory->name)]);
                });
            } else {
                $query->whereRaw('LOWER(category) = ?', [strtolower($categoryParam)]);
            }
        }

        // Filter by Featured Status
        if ($request->has('featured')) {
            $query->where('featured', $request->boolean('featured'));
        }

        // Filter by Media Type (video vs image)
        if ($request->filled('media_type')) {
            $mediaType = strtolower($request->input('media_type'));
            if (in_array($mediaType, ['video', 'videos'])) {
                $query->whereHas('media', function ($m) {
                    $m->where('media_type', 'video')->where('is_published', true);
                });
            } elseif (in_array($mediaType, ['image', 'photo', 'photos'])) {
                $query->whereHas('media', function ($m) {
                    $m->whereIn('media_type', ['image', 'photo'])->where('is_published', true);
                });
            }
        }

        $projects = $query->orderByDesc('featured')
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        $summaries = $projects->map(function (Project $p) {
            $publishedMedia = $p->media->where('is_published', true);
            $hasVideo = $publishedMedia->contains('media_type', 'video');

            return [
                'id' => $p->id,
                'title' => $p->title,
                'slug' => $p->slug,
                'subtitle' => $p->subtitle,
                'location' => $p->location,
                'year' => $p->year,
                'category' => $p->category_name,
                'category_id' => $p->category_id,
                'subcategory_id' => $p->subcategory_id,
                'project_type' => $p->project_type,
                'area' => $p->area,
                'description' => $p->description,
                'cover_image' => $p->cover_image,
                'featured' => (bool) $p->featured,
                'is_published' => (bool) $p->is_published,
                'publishing_status' => $p->publishing_status ?? 'published',
                'grid_span' => $p->grid_span ?: 'span-6',
                'aspect_ratio' => $p->aspect_ratio ?: 'ratio-standard',
                'has_video' => $hasVideo,
                'media_count' => $publishedMedia->count(),
                'created_at' => $p->created_at?->toIso8601String(),
                'updated_at' => $p->updated_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'total' => $summaries->count(),
            'projects' => $summaries,
        ]);
    }

    /**
     * Retrieve the top featured published project.
     */
    public function featured(): JsonResponse
    {
        $project = Project::with(['category', 'media' => fn ($q) => $q->where('is_published', true)->orderBy('sort_order')])
            ->where(function ($q) {
                $q->where('is_published', true)
                  ->orWhere('publishing_status', 'published');
            })
            ->where('featured', true)
            ->first();

        if (!$project) {
            $project = Project::with(['category', 'media' => fn ($q) => $q->where('is_published', true)->orderBy('sort_order')])
                ->where(function ($q) {
                    $q->where('is_published', true)
                      ->orWhere('publishing_status', 'published');
                })
                ->orderByDesc('id')
                ->first();
        }

        if (!$project) {
            return response()->json([
                'message' => 'No published projects found in the archive.',
            ], 404);
        }

        return response()->json($this->formatProjectDetail($project));
    }

    /**
     * Return list of categories that contain published projects.
     */
    public function categories(): JsonResponse
    {
        $categoryNames = PortfolioCategory::whereHas('projects', function ($q) {
            $q->where('is_published', true);
        })->pluck('name')->toArray();

        return response()->json(array_merge(['ALL'], $categoryNames));
    }

    /**
     * Retrieve full published project architectural dossier.
     */
    public function show(string $slugOrId): JsonResponse
    {
        $query = Project::with(['category', 'subcategory', 'media' => fn ($q) => $q->where('is_published', true)->orderBy('sort_order')])
            ->where(function ($q) {
                $q->where('is_published', true)
                  ->orWhere('publishing_status', 'published');
            })
            ->where(function ($q) {
                $q->whereNull('publishing_status')
                  ->orWhere('publishing_status', 'published');
            });

        if (ctype_digit($slugOrId)) {
            $project = (clone $query)->where('id', (int) $slugOrId)->first();
        } else {
            $project = (clone $query)->where('slug', strtolower($slugOrId))->first();
        }

        if (!$project) {
            return response()->json([
                'message' => "Published project '{$slugOrId}' was not found in the Studio Desire archive.",
            ], 404);
        }

        $detail = $this->formatProjectDetail($project);
        return response()->json(array_merge($detail, [
            'project' => $detail,
        ]));
    }

    /**
     * Helper to format full project detail matching frontend contract.
     */
    public function formatProjectDetail(Project $project): array
    {
        $mediaList = $project->media
            ->where('is_published', true)
            ->sortBy('sort_order')
            ->values()
            ->map(function (ProjectMedia $m) use ($project) {
                return [
                    'id' => $m->id,
                    'media_id' => $m->media_id,
                    'project_id' => $project->id,
                    'media_type' => $m->media_type ?: 'image',
                    'url' => $m->url,
                    'thumbnail_url' => $m->thumbnail_url ?: $m->url,
                    'caption' => $m->caption,
                    'alt_text' => $m->alt_text ?: "{$project->title} architectural detail",
                    'sort_order' => $m->sort_order,
                    'room_name' => $m->room_name,
                ];
            });

        return [
            'id' => $project->id,
            'title' => $project->title,
            'slug' => $project->slug,
            'subtitle' => $project->subtitle,
            'location' => $project->location,
            'year' => $project->year,
            'category' => $project->category_name,
            'category_id' => $project->category_id,
            'subcategory_id' => $project->subcategory_id,
            'project_type' => $project->project_type,
            'area' => $project->area,
            'description' => $project->description,
            'cover_image' => $project->cover_image,
            'featured' => (bool) $project->featured,
            'is_published' => (bool) $project->is_published,
            'publishing_status' => $project->publishing_status ?? 'published',
            'vr_url' => $project->vr_url,
            'vr_qr_code' => $project->vr_qr_code,
            'show_qr' => (bool) $project->show_qr,
            'vr_type' => $project->vr_type ?: 'external',
            'grid_span' => $project->grid_span ?: 'span-6',
            'aspect_ratio' => $project->aspect_ratio ?: 'ratio-standard',
            'seo_title' => $project->seo_title,
            'meta_description' => $project->meta_description,
            'canonical_url' => $project->canonical_url,
            'created_at' => $project->created_at?->toIso8601String(),
            'updated_at' => $project->updated_at?->toIso8601String(),
            'media' => $mediaList,
        ];
    }
}
