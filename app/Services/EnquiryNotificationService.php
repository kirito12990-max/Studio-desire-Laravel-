<?php

namespace App\Services;

use App\Mail\NewEnquiryNotification;
use App\Models\ProjectEnquiry;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class EnquiryNotificationService
{
    /**
     * Dispatch an owner email notification for a submitted enquiry.
     * Guaranteed never to fail or roll back the client's submitted enquiry on mail transport errors.
     *
     * @param ProjectEnquiry $enquiry
     * @param bool $force Force resend even if previously sent
     * @return bool Whether the notification was dispatched successfully
     */
    public function notifyOwner(ProjectEnquiry $enquiry, bool $force = false): bool
    {
        // Prevent duplicate notification emails unless forced (e.g. manual retry by owner)
        if ($enquiry->email_sent && !$force) {
            Log::info("Owner notification email for enquiry {$enquiry->reference_number} already dispatched; skipping duplicate send.");
            return true;
        }

        $recipient = $this->resolveRecipientEmail();

        if (empty($recipient)) {
            $msg = 'No owner notification recipient email configured. Please configure ENQUIRY_NOTIFICATION_EMAIL.';
            Log::warning("Enquiry {$enquiry->reference_number}: {$msg}");
            $enquiry->update([
                'email_sent' => false,
                'email_error' => $msg,
            ]);
            return false;
        }

        try {
            Mail::to($recipient)->send(new NewEnquiryNotification($enquiry));

            $enquiry->update([
                'email_sent' => true,
                'email_sent_at' => now(),
                'email_error' => null,
            ]);

            Log::info("Owner notification email for enquiry {$enquiry->reference_number} successfully dispatched to {$recipient}.");
            return true;
        } catch (Throwable $e) {
            $errorMessage = $e->getMessage();
            Log::error("Failed to dispatch owner notification email for enquiry {$enquiry->reference_number}: {$errorMessage}");

            $enquiry->update([
                'email_sent' => false,
                'email_error' => $errorMessage,
            ]);

            return false;
        }
    }

    /**
     * Resolve the target recipient email address for owner notifications.
     */
    public function resolveRecipientEmail(): ?string
    {
        // 1. Configured environment notification recipient
        $configured = env('ENQUIRY_NOTIFICATION_EMAIL', config('mail.enquiry_recipient'));
        if (!empty($configured) && filter_var($configured, FILTER_VALIDATE_EMAIL)) {
            return $configured;
        }

        // 2. Primary active Studio Desire Owner / Admin account email
        $owner = User::whereIn('role', ['OWNER', 'MASTER', 'ADMIN'])
            ->where('is_active', true)
            ->first();

        if ($owner && !empty($owner->email) && filter_var($owner->email, FILTER_VALIDATE_EMAIL)) {
            return $owner->email;
        }

        // 3. Fallback default
        return 'owner@studiodesire.com';
    }

    /**
     * Send a diagnostic test email to verify SMTP transport configuration.
     *
     * @param string $recipient
     * @return array{success: bool, message: string}
     */
    public function testSmtp(string $recipient): array
    {
        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'message' => 'Please provide a valid email address for SMTP diagnostics.',
            ];
        }

        try {
            $fromAddress = config('mail.from.address', 'inquiries@studiodesire.com');
            $fromName = config('mail.from.name', 'Studio Desire');
            $mailer = config('mail.default', 'smtp');
            $host = config("mail.mailers.{$mailer}.host", 'localhost');

            Mail::raw("Studio Desire SMTP Diagnostic Test\n\nConnection to {$host} verified successfully at " . date('Y-m-d H:i:s T'), function ($message) use ($recipient, $fromAddress, $fromName) {
                $message->from($fromAddress, $fromName)
                    ->to($recipient)
                    ->subject('[Studio Desire] SMTP Diagnostic Test Successful');
            });

            return [
                'success' => true,
                'message' => "SMTP diagnostic test email successfully dispatched to {$recipient}.",
            ];
        } catch (Throwable $e) {
            Log::error("SMTP diagnostic test failed: {$e->getMessage()}");
            return [
                'success' => false,
                'message' => 'SMTP test failed: ' . $e->getMessage(),
            ];
        }
    }
}
