<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisualizationMedia extends Model
{
    use HasFactory;

    protected $table = 'visualization_media';

    protected $fillable = [
        'space_id',
        'url',
        'caption',
        'angle',
        'vr_url',
        'has_vr',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'has_vr' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function space(): BelongsTo
    {
        return $this->belongsTo(VisualizationSpace::class, 'space_id');
    }
}
