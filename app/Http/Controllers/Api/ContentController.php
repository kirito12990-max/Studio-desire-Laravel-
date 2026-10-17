<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeaturedItem;
use App\Models\WebsiteSetting;
use Illuminate\Http\JsonResponse;

class ContentController extends Controller
{
    /**
     * Authoritative default content for Studio Desire public sections.
     */
    protected const DEFAULT_SECTIONS = [
        'hero' => [
            'tagline' => 'ARCHITECTURAL INTEGRITY · TACTILE ATMOSPHERES',
            'headline' => 'Composing spatial sanctuaries of quiet permanence.',
            'subheadline' => 'Dedicated architectural and interior practice rooted in honest materiality, natural daylight, and millimeter-calibrated joinery.',
            'primary_cta_text' => 'Explore Portfolio',
            'primary_cta_url' => '/projects',
            'secondary_cta_text' => 'Initiate Enquiry',
            'secondary_cta_url' => '/contact',
        ],
        'about' => [
            'tagline' => 'Architectural Integrity · Tactile Atmospheres',
            'intro_heading' => 'Studio Desire is a dedicated interior architecture practice founded in Ahmedabad.',
            'intro_paragraph' => 'We conceive interior environments as composed spatial atmospheres. Our methodology centers on honest materiality—quarried stone, textured plaster, brushed metal, and calibrated timber—orchestrated with daylight and rigorous detailing.',
            'philosophy' => 'Our design ethos is quiet, restrained, and deeply architectural. Every joinery junction, shadow gap, and material transition is intentional.',
            'founded_year' => 2024,
            'location' => 'Ahmedabad & Jaipur, India',
            'email' => 'studiodesire01@gmail.com',
            'principals' => [
                ['name' => 'Zenith Suthar', 'role' => 'Principal Architect & Interior Designer', 'phone' => '+91 75 75 87 72 25'],
                ['name' => 'Chetna Bhati', 'role' => 'Design Director & Spatial Strategist', 'phone' => '+91 87 80 37 04 08'],
            ],
            'approach_points' => [
                ['title' => 'Material Authenticity', 'description' => 'Natural stone, honest timbers, and tactile metals that age with dignity.'],
                ['title' => 'Atmospheric Illumination', 'description' => 'Concealed light channels and soft ambient washes creating depth and calm.'],
                ['title' => 'Architectural Millwork', 'description' => 'Bespoke flush cabinetry and custom detail transitions calibrated to millimeter precision.'],
            ],
        ],
        'services' => [
            'headline' => 'Comprehensive Spatial Capabilities',
            'subheadline' => 'From initial masterplanning to bespoke turn-key execution.',
            'items' => [
                [
                    'number' => '01',
                    'title' => 'Architectural Planning & Engineering',
                    'description' => 'Holistic space planning, volumetric compositions, structural coordination, and detailed blueprint packages.',
                ],
                [
                    'number' => '02',
                    'title' => 'Interior Architecture & Bespoke Millwork',
                    'description' => 'Custom joinery design, material palette curation, tactile plaster surfaces, and bespoke architectural fixtures.',
                ],
                [
                    'number' => '03',
                    'title' => '3D Visualization & VR Immersion',
                    'description' => 'Photorealistic rendering, spatial daylight simulation, and interactive 360° virtual reality destination tours.',
                ],
                [
                    'number' => '04',
                    'title' => 'Turn-Key Execution & Craft Supervision',
                    'description' => 'On-site technical supervision, artisan joinery fabrication, and precise realization of design blueprints.',
                ],
            ],
        ],
        'contact' => [
            'studio_name' => 'Studio Desire Architecture & Interiors',
            'address' => 'Ahmedabad, Gujarat & Jaipur, Rajasthan, India',
            'email' => 'studiodesire01@gmail.com',
            'phone' => '+91 75 75 87 72 25',
            'secondary_phone' => '+91 87 80 37 04 08',
            'working_hours' => 'Monday – Saturday: 10:00 AM – 7:00 PM IST',
            'consultation_note' => 'In-person consultations by prior appointment at our design studios.',
        ],
        'philosophy' => [
            'headline' => 'The Architecture of Silence',
            'body' => 'We reject temporary aesthetic trends in favor of enduring spatial clarity. Every wall, opening, and shadow line is considered as a permanent composition.',
        ],
    ];

    /**
     * Retrieve all public website content sections.
     */
    public function index(): JsonResponse
    {
        $sections = array_keys(self::DEFAULT_SECTIONS);
        $result = [];

        foreach ($sections as $section) {
            $result[$section] = $this->resolveSectionContent($section);
        }

        return response()->json(array_merge($result, [
            'sections' => $result,
        ]));
    }

    /**
     * Retrieve a specific public website section content.
     */
    public function show(string $section): JsonResponse
    {
        $cleanSection = strtolower(trim($section));
        $content = $this->resolveSectionContent($cleanSection);

        $wrapper = [
            'section' => $cleanSection,
            'content' => $content,
        ];

        return response()->json(is_array($content) ? array_merge($content, $wrapper) : $wrapper);
    }

    /**
     * Retrieve active homepage featured slider items referencing published projects.
     */
    public function featured(): JsonResponse
    {
        $items = FeaturedItem::with(['project.category'])
            ->where('is_active', true)
            ->whereHas('project', function ($q) {
                $q->where('is_published', true);
            })
            ->orderBy('display_order')
            ->get();

        $data = $items->map(function (FeaturedItem $item) {
            $p = $item->project;
            return [
                'id' => $item->id,
                'project_id' => $item->project_id,
                'title' => $item->title_override ?: $p?->title,
                'subtitle' => $item->subtitle_override ?: $p?->subtitle,
                'cover_image' => $item->image_override ?: $p?->cover_image,
                'display_order' => $item->display_order,
                'slug' => $p?->slug,
                'location' => $p?->location,
                'category' => $p?->category_name,
            ];
        });

        return response()->json([
            'items' => $data,
            'featured_slider' => $data,
            'total' => $data->count(),
        ]);
    }

    /**
     * Helper to resolve section from database or fallback to defaults.
     */
    protected function resolveSectionContent(string $section): mixed
    {
        $dbRecord = WebsiteSetting::where('key', 'content_' . $section)->first();

        if ($dbRecord && !empty($dbRecord->value)) {
            $decoded = json_decode($dbRecord->value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
            return $dbRecord->value;
        }

        return self::DEFAULT_SECTIONS[$section] ?? [];
    }
}
