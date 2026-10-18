<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PortfolioCategory;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    /**
     * List all categories with project counts and subcategories.
     */
    public function index(): JsonResponse
    {
        $categories = PortfolioCategory::with(['subcategories'])
            ->withCount(['projects as total_projects'])
            ->withCount(['projects as published_projects' => function ($q) {
                $q->published();
            }])
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $data = $categories->map(function (PortfolioCategory $c) {
            $total = (int) $c->total_projects;
            $published = (int) $c->published_projects;
            $draft = max(0, $total - $published);

            return [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'description' => $c->description,
                'display_order' => $c->display_order,
                'is_active' => (bool) $c->is_active,
                // Provide both total_projects and total_projects_count for complete frontend/API alignment
                'total_projects' => $total,
                'total_projects_count' => $total,
                'published_projects' => $published,
                'published_projects_count' => $published,
                'draft_projects' => $draft,
                'draft_projects_count' => $draft,
                'subcategories' => $c->subcategories->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'slug' => $s->slug,
                    'display_order' => $s->display_order,
                ]),
                'created_at' => $c->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'categories' => $data,
        ]);
    }

    /**
     * Create a new reusable category.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:portfolio_categories,name',
            'slug' => 'nullable|string|max:100|unique:portfolio_categories,slug',
            'description' => 'nullable|string',
            'display_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        } else {
            $validated['slug'] = Str::slug($validated['slug']);
        }

        $category = PortfolioCategory::create($validated);

        return response()->json([
            'message' => "Category '{$category->name}' created successfully.",
            'category' => $category,
        ], 201);
    }

    /**
     * Update an existing category.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $category = PortfolioCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => "sometimes|required|string|max:100|unique:portfolio_categories,name,{$category->id}",
            'slug' => "nullable|string|max:100|unique:portfolio_categories,slug,{$category->id}",
            'description' => 'nullable|string',
            'display_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['name']) && empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        } elseif (!empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['slug']);
        }

        $category->update($validated);

        return response()->json([
            'message' => "Category '{$category->name}' updated successfully.",
            'category' => $category,
        ]);
    }

    /**
     * Safe category deletion: rejects if projects currently reference this category without replacement.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $reassignTarget = $request->input('target_category_id') ?? $request->input('reassign_to_id');

        if ($reassignTarget) {
            return $this->reassignAndDelete($request, $id);
        }

        $category = PortfolioCategory::withCount('projects')->findOrFail($id);

        if ($category->projects_count > 0) {
            return response()->json([
                'message' => "Cannot delete category '{$category->name}' because it contains {$category->projects_count} associated project(s). Reassign projects first or provide a target replacement category.",
                'projects_count' => $category->projects_count,
            ], 422);
        }

        DB::transaction(function () use ($category) {
            $category->delete();
        });

        return response()->json([
            'message' => "Category '{$category->name}' deleted successfully.",
        ]);
    }

    /**
     * Reassign all projects to a target category and safely delete the source category.
     */
    public function reassignAndDelete(Request $request, int $id): JsonResponse
    {
        $targetId = $request->input('target_category_id') ?? $request->input('reassign_to_id');

        if (!$targetId) {
            return response()->json([
                'message' => 'The target category ID is required for reassignment.',
                'errors' => ['target_category_id' => ['The target category ID is required.']],
            ], 422);
        }

        if ((int) $targetId === (int) $id) {
            return response()->json([
                'message' => 'The target category must be different from the category being deleted.',
                'errors' => ['target_category_id' => ['The target category must be different from the source category.']],
            ], 422);
        }

        $sourceCategory = PortfolioCategory::withCount('projects')->findOrFail($id);
        $targetCategory = PortfolioCategory::find($targetId);

        if (!$targetCategory) {
            return response()->json([
                'message' => 'The selected target category does not exist.',
                'errors' => ['target_category_id' => ['The selected target category is invalid.']],
            ], 422);
        }

        DB::transaction(function () use ($sourceCategory, $targetCategory) {
            // Reassign all projects and synchronize category name
            Project::where('category_id', $sourceCategory->id)->update([
                'category_id' => $targetCategory->id,
                'category' => $targetCategory->name,
            ]);

            // Reassign subcategories if any
            $sourceCategory->subcategories()->update(['category_id' => $targetCategory->id]);

            // Safely delete source category
            $sourceCategory->delete();
        });

        return response()->json([
            'message' => "Reassigned {$sourceCategory->projects_count} project(s) to '{$targetCategory->name}' and safely deleted '{$sourceCategory->name}'.",
        ]);
    }
}
