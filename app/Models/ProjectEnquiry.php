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
        'project_type',
        'location',
        'budget',
        'timeline',
        'message',
        'source',
        'status',
        'internal_notes',
        'client_id',
        'converted_project_id',
        'ip_address',
        'user_agent',
    ];

    protected static function booted(): void
    {
        static::creating(function (ProjectEnquiry $enquiry) {
            if (empty($enquiry->reference_number)) {
                $year = date('Y');
                $count = static::whereYear('created_at', $year)->count() + 1;
                $enquiry->reference_number = sprintf('ENQ-%s-%04d', $year, $count);
            }
        });
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(EnquiryAttachment::class, 'enquiry_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function convertedProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'converted_project_id');
    }
}
