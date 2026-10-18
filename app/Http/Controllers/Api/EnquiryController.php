<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactInquiry;
use App\Models\EnquiryAttachment;
use App\Models\ProjectEnquiry;
use App\Services\EnquiryNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class EnquiryController extends Controller
{
    public function __construct(
        protected EnquiryNotificationService $notificationService = new EnquiryNotificationService()
    ) {}

    /**
     * Return public enquiry form configuration (services, budget ranges, timelines).
     */
    public function config(): JsonResponse
    {
        $services = [
            'Full Architectural Planning & Construction',
            'Interior Architecture & Bespoke Millwork',
            '3D Visualization & VR Immersion Experience',
            'Turn-Key Spatial Execution & Styling',
            'Comprehensive Spatial Masterplan',
        ];
        $budgetRanges = [
            '₹25 Lakhs – ₹50 Lakhs',
            '₹50 Lakhs – ₹1 Crore',
            '₹1 Crore – ₹3 Crores',
            '₹3 Crores+',
            'Confidential / Custom Scope',
        ];
        $timelines = [
            'Immediate (Within 1 Month)',
            '1 – 3 Months',
            '3 – 6 Months',
            'Planning Phase (6+ Months)',
        ];

        return response()->json([
            'services' => $services,
            'project_types' => $services,
            'budget_ranges' => $budgetRanges,
            'timelines' => $timelines,
            'timeline_options' => $timelines,
        ]);
    }

    /**
     * Submit an architectural project enquiry from the public website.
     */
    public function submit(Request $request): JsonResponse
    {
        // 1. Honeypot spam protection
        if ($request->filled('_honey') || $request->filled('website_url')) {
            return response()->json([
                'success' => true,
                'message' => 'Thank you for your enquiry. We will be in touch shortly.',
            ], 200);
        }

        // 2. Rate limiting (max 5 submissions per 10 minutes per IP)
        $ip = $request->ip() ?: '127.0.0.1';
        $throttleKey = 'enquiry_submission|' . $ip;

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => 'Too many enquiry submissions. Please wait before trying again.',
                'retry_after' => $seconds,
            ], 429);
        }

        RateLimiter::hit($throttleKey, 600);

        // 3. Server-side validation
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:100',
            'message' => 'required|string|max:5000',
            'project_type' => 'nullable|string|max:100',
            'service' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:255',
            'budget' => 'nullable|string|max:100',
            'timeline' => 'nullable|string|max:100',
            'source' => 'nullable|string|max:50',
            'source_page' => 'nullable|string|max:255',
            'originating_project_id' => 'nullable|exists:projects,id',
            'attachment' => 'nullable|file|max:25600|mimes:pdf,dwg,dxf,zip,jpg,png',
        ]);

        // 4. Clean and sanitize administrative inputs
        $projectType = $validated['project_type'] ?? $validated['service'] ?? 'Architecture';

        $maxAttempts = 3;
        $attempt = 0;
        $enquiry = null;

        while ($attempt < $maxAttempts && !$enquiry) {
            $attempt++;
            try {
                $enquiry = ProjectEnquiry::create([
                    'reference_number' => ProjectEnquiry::generateUniqueReference(),
                    'name' => trim($validated['name']),
                    'email' => strtolower(trim($validated['email'])),
                    'phone' => isset($validated['phone']) ? trim($validated['phone']) : null,
                    'subject' => $projectType,
                    'project_type' => $projectType,
                    'location' => $validated['location'] ?? null,
                    'budget' => $validated['budget'] ?? null,
                    'timeline' => $validated['timeline'] ?? null,
                    'message' => trim($validated['message']),
                    'source' => $validated['source'] ?? 'website',
                    'source_page' => $validated['source_page'] ?? null,
                    'originating_project_id' => $validated['originating_project_id'] ?? null,
                    'status' => 'NEW', // Force initial lifecycle status
                    'internal_notes' => null, // Never accept client-supplied internal notes
                    'converted_project_id' => null,
                    'ip_address' => $ip,
                    'user_agent' => substr((string) $request->userAgent(), 0, 500),
                    'email_sent' => false,
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                if ($attempt >= $maxAttempts) {
                    return response()->json([
                        'message' => 'Unable to record enquiry at this time due to high submission volume. Please try again.',
                    ], 422);
                }
            }
        }

        if (!$enquiry) {
            return response()->json([
                'message' => 'Unable to process enquiry. Please try again.',
            ], 422);
        }

        // 5. Store optional confidential attachment on private storage
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $originalName = $file->getClientOriginalName();
            $path = $file->store('enquiry_attachments/' . date('Y/m'), 'local');
            $extension = strtolower($file->getClientOriginalExtension());
            $fileType = in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'avif']) ? 'image' : ($extension === 'pdf' ? 'pdf' : 'document');

            EnquiryAttachment::create([
                'enquiry_id' => $enquiry->id,
                'original_filename' => $originalName,
                'filename' => basename($path),
                'file_type' => $fileType,
                'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                'file_size' => $file->getSize(),
                'storage_path' => $path,
            ]);
        }

        // 6. Asynchronously or synchronously dispatch owner notification email
        $this->notificationService->notifyOwner($enquiry);

        return response()->json([
            'success' => true,
            'message' => 'Thank you for reaching out to Studio Desire. Your architectural enquiry has been received.',
            'reference_number' => $enquiry->reference_number,
            'enquiry_id' => $enquiry->id,
            'email_sent' => (bool) $enquiry->fresh()->email_sent,
        ], 201);
    }

    /**
     * Submit a general contact form message.
     * Records into unified enquiry inbox with source='contact_form' and dispatches owner email alert.
     */
    public function contact(Request $request): JsonResponse
    {
        if ($request->filled('_honey') || $request->filled('website_url')) {
            return response()->json([
                'success' => true,
                'message' => 'Message received.',
            ]);
        }

        $ip = $request->ip() ?: '127.0.0.1';
        $throttleKey = 'contact_submission|' . $ip;

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => 'Too many contact submissions. Please wait before trying again.',
                'retry_after' => $seconds,
            ], 429);
        }

        RateLimiter::hit($throttleKey, 600);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:100',
            'subject' => 'nullable|string|max:255',
            'message' => 'required|string|max:5000',
        ]);

        $subject = !empty(trim($validated['subject'] ?? '')) ? trim($validated['subject']) : 'General Contact';

        // 1. Maintain backward-compatible contact_inquiries record
        $contactInquiry = ContactInquiry::create([
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'phone' => $validated['phone'] ?? null,
            'subject' => $subject,
            'message' => trim($validated['message']),
            'status' => 'NEW',
            'ip_address' => $ip,
        ]);

        // 2. Unify into main owner enquiry inbox
        $maxAttempts = 3;
        $attempt = 0;
        $enquiry = null;

        while ($attempt < $maxAttempts && !$enquiry) {
            $attempt++;
            try {
                $enquiry = ProjectEnquiry::create([
                    'reference_number' => ProjectEnquiry::generateUniqueReference(),
                    'name' => trim($validated['name']),
                    'email' => strtolower(trim($validated['email'])),
                    'phone' => $validated['phone'] ?? null,
                    'subject' => $subject,
                    'project_type' => $subject,
                    'location' => null,
                    'budget' => null,
                    'timeline' => null,
                    'message' => trim($validated['message']),
                    'source' => 'contact_form',
                    'source_page' => '/contact',
                    'status' => 'NEW',
                    'internal_notes' => null,
                    'converted_project_id' => null,
                    'ip_address' => $ip,
                    'user_agent' => substr((string) $request->userAgent(), 0, 500),
                    'email_sent' => false,
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                if ($attempt >= $maxAttempts) {
                    // Even if project_enquiries unique constraint retries fail, contactInquiry was saved
                    break;
                }
            }
        }

        // 3. Dispatch owner notification email
        if ($enquiry) {
            $this->notificationService->notifyOwner($enquiry);
        }

        return response()->json([
            'success' => true,
            'message' => 'Thank you for contacting Studio Desire. Your message has been delivered.',
            'reference_number' => $enquiry?->reference_number,
            'enquiry_id' => $enquiry?->id ?: $contactInquiry->id,
            'email_sent' => $enquiry ? (bool) $enquiry->fresh()->email_sent : false,
        ], 201);
    }
}
