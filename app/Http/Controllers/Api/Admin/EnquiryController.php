<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EnquiryAttachment;
use App\Models\ProjectEnquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EnquiryController extends Controller
{
    /**
     * List project inquiries with status filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProjectEnquiry::with('attachments')
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', strtoupper($request->input('status')));
        }

        $enquiries = $query->paginate(20);

        return response()->json($enquiries);
    }

    /**
     * View detailed inquiry record and attachments.
     */
    public function show(int $id): JsonResponse
    {
        $enquiry = ProjectEnquiry::with(['attachments', 'client', 'convertedProject'])->findOrFail($id);

        return response()->json($enquiry);
    }

    /**
     * Update enquiry review status.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:NEW,CONTACTED,CONSULTATION,PROPOSAL,WON,LOST,ARCHIVED'],
            'internal_notes' => ['nullable', 'string'],
        ]);

        $enquiry = ProjectEnquiry::findOrFail($id);
        $enquiry->status = $validated['status'];
        if ($request->has('internal_notes')) {
            $enquiry->internal_notes = $validated['internal_notes'];
        }
        $enquiry->save();

        return response()->json([
            'message' => "Enquiry status updated to {$enquiry->status}.",
            'enquiry' => $enquiry,
        ]);
    }

    /**
     * Safely download confidential client design attachments.
     * Enforces that the file belongs strictly to the requested enquiry.
     */
    public function downloadAttachment(int $enquiryId, int $attachmentId): BinaryFileResponse|JsonResponse
    {
        $enquiry = ProjectEnquiry::findOrFail($enquiryId);
        $attachment = EnquiryAttachment::where('enquiry_id', $enquiry->id)
            ->where('id', $attachmentId)
            ->firstOrFail();

        $path = $attachment->storage_path;

        if (! Storage::disk('local')->exists($path)) {
            return response()->json([
                'message' => 'Attachment file not found on disk.',
            ], 404);
        }

        return response()->download(
            Storage::disk('local')->path($path),
            $attachment->original_filename,
            [
                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }
}
