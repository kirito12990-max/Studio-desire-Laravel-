<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    /**
     * Searchable and filterable project list for owner management panel.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Project::with(['category', 'client'])
            ->withCount(['media as total_media_count'])
            ->withCount(['media as photo_count' => function ($q) {
                $q->whereIn('media_type', ['image', 'photo']);
            }])
            ->withCount(['media as video_count' => function ($q) {
                $q->where('media_type', 'video');
            }]);

        // Search text across title, slug, location, description
        if ($request->filled('q')) {
            $search = '%' . trim($request->input('q')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                  ->orWhere('slug', 'like', $search)
                  ->orWhere('location', 'like', $search)
                  ->orWhere('subtitle', 'like', $search)
                  ->orWhere('description', 'like', $search);
            });
        }

        // Category filter
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        // Publishing status filter: draft, published, archived
        if ($request->filled('status')) {
            $status = strtolower($request->input('status'));
            if (in_array($status, ['draft', 'published', 'archived'])) {
                $query->where('publishing_status', $status);
            }
        }

        // Featured state filter
        if ($request->has('featured')) {
            $query->where('featured', $request->boolean('featured'));
        }

        $projects = $query->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        $data = $projects->map(function (Project $p) {
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
                'client_id' => $p->client_id,
                'client_name' => $p->client?->name,
                'cover_image' => $p->cover_image,
                'status' => $p->status,
                'publishing_status' => $p->publishing_status ?: ($p->is_published ? 'published' : 'draft'),
                'is_published' => (bool) $p->is_published,
                'featured' => (bool) $p->featured,
                'media_count' => $p->total_media_count,
                'photo_count' => $p->photo_count,
                'video_count' => $p->video_count,
                'can_be_published' => $p->canBePublished(),
                'missing_fields' => array_values($p->getValidationErrorsForPublishing()),
                'created_at' => $p->created_at?->toIso8601String(),
                'updated_at' => $p->updated_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'total' => $data->count(),
            'projects' => $data,
        ]);
    }

    /**
     * Create a new project (draft or published).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'category_id' => 'required|exists:portfolio_categories,id',
            'subcategory_id' => 'nullable|exists:portfolio_subcategories,id',
            'client_id' => 'nullable|exists:clients,id',
            'subtitle' => 'nullable|string|max:500',
            'location' => 'nullable|string|max:255',
            'year' => 'nullable|integer',
            'project_type' => 'nullable|string|max:255',
            'area' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string|max:1000',
            'publishing_status' => 'nullable|in:draft,published,archived',
            'featured' => 'nullable|boolean',
            'vr_url' => 'nullable|string|max:1000',
            'vr_type' => 'nullable|string|max:50',
            'grid_span' => 'nullable|string|max:50',
            'aspect_ratio' => 'nullable|string|max:50',
            'seo_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'canonical_url' => 'nullable|string|max:1000',
        ]);

        $category = PortfolioCategory::find($validated['category_id']);
        $validated['category'] = $category?->name ?? 'Architecture';

        // Safe optional year handling (handles null, empty string, or integers safely)
        if (array_key_exists('year', $validated)) {
            $validated['year'] = ($validated['year'] !== null && $validated['year'] !== '' && $validated['year'] !== 'null')
                ? (int) $validated['year']
                : null;
        }

        // Custom slug normalization and uniqueness validation on create
        if (!empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['slug']);
            if (empty($validated['slug'])) {
                return response()->json([
                    'message' => 'The provided slug is invalid.',
                    'errors' => ['slug' => ['The slug format is invalid.']],
                ], 422);
            }
            if (Project::where('slug', $validated['slug'])->exists()) {
                return response()->json([
                    'message' => 'The slug has already been taken.',
                    'errors' => ['slug' => ['The slug has already been taken.']],
                ], 422);
            }
        } else {
            // Auto-slug generation from title
            $baseSlug = Str::slug($validated['title']) ?: 'project';
            $slug = $baseSlug;
            $counter = 1;
            while (Project::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        $publishingStatus = $validated['publishing_status'] ?? 'draft';

        // If trying to save directly as published, validate required publishing criteria
        if ($publishingStatus === 'published') {
            if (empty($validated['cover_image'])) {
                return response()->json([
                    'message' => 'Validation failed for publishing.',
                    'errors' => ['cover_image' => ['A cover image is required before publishing a project.']],
                ], 422);
            }
            $validated['is_published'] = true;
        } else {
            $validated['is_published'] = false;
        }

        $validated['publishing_status'] = $publishingStatus;
        $project = Project::create($validated);

        return response()->json([
            'message' => "Project '{$project->title}' created successfully.",
            'project' => $this->formatAdminProject($project->fresh(['category', 'subcategory', 'client', 'media'])),
        ], 201);
    }

    /**
     * Retrieve full project detail for owner editor.
     */
    public function show(int $id): JsonResponse
    {
        $project = Project::with(['category', 'subcategory', 'client', 'media' => function ($q) {
            $q->orderBy('sort_order');
        }])->findOrFail($id);

        return response()->json([
            'project' => $this->formatAdminProject($project),
        ]);
    }

    /**
     * Update project metadata and configuration.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'category_id' => 'sometimes|required|exists:portfolio_categories,id',
            'subcategory_id' => 'nullable|exists:portfolio_subcategories,id',
            'client_id' => 'nullable|exists:clients,id',
            'subtitle' => 'nullable|string|max:500',
            'location' => 'nullable|string|max:255',
            'year' => 'nullable|integer',
            'project_type' => 'nullable|string|max:255',
            'area' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string|max:1000',
            'publishing_status' => 'nullable|in:draft,published,archived',
            'featured' => 'nullable|boolean',
            'vr_url' => 'nullable|string|max:1000',
            'vr_type' => 'nullable|string|max:50',
            'grid_span' => 'nullable|string|max:50',
            'aspect_ratio' => 'nullable|string|max:50',
            'seo_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'canonical_url' => 'nullable|string|max:1000',
        ]);

        // Safe optional year handling
        if (array_key_exists('year', $validated)) {
            $validated['year'] = ($validated['year'] !== null && $validated['year'] !== '' && $validated['year'] !== 'null')
                ? (int) $validated['year']
                : null;
        }

        if (isset($validated['category_id'])) {
            $category = PortfolioCategory::find($validated['category_id']);
            $validated['category'] = $category?->name ?? $project->category;
        }

        // Custom slug normalization and uniqueness validation on update
        if (array_key_exists('slug', $validated) && !empty($validated['slug'])) {
            $normalizedSlug = Str::slug($validated['slug']);
            if (empty($normalizedSlug)) {
                return response()->json([
                    'message' => 'The project slug cannot be empty or invalid.',
                    'errors' => ['slug' => ['The slug format is invalid.']],
                ], 422);
            }
            if (Project::where('slug', $normalizedSlug)->where('id', '!=', $project->id)->exists()) {
                return response()->json([
                    'message' => 'The slug has already been taken.',
                    'errors' => ['slug' => ['The slug has already been taken.']],
                ], 422);
            }
            $validated['slug'] = $normalizedSlug;
        } elseif (isset($validated['title']) && empty($validated['slug']) && str_starts_with($project->slug, 'untitled-project')) {
            $baseSlug = Str::slug($validated['title']);
            $slug = $baseSlug;
            $counter = 1;
            while (Project::where('slug', $slug)->where('id', '!=', $project->id)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        if (isset($validated['publishing_status']) && $validated['publishing_status'] === 'published') {
            $coverImage = $validated['cover_image'] ?? $project->cover_image;
            if (empty($coverImage)) {
                return response()->json([
                    'message' => 'Validation failed for publishing.',
                    'errors' => ['cover_image' => ['A cover image is required before publishing a project.']],
                ], 422);
            }
            $validated['is_published'] = true;
        } elseif (isset($validated['publishing_status'])) {
            $validated['is_published'] = false;
        }

        $project->update($validated);

        return response()->json([
            'message' => "Project '{$project->title}' updated successfully.",
            'project' => $this->formatAdminProject($project->fresh(['category', 'subcategory', 'client', 'media'])),
        ]);
    }

    /**
     * Duplicate an existing project into a draft copy with cloned gallery assignments.
     */
    public function duplicate(int $id): JsonResponse
    {
        $original = Project::with('media')->findOrFail($id);

        $baseTitle = "{$original->title} (Copy)";
        $baseSlug = Str::slug($baseTitle);
        $slug = $baseSlug;
        $counter = 1;
        while (Project::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $copy = DB::transaction(function () use ($original, $baseTitle, $slug) {
            $clone = $original->replicate([
                'id',
                'created_at',
                'updated_at',
            ]);
            $clone->title = $baseTitle;
            $clone->slug = $slug;
            $clone->publishing_status = 'draft';
            $clone->is_published = false;
            $clone->featured = false;
            $clone->save();

            // Replicate media assignments reusing original media records
            foreach ($original->media as $mediaItem) {
                ProjectMedia::create([
                    'project_id' => $clone->id,
                    'media_id' => $mediaItem->media_id,
                    'url' => $mediaItem->url,
                    'thumbnail_url' => $mediaItem->thumbnail_url,
                    'media_type' => $mediaItem->media_type,
                    'title' => $mediaItem->title,
                    'caption' => $mediaItem->caption,
                    'alt_text' => $mediaItem->alt_text,
                    'room_name' => $mediaItem->room_name,
                    'sort_order' => $mediaItem->sort_order,
                    'is_published' => $mediaItem->is_published,
                ]);
            }

            return $clone;
        });

        return response()->json([
            'message' => "Duplicated project as draft '{$copy->title}'.",
            'project' => $this->formatAdminProject($copy->fresh(['category', 'media'])),
        ], 201);
    }

    /**
     * Explicit publish action with full validation.
     */
    public function publish(int $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $missing = $project->getValidationErrorsForPublishing();
        if (!empty($missing)) {
            return response()->json([
                'message' => 'Project cannot be published due to missing requirements.',
                'errors' => $missing,
            ], 422);
        }

        $project->publishing_status = 'published';
        $project->is_published = true;
        $project->save();

        return response()->json([
            'message' => "Project '{$project->title}' is now published to the public archive.",
            'project' => $this->formatAdminProject($project->fresh(['category', 'media'])),
        ]);
    }

    /**
     * Archive project (hides from public while preserving content and media).
     */
    public function archive(int $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $project->publishing_status = 'archived';
        $project->is_published = false;
        $project->save();

        return response()->json([
            'message' => "Project '{$project->title}' has been archived and hidden from public view.",
            'project' => $this->formatAdminProject($project->fresh(['category', 'media'])),
        ]);
    }

    /**
     * Move project back to draft status.
     */
    public function draft(int $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $project->publishing_status = 'draft';
        $project->is_published = false;
        $project->save();

        return response()->json([
            'message' => "Project '{$project->title}' moved back to draft.",
            'project' => $this->formatAdminProject($project->fresh(['category', 'media'])),
        ]);
    }

    /**
     * Secure owner preview endpoint (accessible regardless of draft/archived status).
     */
    public function preview(int $id): JsonResponse
    {
        $project = Project::with(['category', 'subcategory', 'media' => function ($q) {
            $q->orderBy('sort_order');
        }])->findOrFail($id);

        $mediaList = $project->media
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

        $data = [
            'preview_mode' => true,
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
            'publishing_status' => $project->publishing_status,
            'vr_url' => $project->vr_url,
            'vr_qr_code' => $project->vr_qr_code,
            'show_qr' => (bool) $project->show_qr,
            'vr_type' => $project->vr_type ?: 'external',
            'grid_span' => $project->grid_span ?: 'span-6',
            'aspect_ratio' => $project->aspect_ratio ?: 'ratio-standard',
            'seo_title' => $project->seo_title,
            'meta_description' => $project->meta_description,
            'canonical_url' => $project->canonical_url,
            'media' => $mediaList,
        ];

        return response()->json(array_merge($data, [
            'project' => $data,
        ]));
    }

    /**
     * Safe delete project: removes project and pivot records without removing shared media or client records.
     */
    public function destroy(int $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $title = $project->title;

        $project->delete();

        return response()->json([
            'message' => "Project '{$title}' and its gallery assignments have been safely removed. Shared media library files and client records are preserved.",
        ]);
    }

    /**
     * Helper to format admin response.
     */
    protected function formatAdminProject(Project $p): array
    {
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
            'client_id' => $p->client_id,
            'client_name' => $p->client?->name,
            'project_type' => $p->project_type,
            'area' => $p->area,
            'description' => $p->description,
            'cover_image' => $p->cover_image,
            'status' => $p->status,
            'publishing_status' => $p->publishing_status,
            'is_published' => (bool) $p->is_published,
            'featured' => (bool) $p->featured,
            'vr_url' => $p->vr_url,
            'vr_type' => $p->vr_type,
            'show_qr' => (bool) $p->show_qr,
            'grid_span' => $p->grid_span,
            'aspect_ratio' => $p->aspect_ratio,
            'seo_title' => $p->seo_title,
            'meta_description' => $p->meta_description,
            'canonical_url' => $p->canonical_url,
            'can_be_published' => $p->canBePublished(),
            'missing_fields' => array_values($p->getValidationErrorsForPublishing()),
            'created_at' => $p->created_at?->toIso8601String(),
            'updated_at' => $p->updated_at?->toIso8601String(),
            'media' => $p->media->sortBy('sort_order')->values()->map(function (ProjectMedia $m) {
                return [
                    'id' => $m->id,
                    'media_id' => $m->media_id,
                    'media_type' => $m->media_type,
                    'url' => $m->url,
                    'thumbnail_url' => $m->thumbnail_url ?: $m->url,
                    'title' => $m->title,
                    'caption' => $m->caption,
                    'alt_text' => $m->alt_text,
                    'room_name' => $m->room_name,
                    'sort_order' => $m->sort_order,
                    'is_published' => (bool) $m->is_published,
                ];
            }),
        ];
    }
}
