<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\EnquiryNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailController extends Controller
{
    public function __construct(
        protected EnquiryNotificationService $notificationService = new EnquiryNotificationService()
    ) {}

    /**
     * Return safe, sanitized email and SMTP settings without exposing passwords or credentials.
     */
    public function getSettings(Request $request): JsonResponse
    {
        $mailer = config('mail.default', 'smtp');
        $smtpConfig = config("mail.mailers.{$mailer}", []);

        $recipient = $this->notificationService->resolveRecipientEmail();

        return response()->json([
            'sender_name' => config('mail.from.name', 'Studio Desire'),
            'sender_email' => config('mail.from.address', 'inquiries@studiodesire.com'),
            'smtp_host' => $smtpConfig['host'] ?? env('MAIL_HOST', 'smtp.hostinger.com'),
            'smtp_port' => (int) ($smtpConfig['port'] ?? env('MAIL_PORT', 465)),
            'security' => $smtpConfig['encryption'] ?? env('MAIL_ENCRYPTION', 'ssl'),
            'smtp_username' => $smtpConfig['username'] ?? env('MAIL_USERNAME', ''),
            'has_password' => !empty($smtpConfig['password'] ?? env('MAIL_PASSWORD')),
            'recipients' => $recipient ? [$recipient] : [],
            'send_customer_confirmation' => false,
        ]);
    }

    /**
     * Dispatch a diagnostic SMTP test email to confirm mail transport health.
     */
    public function testEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to_email' => 'required|email|max:255',
        ]);

        $result = $this->notificationService->testSmtp($validated['to_email']);

        return response()->json($result, $result['success'] ? 200 : 502);
    }
}
