<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Media extends Model
{
    use HasFactory;

    protected $table = 'media';

    protected $fillable = [
        'filename',
        'original_name',
        'url',
        'thumbnail_url',
        'media_type',
        'mime_type',
        'file_size',
        'dimensions',
        'title',
        'alt_text',
        'is_public',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
            'file_size' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function projectAssignments(): HasMany
    {
        return $this->hasMany(ProjectMedia::class, 'media_id');
    }
}
