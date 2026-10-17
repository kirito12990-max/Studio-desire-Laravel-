<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\EnquiryAttachment;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EnquiryController extends Controller
{
    /**
     * Allowed lifecycle statuses for Studio Desire enquiries.
     */
    protected const LIFECYCLE_STATUSES = [
        'NEW',
        'CONTACTED',
        'IN_DISCUSSION',
        'CONVERTED',
        'CLOSED',
        // Legacy backward compatibility
        'CONSULTATION',
        'PROPOSAL',
        'WON',
        'LOST',
        'ARCHIVED',
    ];

    /**
     * List project inquiries with search, filters, and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProjectEnquiry::with(['attachments', 'client', 'convertedProject', 'originatingProject'])
            ->orderBy('created_at', 'desc');

        // Search text across name, email, phone, reference_number, message, location
        if ($request->filled('q') || $request->filled('search')) {
            $search = '%' . trim($request->input('q') ?: $request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                  ->orWhere('email', 'like', $search)
                  ->orWhere('phone', 'like', $search)
                  ->orWhere('reference_number', 'like', $search)
                  ->orWhere('location', 'like', $search)
                  ->orWhere('message', 'like', $search);
            });
        }

        // Filter by status
        if ($request->filled('status') && strtoupper($request->input('status')) !== 'ALL') {
            $query->where('status', strtoupper($request->input('status')));
        }

        // Filter by project_type
        if ($request->filled('project_type') && strtoupper($request->input('project_type')) !== 'ALL') {
            $query->where('project_type', $request->input('project_type'));
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $enquiries = $query->paginate($perPage);

        return response()->json(array_merge($enquiries->toArray(), [
            'total' => $enquiries->total(),
            'enquiries' => $enquiries->items(),
        ]));
    }

    /**
     * View detailed inquiry record, client association, attachments, and status history.
     */
    public function show(int $id): JsonResponse
    {
        $enquiry = ProjectEnquiry::with(['attachments', 'client', 'convertedProject', 'originatingProject'])
            ->findOrFail($id);

        $data = [
            'id' => $enquiry->id,
            'reference_number' => $enquiry->reference_number,
            'name' => $enquiry->name,
            'email' => $enquiry->email,
            'phone' => $enquiry->phone,
            'project_type' => $enquiry->project_type,
            'location' => $enquiry->location,
            'budget' => $enquiry->budget,
            'timeline' => $enquiry->timeline,
            'message' => $enquiry->message,
            'source' => $enquiry->source,
            'source_page' => $enquiry->source_page,
            'status' => $enquiry->status,
            'internal_notes' => $enquiry->internal_notes,
            'status_history' => $enquiry->status_history ?: [],
            'client_id' => $enquiry->client_id,
            'client' => $enquiry->client,
            'converted_project_id' => $enquiry->converted_project_id,
            'converted_project' => $enquiry->convertedProject ? [
                'id' => $enquiry->convertedProject->id,
                'title' => $enquiry->convertedProject->title,
                'slug' => $enquiry->convertedProject->slug,
                'publishing_status' => $enquiry->convertedProject->publishing_status,
                'is_published' => $enquiry->convertedProject->is_published,
            ] : null,
            'originating_project' => $enquiry->originatingProject ? [
                'id' => $enquiry->originatingProject->id,
                'title' => $enquiry->originatingProject->title,
                'slug' => $enquiry->originatingProject->slug,
            ] : null,
            'attachments' => $enquiry->attachments,
            'created_at' => $enquiry->created_at?->toIso8601String(),
            'updated_at' => $enquiry->updated_at?->toIso8601String(),
        ];

        return response()->json(array_merge($data, [
            'enquiry' => $data,
        ]));
    }

    /**
     * Update enquiry status, owner notes, or client association with status history tracking.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|required|string|in:' . implode(',', self::LIFECYCLE_STATUSES),
            'internal_notes' => 'nullable|string',
            'client_id' => 'nullable|exists:clients,id',
            'project_type' => 'nullable|string|max:100',
        ]);

        $enquiry = ProjectEnquiry::findOrFail($id);

        if (isset($validated['status']) && $validated['status'] !== $enquiry->status) {
            $actor = $request->user()?->name ?: 'Owner';
            $enquiry->recordStatusChange($validated['status'], $actor, $validated['internal_notes'] ?? null);
        }

        if (array_key_exists('internal_notes', $validated)) {
            $enquiry->internal_notes = $validated['internal_notes'];
        }
        if (array_key_exists('client_id', $validated)) {
            $enquiry->client_id = $validated['client_id'];
        }
        if (array_key_exists('project_type', $validated)) {
            $enquiry->project_type = $validated['project_type'];
        }

        $enquiry->save();

        return response()->json([
            'message' => "Enquiry updated successfully (Status: {$enquiry->status}).",
            'enquiry' => $enquiry->fresh(['attachments', 'client', 'convertedProject']),
        ]);
    }

    /**
     * Update enquiry status directly (backward compatibility with Phase 2).
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        return $this->update($request, $id);
    }

    /**
     * Delete an enquiry and purge attachments.
     */
    public function destroy(int $id): JsonResponse
    {
        $enquiry = ProjectEnquiry::findOrFail($id);
        $ref = $enquiry->reference_number;

        // Attachments are cascade-deleted at DB level
        $enquiry->delete();

        return response()->json([
            'message' => "Enquiry {$ref} deleted successfully.",
        ]);
    }

    /**
     * Convert an enquiry into a draft project.
     * Transactional, prevents duplicate conversion, never publishes automatically.
     */
    public function convertToProject(Request $request, int $id): JsonResponse
    {
        $enquiry = ProjectEnquiry::with('client')->findOrFail($id);

        // Prevent duplicate conversion unless deliberate overwrite requested
        if ($enquiry->converted_project_id && !$request->boolean('force', false)) {
            return response()->json([
                'message' => "This enquiry has already been converted to project #{$enquiry->converted_project_id}.",
                'already_converted' => true,
                'project_id' => $enquiry->converted_project_id,
            ], 422);
        }

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'category_id' => 'nullable|exists:portfolio_categories,id',
            'client_id' => 'nullable|exists:clients,id',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $project = DB::transaction(function () use ($enquiry, $validated, $request) {
            // 1. Resolve or establish client record
            $clientId = $validated['client_id'] ?? $enquiry->client_id;
            if (!$clientId && !empty($enquiry->email)) {
                $existingClient = Client::where('email', $enquiry->email)->first();
                if ($existingClient) {
                    $clientId = $existingClient->id;
                } else {
                    $newClient = Client::create([
                        'name' => $enquiry->name,
                        'email' => $enquiry->email,
                        'phone' => $enquiry->phone,
                        'notes' => "Auto-linked from enquiry {$enquiry->reference_number}.",
                        'status' => 'ACTIVE',
                    ]);
                    $clientId = $newClient->id;
                }
                $enquiry->client_id = $clientId;
            }

            // 2. Resolve category
            $category = isset($validated['category_id'])
                ? PortfolioCategory::find($validated['category_id'])
                : PortfolioCategory::first();

            // 3. Formulate project title (deliberate choice, not leaking private data)
            $projectTitle = !empty(trim($validated['title'] ?? ''))
                ? trim($validated['title'])
                : ($enquiry->name . ' Residence');

            // 4. Instantiate DRAFT project (STRICTLY is_published = false)
            $newProject = Project::create([
                'title' => $projectTitle,
                'category_id' => $category?->id ?? 1,
                'category' => $category?->name ?? 'Architecture',
                'client_id' => $clientId,
                'location' => $validated['location'] ?? $enquiry->location ?? 'Jaipur',
                'project_type' => $enquiry->project_type ?? 'Private Residence',
                'description' => $validated['description'] ?? "Architectural project originating from enquiry {$enquiry->reference_number}.",
                'publishing_status' => 'draft',
                'is_published' => false, // NEVER publish automatically
                'featured' => false,
            ]);

            // 5. Update enquiry status and reference to converted project
            $enquiry->converted_project_id = $newProject->id;
            $actor = $request->user()?->name ?: 'Owner';
            $enquiry->recordStatusChange(
                'CONVERTED',
                $actor,
                "Converted into draft project #{$newProject->id} ({$newProject->title})."
            );

            return $newProject;
        });

        return response()->json([
            'success' => true,
            'message' => "Enquiry {$enquiry->reference_number} successfully converted to draft project #{$project->id}.",
            'project_id' => $project->id,
            'project' => [
                'id' => $project->id,
                'title' => $project->title,
                'slug' => $project->slug,
                'publishing_status' => $project->publishing_status,
                'is_published' => $project->is_published,
                'client_id' => $project->client_id,
            ],
        ], 201);
    }

    /**
     * Convert/link an enquiry to a Client record without creating duplicate entries.
     */
    public function convertToClient(Request $request, int $id): JsonResponse
    {
        $enquiry = ProjectEnquiry::findOrFail($id);

        $validated = $request->validate([
            'company' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        // Check if a client with matching email already exists
        $client = null;
        if (!empty($enquiry->email)) {
            $client = Client::where('email', $enquiry->email)->first();
        }

        if ($client) {
            // Link existing client
            $enquiry->client_id = $client->id;
            $enquiry->save();

            return response()->json([
                'success' => true,
                'message' => "Enquiry linked to existing client profile '{$client->name}' ({$client->email}).",
                'client' => $client,
            ]);
        }

        // Create new client record
        $client = Client::create([
            'name' => $enquiry->name,
            'email' => $enquiry->email,
            'phone' => $enquiry->phone,
            'company' => $validated['company'] ?? null,
            'notes' => $validated['notes'] ?? "Client created from enquiry {$enquiry->reference_number}.",
            'status' => 'ACTIVE',
        ]);

        $enquiry->client_id = $client->id;
        $enquiry->save();

        return response()->json([
            'success' => true,
            'message' => "New client profile established for '{$client->name}'.",
            'client' => $client,
        ], 201);
    }

    /**
     * Safely download confidential client proposal attachment.
     */
    public function downloadAttachment(int $enquiryId, int $attachmentId): BinaryFileResponse|JsonResponse
    {
        $enquiry = ProjectEnquiry::findOrFail($enquiryId);
        $attachment = EnquiryAttachment::where('enquiry_id', $enquiry->id)
            ->where('id', $attachmentId)
            ->firstOrFail();

        $path = $attachment->storage_path;

        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json([
                'message' => 'Attachment file not found on private storage.',
            ], 404);
        }

        return response()->download(
            Storage::disk('local')->path($path),
            $attachment->original_filename,
            ['X-Content-Type-Options' => 'nosniff']
        );
    }
}
