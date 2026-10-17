<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Media;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    /**
     * Dangerous file extensions strictly forbidden from upload.
     */
    protected const FORBIDDEN_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'phtml', 'phar',
        'exe', 'bat', 'cmd', 'sh', 'bash', 'vbs', 'ps1',
        'js', 'html', 'htm', 'xhtml', 'shtml', 'svg',
        'asp', 'aspx', 'jsp', 'cgi', 'pl', 'py'
    ];

    /**
     * Allowed file extensions and corresponding MIME groups.
     */
    protected const ALLOWED_EXTENSIONS = [
        'jpg' => 'image', 'jpeg' => 'image', 'png' => 'image', 'webp' => 'image', 'avif' => 'image',
        'mp4' => 'video', 'mov' => 'video', 'webm' => 'video',
        'pdf' => 'document', 'dwg' => 'blueprint', 'dxf' => 'blueprint',
    ];

    /**
     * List media library items with rich filtering and assignment tracking.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Media::with(['projectAssignments.project']);

        // Filter: all, project, unassigned, images, videos, 3d, documents
        $filter = strtolower($request->input('filter', 'all'));
        switch ($filter) {
            case 'unassigned':
                $query->whereDoesntHave('projectAssignments');
                break;
            case 'project':
                $query->whereHas('projectAssignments');
                if ($request->filled('project_id')) {
                    $query->whereHas('projectAssignments', function ($q) use ($request) {
                        $q->where('project_id', $request->input('project_id'));
                    });
                }
                break;
            case 'images':
            case 'image':
                $query->where('media_type', 'image');
                break;
            case 'videos':
            case 'video':
                $query->where('media_type', 'video');
                break;
            case '3d':
                $query->where('media_type', '3d');
                break;
            case 'documents':
            case 'document':
                $query->whereIn('media_type', ['document', 'blueprint']);
                break;
        }

        // Direct project_id filter
        if ($request->filled('project_id') && $filter !== 'unassigned') {
            $query->whereHas('projectAssignments', function ($q) use ($request) {
                $q->where('project_id', $request->input('project_id'));
            });
        }

        // Search text
        if ($request->filled('q')) {
            $search = '%' . trim($request->input('q')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                  ->orWhere('original_name', 'like', $search)
                  ->orWhere('alt_text', 'like', $search);
            });
        }

        $items = $query->orderByDesc('id')->get();

        $data = $items->map(function (Media $m) {
            $projects = $m->projectAssignments->map(function (ProjectMedia $pm) {
                return [
                    'project_id' => $pm->project_id,
                    'project_title' => $pm->project?->title,
                    'project_media_id' => $pm->id,
                    'caption' => $pm->caption,
                    'sort_order' => $pm->sort_order,
                ];
            });

            return [
                'id' => $m->id,
                'filename' => $m->filename,
                'original_name' => $m->original_name,
                'url' => $m->url,
                'thumbnail_url' => $m->thumbnail_url ?: $m->url,
                'media_type' => $m->media_type,
                'mime_type' => $m->mime_type,
                'file_size' => $m->file_size,
                'dimensions' => $m->dimensions,
                'title' => $m->title,
                'alt_text' => $m->alt_text,
                'is_public' => (bool) $m->is_public,
                'is_assigned' => $projects->isNotEmpty(),
                'assignment_count' => $projects->count(),
                'assigned_projects' => $projects,
                'created_at' => $m->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'total' => $data->count(),
            'media' => $data,
        ]);
    }

    /**
     * Multi-file upload with strict validation, safe naming, and optional project assignment.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'files' => 'required|array|min:1',
            'files.*' => 'required|file',
            'project_id' => 'nullable|exists:projects,id',
            'media_type' => 'nullable|string|in:image,video,3d,document,blueprint',
        ]);

        $uploadedRecords = [];
        $errors = [];
        $projectId = $request->input('project_id');
        $project = $projectId ? Project::find($projectId) : null;

        foreach ($request->file('files') as $index => $file) {
            $originalName = $file->getClientOriginalName();
            $extension = strtolower($file->getClientOriginalExtension());
            $realMime = $file->getMimeType();

            // 1. Strict security check: block dangerous extensions
            if (in_array($extension, self::FORBIDDEN_EXTENSIONS)) {
                $errors[] = [
                    'file' => $originalName,
                    'error' => "Dangerous file extension '.{$extension}' is strictly prohibited for security.",
                ];
                continue;
            }

            // 2. Validate allowed extensions and content
            if (!array_key_exists($extension, self::ALLOWED_EXTENSIONS)) {
                $errors[] = [
                    'file' => $originalName,
                    'error' => "Unsupported file format '.{$extension}'. Supported formats: JPG, PNG, WEBP, AVIF, MP4, MOV, WEBM, PDF, DWG, DXF.",
                ];
                continue;
            }

            $detectedType = $request->input('media_type') ?: self::ALLOWED_EXTENSIONS[$extension];

            // 3. File size validation based on type
            $fileSizeBytes = $file->getSize();
            $maxBytes = $detectedType === 'image' ? 15 * 1024 * 1024 : 50 * 1024 * 1024;
            if ($fileSizeBytes > $maxBytes) {
                $limitMb = $maxBytes / (1024 * 1024);
                $errors[] = [
                    'file' => $originalName,
                    'error' => "File exceeds maximum allowed size of {$limitMb}MB.",
                ];
                continue;
            }

            // 4. Safe unique filename generation
            $safeBase = Str::slug(pathinfo($originalName, PATHINFO_FILENAME));
            $safeFilename = date('Ymd_His') . '_' . Str::random(8) . '_' . ($safeBase ?: 'asset') . '.' . $extension;
            $relativeDir = 'media/' . date('Y/m');

            // 5. Store file using Laravel Storage abstraction
            $path = $file->storeAs($relativeDir, $safeFilename, 'public');
            /** @var \Illuminate\Filesystem\FilesystemAdapter $publicDisk */
            $publicDisk = Storage::disk('public');
            $publicUrl = $publicDisk->url($path);

            // 6. Extract image dimensions if image
            $dimensions = null;
            if ($detectedType === 'image') {
                $imageInfo = @getimagesize($file->getRealPath());
                if ($imageInfo) {
                    $dimensions = "{$imageInfo[0]}x{$imageInfo[1]}";
                }
            }

            // 7. Save to Media database table
            $media = Media::create([
                'filename' => $safeFilename,
                'original_name' => $originalName,
                'url' => $publicUrl,
                'thumbnail_url' => $publicUrl,
                'media_type' => $detectedType,
                'mime_type' => $realMime ?: 'application/octet-stream',
                'file_size' => $fileSizeBytes,
                'dimensions' => $dimensions,
                'title' => pathinfo($originalName, PATHINFO_FILENAME),
                'alt_text' => pathinfo($originalName, PATHINFO_FILENAME),
                'is_public' => true,
                'created_by' => $request->user()?->id,
            ]);

            // 8. If project was selected, assign to project gallery
            if ($project) {
                $maxSort = ProjectMedia::where('project_id', $project->id)->max('sort_order') ?? 0;
                $projectMedia = ProjectMedia::create([
                    'project_id' => $project->id,
                    'media_id' => $media->id,
                    'url' => $media->url,
                    'thumbnail_url' => $media->thumbnail_url,
                    'media_type' => $media->media_type,
                    'title' => $media->title,
                    'caption' => null,
                    'alt_text' => $media->alt_text,
                    'sort_order' => $maxSort + 1,
                    'is_published' => true,
                ]);

                // If project lacks a cover image and this is an image, set as cover
                if (empty($project->cover_image) && $detectedType === 'image') {
                    $project->cover_image = $media->url;
                    $project->save();
                }
            }

            $uploadedRecords[] = [
                'id' => $media->id,
                'url' => $media->url,
                'filename' => $media->filename,
                'original_name' => $media->original_name,
                'media_type' => $media->media_type,
                'file_size' => $media->file_size,
                'dimensions' => $media->dimensions,
                'project_id' => $projectId,
            ];
        }

        return response()->json([
            'message' => count($uploadedRecords) . ' file(s) uploaded successfully.',
            'uploaded' => $uploadedRecords,
            'errors' => $errors,
        ], count($uploadedRecords) > 0 ? 201 : 422);
    }

    /**
     * Assign an existing media item to a project (reusable media without file duplication).
     */
    public function assign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'media_id' => 'required|exists:media,id',
            'project_id' => 'required|exists:projects,id',
            'caption' => 'nullable|string|max:500',
            'alt_text' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer',
        ]);

        $media = Media::findOrFail($validated['media_id']);
        $project = Project::findOrFail($validated['project_id']);

        $nextOrder = $validated['sort_order'] ?? (ProjectMedia::where('project_id', $project->id)->max('sort_order') + 1);

        $assignment = ProjectMedia::create([
            'project_id' => $project->id,
            'media_id' => $media->id,
            'url' => $media->url,
            'thumbnail_url' => $media->thumbnail_url ?: $media->url,
            'media_type' => $media->media_type,
            'title' => $media->title,
            'caption' => $validated['caption'] ?? null,
            'alt_text' => $validated['alt_text'] ?? $media->alt_text,
            'sort_order' => $nextOrder,
            'is_published' => true,
        ]);

        // Auto-assign as project cover image if project cover is currently empty
        if (empty($project->cover_image) && $media->media_type === 'image') {
            $project->cover_image = $media->url;
            $project->save();
        }

        return response()->json([
            'message' => "Media asset assigned to project '{$project->title}'.",
            'assignment' => $assignment,
        ], 201);
    }

    /**
     * Unassign media from a project without deleting the shared media library record.
     */
    public function unassign(int $projectMediaId): JsonResponse
    {
        $assignment = ProjectMedia::findOrFail($projectMediaId);
        $projectId = $assignment->project_id;
        $assignment->delete();

        return response()->json([
            'message' => 'Media unassigned from project successfully. Shared library file is preserved.',
            'project_id' => $projectId,
        ]);
    }

    /**
     * Persist gallery drag-and-drop display ordering for a project.
     */
    public function reorder(Request $request, int $projectId): JsonResponse
    {
        $validated = $request->validate([
            'ordered_ids' => 'required|array|min:1',
            'ordered_ids.*' => 'required|integer',
        ]);

        $project = Project::findOrFail($projectId);

        DB::transaction(function () use ($project, $validated) {
            foreach ($validated['ordered_ids'] as $index => $id) {
                ProjectMedia::where('project_id', $project->id)
                    ->where('id', $id)
                    ->update(['sort_order' => $index + 1]);
            }
        });

        return response()->json([
            'message' => 'Gallery ordering updated successfully.',
            'media' => ProjectMedia::where('project_id', $project->id)->orderBy('sort_order')->get(),
        ]);
    }

    /**
     * Update caption, alt text, or metadata on a specific project-media assignment.
     */
    public function updateProjectMedia(Request $request, int $projectMediaId): JsonResponse
    {
        $assignment = ProjectMedia::findOrFail($projectMediaId);

        $validated = $request->validate([
            'caption' => 'nullable|string|max:500',
            'alt_text' => 'nullable|string|max:500',
            'room_name' => 'nullable|string|max:100',
            'is_published' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $assignment->update($validated);

        return response()->json([
            'message' => 'Project media item updated.',
            'assignment' => $assignment,
        ]);
    }

    /**
     * Update master media record metadata in the library.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $media = Media::findOrFail($id);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'alt_text' => 'nullable|string|max:500',
            'is_public' => 'nullable|boolean',
        ]);

        $media->update($validated);

        return response()->json([
            'message' => 'Media metadata updated.',
            'media' => $media,
        ]);
    }

    /**
     * Delete an unassigned media asset from library and disk.
     */
    public function destroy(int $id): JsonResponse
    {
        $media = Media::withCount('projectAssignments')->findOrFail($id);

        if ($media->project_assignments_count > 0) {
            return response()->json([
                'message' => "Cannot delete media asset because it is currently assigned to {$media->project_assignments_count} project(s). Please unassign it first.",
            ], 422);
        }

        // Remove file from disk
        if ($media->url) {
            $parsed = parse_url($media->url, PHP_URL_PATH);
            $relativePath = str_replace('/storage/', '', $parsed);
            Storage::disk('public')->delete($relativePath);
        }

        $media->delete();

        return response()->json([
            'message' => 'Media asset removed from library and storage.',
        ]);
    }

    /**
     * Explicit "Create New Project from Selected Media" action.
     */
    public function createProjectFromSelection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'media_ids' => 'required|array|min:1',
            'media_ids.*' => 'required|exists:media,id',
            'title' => 'nullable|string|max:255',
            'category_id' => 'nullable|exists:portfolio_categories,id',
        ]);

        $category = isset($validated['category_id'])
            ? PortfolioCategory::find($validated['category_id'])
            : PortfolioCategory::first();

        $projectTitle = !empty(trim($validated['title'] ?? ''))
            ? trim($validated['title'])
            : 'New Space ' . date('Y-m-d H:i');

        $project = DB::transaction(function () use ($projectTitle, $category, $validated) {
            $mediaItems = Media::whereIn('id', $validated['media_ids'])->get();
            $firstImage = $mediaItems->firstWhere('media_type', 'image');

            $newProject = Project::create([
                'title' => $projectTitle,
                'category_id' => $category?->id ?? 1,
                'category' => $category?->name ?? 'Architecture',
                'cover_image' => $firstImage?->url,
                'publishing_status' => 'draft',
                'is_published' => false,
                'featured' => false,
            ]);

            foreach ($validated['media_ids'] as $sortIndex => $mediaId) {
                $media = $mediaItems->firstWhere('id', $mediaId);
                if ($media) {
                    ProjectMedia::create([
                        'project_id' => $newProject->id,
                        'media_id' => $media->id,
                        'url' => $media->url,
                        'thumbnail_url' => $media->thumbnail_url ?: $media->url,
                        'media_type' => $media->media_type,
                        'title' => $media->title,
                        'caption' => null,
                        'alt_text' => $media->alt_text,
                        'sort_order' => $sortIndex + 1,
                        'is_published' => true,
                    ]);
                }
            }

            return $newProject;
        });

        return response()->json([
            'message' => "Draft project '{$project->title}' created from " . count($validated['media_ids']) . " selected media assets.",
            'project' => $project->fresh(['category', 'media']),
        ], 201);
    }
}
