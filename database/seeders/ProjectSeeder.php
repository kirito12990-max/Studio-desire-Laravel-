<?php

namespace Database\Seeders;

use App\Models\FeaturedItem;
use App\Models\Media;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectMedia;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    /**
     * Seed architectural portfolio projects and media assets.
     */
    public function run(): void
    {
        $interiorCategory = PortfolioCategory::where('slug', 'interior')->first()
            ?? PortfolioCategory::firstOrCreate(['name' => 'Interior', 'slug' => 'interior']);

        $archCategory = PortfolioCategory::where('slug', 'architecture')->first()
            ?? PortfolioCategory::firstOrCreate(['name' => 'Architecture', 'slug' => 'architecture']);

        // 1. Approved Reference Project: CAFE 08
        $cafeMediaAssets = [
            [
                'url' => 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1600&q=85',
                'caption' => 'Sculptural terracotta brew bar with custom brass pour-over fittings.',
                'alt_text' => 'Terracotta brew bar',
                'sort_order' => 1,
            ],
            [
                'url' => 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=85',
                'caption' => 'Seating alcoves recessed into arched lime plaster niches.',
                'alt_text' => 'Seating niches and arches',
                'sort_order' => 2,
            ],
            [
                'url' => 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1600&q=85',
                'caption' => 'Sunlit rear courtyard with hand-thrown ceramic planters and olive trees.',
                'alt_text' => 'Rear courtyard with olive trees',
                'sort_order' => 3,
            ],
        ];

        $cafeProject = Project::updateOrCreate(
            ['slug' => 'cafe-08'],
            [
                'title' => 'Cafe 08',
                'subtitle' => 'Artisanal Roastery in Terracotta, Lime, & Cast Bronze',
                'location' => 'Jaipur',
                'year' => 2024,
                'category_id' => $interiorCategory->id,
                'category' => $interiorCategory->name,
                'project_type' => 'Specialty Cafe & Roastery',
                'area' => '2,200 sq.ft',
                'description' => "Honoring Jaipur's terracotta pottery heritage, Cafe 08 features a sculptural central counter cast entirely from indigenous pink terracotta clay. Curved lime-plaster arches and unlacquered bronze details create a sensory haven for specialty coffee enthusiasts.",
                'cover_image' => 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=85',
                'status' => 'COMPLETED',
                'publishing_status' => 'published',
                'is_published' => true,
                'featured' => true,
                'sort_order' => 1,
                'grid_span' => 'span-7',
                'aspect_ratio' => 'ratio-landscape',
                'seo_title' => 'Cafe 08 — Architectural Roastery Dossier | Studio Desire',
                'meta_description' => "Explore Cafe 08 in Jaipur: an artisanal roastery honoring Rajasthan's terracotta heritage with lime-plaster arches and cast bronze joinery.",
            ]
        );

        foreach ($cafeMediaAssets as $asset) {
            $media = Media::firstOrCreate(
                ['filename' => basename(parse_url($asset['url'], PHP_URL_PATH)) ?: 'cafe-asset.jpg'],
                [
                    'original_name' => $asset['alt_text'] . '.jpg',
                    'url' => $asset['url'],
                    'thumbnail_url' => $asset['url'],
                    'media_type' => 'image',
                    'mime_type' => 'image/jpeg',
                    'file_size' => 1024 * 750,
                    'title' => $asset['alt_text'],
                    'alt_text' => $asset['alt_text'],
                    'is_public' => true,
                ]
            );

            ProjectMedia::updateOrCreate(
                [
                    'project_id' => $cafeProject->id,
                    'sort_order' => $asset['sort_order'],
                ],
                [
                    'media_id' => $media->id,
                    'url' => $asset['url'],
                    'thumbnail_url' => $asset['url'],
                    'media_type' => 'image',
                    'caption' => $asset['caption'],
                    'alt_text' => $asset['alt_text'],
                    'is_published' => true,
                ]
            );
        }

        // 2. Additional Architectural Project: Villa Terra
        $terraProject = Project::updateOrCreate(
            ['slug' => 'villa-terra'],
            [
                'title' => 'Villa Terra',
                'subtitle' => 'Monolithic Rammed Earth Residence',
                'location' => 'Udaipur',
                'year' => 2025,
                'category_id' => $archCategory->id,
                'category' => $archCategory->name,
                'project_type' => 'Private Residence',
                'area' => '6,500 sq.ft',
                'description' => 'A sculptural private sanctuary composed of layered local earth, reclaimed stone, and cantilevered pavilions framing the Aravali mountain ridges.',
                'cover_image' => 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
                'status' => 'COMPLETED',
                'publishing_status' => 'published',
                'is_published' => true,
                'featured' => false,
                'sort_order' => 2,
            ]
        );

        // 3. Draft Project (to verify draft exclusion from public APIs)
        Project::updateOrCreate(
            ['slug' => 'residence-14-draft'],
            [
                'title' => 'Residence 14 (Work In Progress)',
                'subtitle' => 'Upcoming Coastal Residence',
                'location' => 'Goa',
                'year' => 2026,
                'category_id' => $archCategory->id,
                'category' => $archCategory->name,
                'description' => 'Conceptual draft in spatial planning phase.',
                'publishing_status' => 'draft',
                'is_published' => false,
                'featured' => false,
                'sort_order' => 3,
            ]
        );

        // 4. Seed Homepage Featured Slider
        FeaturedItem::updateOrCreate(
            ['project_id' => $cafeProject->id],
            [
                'title_override' => 'Cafe 08 Roastery',
                'subtitle_override' => 'Artisanal Roastery in Jaipur',
                'image_override' => null,
                'display_order' => 1,
                'is_active' => true,
            ]
        );
    }
}
