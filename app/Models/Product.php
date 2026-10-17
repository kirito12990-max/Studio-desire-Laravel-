<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'subtitle',
        'category',
        'description',
        'cover_image',
        'year',
        'materials',
        'dimensions',
        'featured',
        'is_published',
        'grid_span',
        'aspect_ratio',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'featured' => 'boolean',
            'is_published' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Product $product) {
            if (empty($product->slug)) {
                $product->slug = Str::slug($product->title);
            }
        });
    }

    public function media(): HasMany
    {
        return $this->hasMany(ProductMedia::class, 'product_id')->orderBy('sort_order');
    }
}
