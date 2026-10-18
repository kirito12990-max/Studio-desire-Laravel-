<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectMedia extends Model
{
    use HasFactory;

    protected $table = 'project_media';

    protected $fillable = [
        'project_id',
        'media_id',
        'url',
        'thumbnail_url',
        'media_type',
        'title',
        'caption',
        'alt_text',
        'room_name',
        'sort_order',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Return canonical relative URL, normalizing localhost/127.0.0.1 development domains.
     */
    public function getUrlAttribute(?string $value): ?string
    {
        if (empty($value)) {
            if ($this->relationLoaded('media') && $this->getRelation('media')) {
                return $this->getRelation('media')->url;
            }
            return $value;
        }
        return preg_replace('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/storage/.*|/uploads/.*)$#i', '$1', $value);
    }

    /**
     * Return canonical relative thumbnail URL, normalizing localhost/127.0.0.1 development domains.
     */
    public function getThumbnailUrlAttribute(?string $value): ?string
    {
        if (empty($value)) {
            if ($this->relationLoaded('media') && $this->getRelation('media')) {
                return $this->getRelation('media')->thumbnail_url;
            }
            return $value;
        }
        return preg_replace('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/storage/.*|/uploads/.*)$#i', '$1', $value);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'media_id');
    }
}
