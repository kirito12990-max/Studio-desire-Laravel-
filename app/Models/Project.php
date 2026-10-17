<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'subcategory_id',
        'client_id',
        'title',
        'slug',
        'subtitle',
        'location',
        'year',
        'category',
        'project_type',
        'area',
        'description',
        'cover_image',
        'status',
        'featured',
        'is_published',
        'vr_url',
        'vr_qr_code',
        'show_qr',
        'vr_type',
        'grid_span',
        'aspect_ratio',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'featured' => 'boolean',
            'is_published' => 'boolean',
            'show_qr' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Project $project) {
            if (empty($project->slug)) {
                $baseSlug = Str::slug($project->title);
                $slug = $baseSlug;
                $counter = 1;
                while (static::where('slug', $slug)->where('id', '!=', $project->id ?? 0)->exists()) {
                    $slug = "{$baseSlug}-{$counter}";
                    $counter++;
                }
                $project->slug = $slug;
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(PortfolioCategory::class, 'category_id');
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(PortfolioSubcategory::class, 'subcategory_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ProjectMedia::class, 'project_id')->orderBy('sort_order');
    }

    public function featuredItem(): HasOne
    {
        return $this->hasOne(FeaturedItem::class, 'project_id');
    }

    public function drawings(): HasMany
    {
        return $this->hasMany(BlueprintDrawing::class, 'project_id')->orderBy('sort_order');
    }

    public function visualizationSpaces(): HasMany
    {
        return $this->hasMany(VisualizationSpace::class, 'project_id')->orderBy('sort_order');
    }

    public function enquiries(): HasMany
    {
        return $this->hasMany(ProjectEnquiry::class, 'converted_project_id');
    }
}
