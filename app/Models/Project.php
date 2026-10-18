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
        'cover_media_id',
        'status',
        'publishing_status',
        'featured',
        'is_published',
        'vr_url',
        'vr_qr_code',
        'show_qr',
        'vr_type',
        'grid_span',
        'aspect_ratio',
        'seo_title',
        'meta_description',
        'canonical_url',
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
            // Slug generation and normalization
            if (empty($project->slug) && !empty($project->title)) {
                $baseSlug = Str::slug($project->title);
                $slug = $baseSlug;
                $counter = 1;
                while (static::where('slug', $slug)->where('id', '!=', $project->id ?? 0)->exists()) {
                    $slug = "{$baseSlug}-{$counter}";
                    $counter++;
                }
                $project->slug = $slug;
            } elseif (!empty($project->slug)) {
                $project->slug = Str::slug($project->slug);
            }

            // Sync category text column with canonical category relationship
            if ($project->category_id && ($project->isDirty('category_id') || empty($project->category))) {
                $cat = PortfolioCategory::find($project->category_id);
                if ($cat) {
                    $project->category = $cat->name;
                }
            }

            // publishing_status is the canonical single source of truth
            if (!empty($project->publishing_status)) {
                $project->attributes['is_published'] = ($project->publishing_status === 'published');
            } elseif (isset($project->attributes['is_published'])) {
                $project->publishing_status = $project->attributes['is_published'] ? 'published' : 'draft';
            } else {
                $project->publishing_status = 'draft';
                $project->attributes['is_published'] = false;
            }
        });
    }

    /**
     * Canonical published query scope strictly driven by publishing_status.
     */
    public function scopePublished($query)
    {
        return $query->where('publishing_status', 'published');
    }

    public function getIsPublishedAttribute(): bool
    {
        return ($this->attributes['publishing_status'] ?? 'draft') === 'published';
    }

    public function setIsPublishedAttribute($value): void
    {
        $boolVal = filter_var($value, FILTER_VALIDATE_BOOLEAN);
        $this->attributes['is_published'] = $boolVal;
        if ($boolVal) {
            $this->attributes['publishing_status'] = 'published';
        } elseif (($this->attributes['publishing_status'] ?? '') === 'published') {
            $this->attributes['publishing_status'] = 'draft';
        }
    }

    public function scopeDraft($query)
    {
        return $query->where('publishing_status', 'draft');
    }

    public function scopeArchived($query)
    {
        return $query->where('publishing_status', 'archived');
    }

    /**
     * Check if project satisfies publication criteria.
     */
    public function canBePublished(): bool
    {
        return count($this->getValidationErrorsForPublishing()) === 0;
    }

    /**
     * Return list of missing publication requirements.
     */
    public function getValidationErrorsForPublishing(): array
    {
        $errors = [];
        if (empty(trim($this->title ?? ''))) {
            $errors['title'] = 'Project title is required for publication.';
        }
        if (empty($this->category_id)) {
            $errors['category_id'] = 'Portfolio category assignment is required for publication.';
        }
        if (empty(trim($this->cover_image ?? ''))) {
            $errors['cover_image'] = 'Cover image is required before publishing.';
        }
        return $errors;
    }

    /**
     * Resolves canonical cover image path, supporting both legacy string paths and cover_media_id foreign key.
     */
    public function getCoverImageAttribute(?string $value): ?string
    {
        if (empty($value)) {
            if (!empty($this->cover_media_id) && $this->relationLoaded('coverMedia') && $this->getRelation('coverMedia')) {
                return $this->getRelation('coverMedia')->url;
            }
            return $value;
        }
        return preg_replace('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/storage/.*|/uploads/.*)$#i', '$1', $value);
    }

    public function coverMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'cover_media_id');
    }

    public function portfolioCategory(): BelongsTo
    {
        return $this->belongsTo(PortfolioCategory::class, 'category_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(PortfolioCategory::class, 'category_id');
    }

    /**
     * Resolves clean category display name avoiding attribute-relation collision.
     */
    public function getCategoryNameAttribute(): string
    {
        if ($this->relationLoaded('portfolioCategory') && $this->getRelation('portfolioCategory')) {
            return $this->getRelation('portfolioCategory')->name;
        }

        if ($this->relationLoaded('category') && $this->getRelation('category') instanceof PortfolioCategory) {
            return $this->getRelation('category')->name;
        }

        $raw = $this->attributes['category'] ?? null;
        if (!empty($raw) && is_string($raw)) {
            return $raw;
        }

        return $this->portfolioCategory()->first()?->name ?? 'Architecture';
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
