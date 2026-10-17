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
                $q->where('is_published', true);
            }])
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $data = $categories->map(function (PortfolioCategory $c) {
            return [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'description' => $c->description,
                'display_order' => $c->display_order,
                'is_active' => (bool) $c->is_active,
                'total_projects' => $c->total_projects,
                'published_projects' => $c->published_projects,
                'draft_projects' => $c->total_projects - $c->published_projects,
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
        }

        $category->update($validated);

        return response()->json([
            'message' => "Category '{$category->name}' updated successfully.",
            'category' => $category,
        ]);
    }

    /**
     * Safe category deletion: rejects if projects currently reference this category.
     */
    public function destroy(int $id): JsonResponse
    {
        $category = PortfolioCategory::withCount('projects')->findOrFail($id);

        if ($category->projects_count > 0) {
            return response()->json([
                'message' => "Cannot delete category '{$category->name}' because it contains {$category->projects_count} associated project(s). Reassign projects first or use reassign-and-delete.",
                'projects_count' => $category->projects_count,
            ], 422);
        }

        $category->delete();

        return response()->json([
            'message' => "Category '{$category->name}' deleted successfully.",
        ]);
    }

    /**
     * Reassign all projects to a target category and safely delete the source category.
     */
    public function reassignAndDelete(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'target_category_id' => 'required|exists:portfolio_categories,id|different:id',
        ]);

        $sourceCategory = PortfolioCategory::withCount('projects')->findOrFail($id);
        $targetCategory = PortfolioCategory::findOrFail($validated['target_category_id']);

        DB::transaction(function () use ($sourceCategory, $targetCategory) {
            // Reassign all projects
            Project::where('category_id', $sourceCategory->id)->update([
                'category_id' => $targetCategory->id,
                'category' => $targetCategory->name,
            ]);

            // Reassign or delete subcategories if any
            $sourceCategory->subcategories()->update(['category_id' => $targetCategory->id]);

            // Safely delete source category
            $sourceCategory->delete();
        });

        return response()->json([
            'message' => "Reassigned {$sourceCategory->projects_count} project(s) to '{$targetCategory->name}' and safely deleted '{$sourceCategory->name}'.",
        ]);
    }
}
