<?php

namespace App\Mail;

use App\Models\ProjectEnquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewEnquiryNotification extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public ProjectEnquiry $enquiry
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $fromAddress = config('mail.from.address', 'inquiries@studiodesire.com');
        $fromName = config('mail.from.name', 'Studio Desire');

        $typeLabel = $this->enquiry->source === 'contact_form' ? 'Contact Message' : 'Project Enquiry';
        $subject = "[Studio Desire] New {$typeLabel}: {$this->enquiry->reference_number} from {$this->enquiry->name}";

        return new Envelope(
            from: new Address($fromAddress, $fromName),
            replyTo: [
                new Address($this->enquiry->email, $this->enquiry->name),
            ],
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    /**
     * Render polished HTML content for the notification email.
     */
    protected function buildHtml(): string
    {
        $appUrl = rtrim(config('app.url', 'http://127.0.0.1:8080'), '/');
        $portalUrl = $appUrl . '/#owner/enquiries';

        $sourceLabel = $this->enquiry->source === 'contact_form' ? 'Website Contact Form' : 'Portfolio Enquiry Form';
        $submittedAt = $this->enquiry->created_at ? $this->enquiry->created_at->format('d M Y, h:i A T') : date('d M Y, h:i A');

        $phoneHtml = $this->enquiry->phone
            ? '<tr><td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 140px;">Phone:</td><td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">' . e($this->enquiry->phone) . '</td></tr>'
            : '';

        $typeHtml = $this->enquiry->project_type
            ? '<tr><td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 140px;">Project / Subject:</td><td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">' . e($this->enquiry->project_type) . '</td></tr>'
            : '';

        $locationHtml = $this->enquiry->location
            ? '<tr><td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 140px;">Location:</td><td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">' . e($this->enquiry->location) . '</td></tr>'
            : '';

        $budgetHtml = $this->enquiry->budget
            ? '<tr><td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 140px;">Estimated Budget:</td><td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">' . e($this->enquiry->budget) . '</td></tr>'
            : '';

        $timelineHtml = $this->enquiry->timeline
            ? '<tr><td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 140px;">Target Timeline:</td><td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">' . e($this->enquiry->timeline) . '</td></tr>'
            : '';

        $messageBody = nl2br(e($this->enquiry->message));

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Studio Desire Enquiry</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #18181b; padding: 32px 40px; text-align: left;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">STUDIO DESIRE</h1>
              <p style="margin: 6px 0 0 0; color: #a1a1aa; font-size: 13px;">New Client Communication Received</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 36px 40px;">
              <div style="background-color: #f4f4f5; border-left: 4px solid #18181b; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
                <span style="font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Reference Number</span>
                <div style="font-size: 18px; font-weight: 700; color: #18181b; margin-top: 2px;">{$this->enquiry->reference_number}</div>
              </div>

              <h2 style="font-size: 16px; font-weight: 600; color: #18181b; margin: 0 0 16px 0; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">Contact & Project Details</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 140px;">Client Name:</td>
                  <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600;">{$this->enquiry->name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 140px;">Email Address:</td>
                  <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;"><a href="mailto:{$this->enquiry->email}" style="color: #2563eb; text-decoration: none;">{$this->enquiry->email}</a></td>
                </tr>
                {$phoneHtml}
                {$typeHtml}
                {$locationHtml}
                {$budgetHtml}
                {$timelineHtml}
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 140px;">Source:</td>
                  <td style="padding: 8px 0; color: #18181b; font-size: 14px;">{$sourceLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 140px;">Submitted At:</td>
                  <td style="padding: 8px 0; color: #18181b; font-size: 14px;">{$submittedAt}</td>
                </tr>
              </table>

              <h2 style="font-size: 16px; font-weight: 600; color: #18181b; margin: 24px 0 12px 0; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">Client Message</h2>
              <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 18px; color: #27272a; font-size: 14px; line-height: 1.6; margin-bottom: 32px;">
                {$messageBody}
              </div>

              <!-- Button CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top: 10px;">
                <tr>
                  <td style="border-radius: 6px; background-color: #18181b; text-align: center;">
                    <a href="{$portalUrl}" target="_blank" style="background-color: #18181b; border: 1px solid #18181b; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">View in Owner Portal &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; border-top: 1px solid #e4e4e7; padding: 20px 40px; text-align: center; color: #a1a1aa; font-size: 12px;">
              Studio Desire Architecture & Interior Design &bull; Automated notification generated by Studio Desire CMS.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }
}
