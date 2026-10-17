<?php

namespace App\Models;

use DomainException;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PortfolioCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'display_order',
        'is_active',
        'cover_image',
        'puzzle_size',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    /**
     * Automatic slug generation and explicit deletion protection.
     */
    protected static function booted(): void
    {
        static::saving(function (PortfolioCategory $category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name);
            }
        });

        // Enforce safe category deletion: never orphan or wipe projects
        static::deleting(function (PortfolioCategory $category) {
            if ($category->projects()->exists()) {
                throw new DomainException("Cannot delete category '{$category->name}' because it contains associated projects. Please reassign projects before deleting.");
            }
        });
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'category_id');
    }

    public function subcategories(): HasMany
    {
        return $this->hasMany(PortfolioSubcategory::class, 'category_id')->orderBy('display_order');
    }
}
