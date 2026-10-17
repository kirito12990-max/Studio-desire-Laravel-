<?php

namespace Database\Seeders;

use App\Models\PortfolioCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'RESIDENTIAL',
                'description' => 'Bespoke private estates, luxury penthouses, and architectural dwellings focused on spatial daylight and material integrity.',
                'display_order' => 1,
                'puzzle_size' => 'large',
                'cover_image' => '/uploads/projects/placeholder.webp',
                'subcategories' => ['Private Residences', 'Luxury Villas', 'Urban Penthouses', 'Renovations'],
            ],
            [
                'name' => 'COMMERCIAL',
                'description' => 'Corporate headquarters, commercial towers, and multi-functional architectural environments.',
                'display_order' => 2,
                'puzzle_size' => 'tall',
                'cover_image' => '/uploads/projects/placeholder.webp',
                'subcategories' => ['Corporate Headquarters', 'Commercial Complexes', 'Mixed-Use Developments'],
            ],
            [
                'name' => 'HOSPITALITY',
                'description' => 'Boutique hotels, luxury retreats, wellness spas, and curated culinary destinations.',
                'display_order' => 3,
                'puzzle_size' => 'wide',
                'cover_image' => '/uploads/projects/placeholder.webp',
                'subcategories' => ['Boutique Hotels', 'Culinary Spaces', 'Wellness Resorts'],
            ],
            [
                'name' => 'OFFICE',
                'description' => 'Executive design studios, collaborative creative spaces, and modern interior workspaces.',
                'display_order' => 4,
                'puzzle_size' => 'small',
                'cover_image' => '/uploads/projects/placeholder.webp',
                'subcategories' => ['Creative Studios', 'Executive Suites', 'Co-working Environments'],
            ],
            [
                'name' => 'RETAIL',
                'description' => 'High-end retail boutiques, fashion flagship stores, and bespoke material showcases.',
                'display_order' => 5,
                'puzzle_size' => 'small',
                'cover_image' => '/uploads/projects/placeholder.webp',
                'subcategories' => ['Flagship Stores', 'Luxury Boutiques', 'Showrooms'],
            ],
        ];

        foreach ($categories as $catData) {
            $subcategories = $catData['subcategories'];
            unset($catData['subcategories']);

            $catData['slug'] = Str::slug($catData['name']);

            $category = PortfolioCategory::updateOrCreate(
                ['slug' => $catData['slug']],
                $catData
            );

            foreach ($subcategories as $index => $subName) {
                $category->subcategories()->updateOrCreate(
                    ['slug' => Str::slug($subName)],
                    [
                        'name' => $subName,
                        'display_order' => $index + 1,
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
