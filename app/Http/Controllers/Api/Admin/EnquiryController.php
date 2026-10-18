<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\EnquiryAttachment;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use App\Services\EnquiryNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EnquiryController extends Controller
{
    public function __construct(
        protected EnquiryNotificationService $notificationService = new EnquiryNotificationService()
    ) {}

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

        // Search text across name, email, phone, reference_number, message, location, subject
        if ($request->filled('q') || $request->filled('search')) {
            $search = '%' . trim($request->input('q') ?: $request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                  ->orWhere('email', 'like', $search)
                  ->orWhere('phone', 'like', $search)
                  ->orWhere('reference_number', 'like', $search)
                  ->orWhere('subject', 'like', $search)
                  ->orWhere('location', 'like', $search)
                  ->orWhere('message', 'like', $search);
            });
        }

        // Filter by status
        if ($request->filled('status') && strtoupper($request->input('status')) !== 'ALL') {
            $query->where('status', strtoupper($request->input('status')));
        }

        // Filter by source (e.g. contact_form vs website)
        if ($request->filled('source') && strtoupper($request->input('source')) !== 'ALL') {
            $query->where('source', $request->input('source'));
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

        $items = collect($enquiries->items())->map(function (ProjectEnquiry $e) {
            $attCount = $e->attachments->count();
            return [
                'id' => $e->id,
                'reference_number' => $e->reference_number,
                'name' => $e->name,
                'email' => $e->email,
                'phone' => $e->phone ?: '',
                'subject' => $e->subject ?: $e->project_type,
                'project_type' => $e->project_type,
                'location' => $e->location,
                'budget' => $e->budget,
                'timeline' => $e->timeline,
                'message' => $e->message,
                'source' => $e->source,
                'source_page' => $e->source_page,
                'status' => $e->status,
                'internal_notes' => $e->internal_notes,
                'email_sent' => (bool) $e->email_sent,
                'email_sent_at' => $e->email_sent_at?->toIso8601String(),
                'email_error' => $e->email_error,
                'attachments_count' => $attCount,
                'attachment_count' => $attCount,
                'converted_project_id' => $e->converted_project_id,
                'converted_client_id' => $e->client_id,
                'client_id' => $e->client_id,
                'created_at' => $e->created_at?->toIso8601String(),
                'updated_at' => $e->updated_at?->toIso8601String(),
            ];
        });

        return response()->json(array_merge($enquiries->toArray(), [
            'total' => $enquiries->total(),
            'enquiries' => $items,
            'items' => $items,
        ]));
    }

    /**
     * View detailed inquiry record, client association, attachments, and status history.
     */
    public function show(int $id): JsonResponse
    {
        $enquiry = ProjectEnquiry::with(['attachments', 'client', 'convertedProject', 'originatingProject'])
            ->findOrFail($id);

        $attCount = $enquiry->attachments->count();

        $data = [
            'id' => $enquiry->id,
            'reference_number' => $enquiry->reference_number,
            'name' => $enquiry->name,
            'email' => $enquiry->email,
            'phone' => $enquiry->phone,
            'subject' => $enquiry->subject ?: $enquiry->project_type,
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
            'email_sent' => (bool) $enquiry->email_sent,
            'email_sent_at' => $enquiry->email_sent_at?->toIso8601String(),
            'email_error' => $enquiry->email_error,
            'attachments_count' => $attCount,
            'attachment_count' => $attCount,
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
     * Convert an enquiry into an unpublished draft project.
     * Strictly protects client confidentiality:
     * - Defaults title to 'Untitled project' (never leaks client name into public title or slug)
     * - Leaves public description empty (never copies enquiry reference or client notes)
     * - Leaves public location empty (never defaults to Jaipur or copies private client location)
     * - Strictly creates as unpublished draft (publishing_status='draft', is_published=false)
     * - Preserves enquiry reference only as private internal association
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
            // 1. Resolve or establish private internal client record
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

            // 3. Strict privacy: Default title to 'Untitled project', never client name
            $projectTitle = !empty(trim($validated['title'] ?? ''))
                ? trim($validated['title'])
                : 'Untitled project';

            // 4. Strict privacy: Default public location and description to null
            $projectLocation = !empty(trim($validated['location'] ?? ''))
                ? trim($validated['location'])
                : null;

            $projectDescription = !empty(trim($validated['description'] ?? ''))
                ? trim($validated['description'])
                : null;

            // 5. Instantiate strictly DRAFT project (NEVER publish automatically)
            $newProject = Project::create([
                'title' => $projectTitle,
                'category_id' => $category?->id ?? 1,
                'category' => $category?->name ?? 'Architecture',
                'client_id' => $clientId,
                'location' => $projectLocation,
                'project_type' => $enquiry->project_type ?: 'Architecture',
                'description' => $projectDescription,
                'publishing_status' => 'draft',
                'is_published' => false,
                'featured' => false,
            ]);

            // 6. Update enquiry status and private internal reference to converted project
            $enquiry->converted_project_id = $newProject->id;
            $actor = $request->user()?->name ?: 'Owner';
            $enquiry->recordStatusChange(
                'CONVERTED',
                $actor,
                "Converted into draft project #{$newProject->id}."
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
     * Retry sending owner email alert for a specific enquiry.
     */
    public function retryEmail(int $id): JsonResponse
    {
        $enquiry = ProjectEnquiry::findOrFail($id);

        $sent = $this->notificationService->notifyOwner($enquiry, force: true);

        return response()->json([
            'success' => $sent,
            'message' => $sent
                ? "Notification email for enquiry {$enquiry->reference_number} successfully sent."
                : "Failed to dispatch email notification: " . ($enquiry->fresh()->email_error ?: 'Unknown mail transport error.'),
            'email_sent' => $sent,
            'email_error' => $enquiry->fresh()->email_error,
            'enquiry' => $enquiry->fresh(),
        ], $sent ? 200 : 502);
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
                'message' => "Enquiry linked to existing client record: {$client->name}.",
                'client_id' => $client->id,
                'client' => $client,
                'created_new' => false,
            ]);
        }

        // Create new client record
        $client = Client::create([
            'name' => $enquiry->name,
            'email' => $enquiry->email,
            'phone' => $enquiry->phone,
            'company' => $validated['company'] ?? null,
            'address' => $enquiry->location,
            'notes' => $validated['notes'] ?? "Client originated from enquiry {$enquiry->reference_number}.",
            'status' => 'ACTIVE',
        ]);

        $enquiry->client_id = $client->id;
        $enquiry->save();

        return response()->json([
            'success' => true,
            'message' => "New client record created and linked: {$client->name}.",
            'client_id' => $client->id,
            'client' => $client,
            'created_new' => true,
        ], 201);
    }

    /**
     * Stream or download confidential attachment with strict owner authentication.
     */
    public function downloadAttachment(int $id, int $attachmentId): BinaryFileResponse|JsonResponse
    {
        $enquiry = ProjectEnquiry::findOrFail($id);
        $attachment = EnquiryAttachment::where('enquiry_id', $enquiry->id)
            ->where('id', $attachmentId)
            ->firstOrFail();

        if (!Storage::disk('local')->exists($attachment->storage_path)) {
            return response()->json([
                'message' => 'Requested file is no longer available on private storage.',
            ], 404);
        }

        $fullPath = Storage::disk('local')->path($attachment->storage_path);

        return response()->download(
            $fullPath,
            $attachment->original_filename,
            [
                'Content-Type' => $attachment->mime_type ?: 'application/octet-stream',
                'Cache-Control' => 'no-store, private',
                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }
}
