<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProjectEnquiry extends Model
{
    use HasFactory;

    protected $table = 'project_enquiries';

    protected $fillable = [
        'reference_number',
        'name',
        'email',
        'phone',
        'subject',
        'project_type',
        'location',
        'budget',
        'timeline',
        'message',
        'source',
        'source_page',
        'status',
        'internal_notes',
        'status_history',
        'client_id',
        'originating_project_id',
        'converted_project_id',
        'ip_address',
        'user_agent',
        'email_sent',
        'email_sent_at',
        'email_error',
    ];

    protected function casts(): array
    {
        return [
            'status_history' => 'array',
            'email_sent' => 'boolean',
            'email_sent_at' => 'datetime',
        ];
    }

    /**
     * Generate a collision-safe sequential enquiry reference number (e.g. ENQ-2026-0001).
     * Unlike row counts, this examines the highest existing sequence number for the year,
     * ensuring that deleting records will never cause duplicate reference collisions.
     */
    public static function generateUniqueReference(?string $year = null): string
    {
        $year = $year ?: date('Y');
        $prefix = "ENQ-{$year}-";

        // Query all existing reference numbers for the year to determine the true maximum sequence
        $references = static::where('reference_number', 'LIKE', "{$prefix}%")
            ->pluck('reference_number');

        $maxSeq = 0;
        foreach ($references as $ref) {
            if (preg_match('/^ENQ-\d{4}-(\d+)$/', $ref, $matches)) {
                $seq = (int) $matches[1];
                if ($seq > $maxSeq) {
                    $maxSeq = $seq;
                }
            }
        }

        $nextSeq = $maxSeq + 1;
        $candidate = sprintf('ENQ-%s-%04d', $year, $nextSeq);

        // Additional safeguard against concurrent race conditions
        while (static::where('reference_number', $candidate)->exists()) {
            $nextSeq++;
            $candidate = sprintf('ENQ-%s-%04d', $year, $nextSeq);
        }

        return $candidate;
    }

    protected static function booted(): void
    {
        static::creating(function (ProjectEnquiry $enquiry) {
            if (empty($enquiry->reference_number)) {
                $enquiry->reference_number = static::generateUniqueReference();
            }

            if (empty($enquiry->status_history)) {
                $enquiry->status_history = [
                    [
                        'status' => $enquiry->status ?: 'NEW',
                        'timestamp' => now()->toIso8601String(),
                        'actor' => 'Visitor',
                        'changed_by' => 'Visitor',
                        'notes' => 'Enquiry submitted through website form.',
                    ],
                ];
            }
        });
    }

    /**
     * Append a timestamped status transition entry to the enquiry's history.
     */
    public function recordStatusChange(string $newStatus, ?string $actor = null, ?string $notes = null): void
    {
        $history = $this->status_history ?: [];
        $history[] = [
            'status' => $newStatus,
            'timestamp' => now()->toIso8601String(),
            'actor' => $actor ?: 'Owner',
            'changed_by' => $actor ?: 'Owner',
            'notes' => $notes,
        ];

        $this->status = $newStatus;
        $this->status_history = $history;
        $this->save();
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(EnquiryAttachment::class, 'enquiry_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function originatingProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'originating_project_id');
    }

    public function convertedProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'converted_project_id');
    }
}
