<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class BlueprintDrawing extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'project_name',
        'project_slug',
        'title',
        'slug',
        'drawing_type',
        'room_area',
        'drawing_number',
        'revision',
        'scale',
        'sheet_size',
        'thumbnail_url',
        'file_url',
        'file_type',
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

    protected static function booted(): void
    {
        static::saving(function (BlueprintDrawing $drawing) {
            if (empty($drawing->slug)) {
                $drawing->slug = Str::slug($drawing->title);
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
}
