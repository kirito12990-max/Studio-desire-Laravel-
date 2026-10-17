<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class VisualizationSpace extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'title',
        'slug',
        'project_name',
        'room',
        'category',
        'year',
        'location',
        'description',
        'cover_image',
        'vr_url',
        'has_vr',
        'show_qr',
        'is_published',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'has_vr' => 'boolean',
            'show_qr' => 'boolean',
            'is_published' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (VisualizationSpace $space) {
            if (empty($space->slug)) {
                $space->slug = Str::slug($space->title);
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(VisualizationMedia::class, 'space_id')->orderBy('sort_order');
    }
}
