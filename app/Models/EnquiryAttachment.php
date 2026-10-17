<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnquiryAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'enquiry_id',
        'original_filename',
        'filename',
        'file_type',
        'mime_type',
        'file_size',
        'storage_path',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
        ];
    }

    public function enquiry(): BelongsTo
    {
        return $this->belongsTo(ProjectEnquiry::class, 'enquiry_id');
    }
}
