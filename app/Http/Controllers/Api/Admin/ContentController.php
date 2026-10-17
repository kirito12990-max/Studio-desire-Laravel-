<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WebsiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContentController extends Controller
{
    /**
     * Allowed editable public content sections.
     */
    protected const ALLOWED_SECTIONS = [
        'hero',
        'about',
        'services',
        'contact',
        'philosophy',
    ];

    /**
     * List all editable content sections and their current configuration.
     */
    public function index(): JsonResponse
    {
        $settings = WebsiteSetting::where('group', 'content')
            ->orWhere('key', 'like', 'content_%')
            ->get();

        $sections = [];
        foreach (self::ALLOWED_SECTIONS as $sec) {
            $record = $settings->firstWhere('key', 'content_' . $sec);
            $sections[$sec] = $record ? json_decode($record->value, true) : null;
        }

        return response()->json([
            'sections' => $sections,
        ]);
    }

    /**
     * Retrieve a specific content section for owner editing.
     */
    public function show(string $section): JsonResponse
    {
        $cleanSection = strtolower(trim($section));
        $record = WebsiteSetting::where('key', 'content_' . $cleanSection)->first();

        $data = $record ? json_decode($record->value, true) : null;

        return response()->json([
            'section' => $cleanSection,
            'content' => $data,
        ]);
    }

    /**
     * Update section content with strict XSS sanitization and URL validation.
     */
    public function update(Request $request, string $section): JsonResponse
    {
        $cleanSection = strtolower(trim($section));

        if (!in_array($cleanSection, self::ALLOWED_SECTIONS)) {
            return response()->json([
                'message' => "Content section '{$section}' is not an editable public section.",
            ], 422);
        }

        $validated = $request->validate([
            'content' => 'required|array',
        ]);

        // Sanitize rich text inputs recursively to eliminate XSS vectors
        $sanitizedContent = $this->sanitizeRecursively($validated['content']);

        $record = WebsiteSetting::updateOrCreate(
            ['key' => 'content_' . $cleanSection],
            [
                'value' => json_encode($sanitizedContent, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'group' => 'content',
                'is_public' => true,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => "Content section '{$cleanSection}' updated successfully.",
            'content' => json_decode($record->value, true),
        ]);
    }

    /**
     * Recursively sanitize all strings and strip dangerous script/HTML attributes.
     */
    protected function sanitizeRecursively(mixed $data): mixed
    {
        if (is_array($data)) {
            $cleaned = [];
            foreach ($data as $key => $value) {
                $cleaned[$key] = $this->sanitizeRecursively($value);
            }
            return $cleaned;
        }

        if (is_string($data)) {
            // Strip entire script block including contents
            $clean = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $data);
            // Neutralize unsafe javascript: URI schemes
            if (preg_match('/^\s*javascript\s*:/i', $clean)) {
                return '#';
            }
            // Strip tags except safe formatting
            $clean = strip_tags($clean, '<p><br><b><strong><i><em><u><a><ul><ol><li><span>');
            $clean = preg_replace('/on\w+\s*=\s*["\'][^"\']*["\']/i', '', $clean);
            $clean = preg_replace('/<([a-z0-9]+)\s+>/i', '<$1>', $clean);
            $clean = preg_replace('/javascript\s*:/i', '', $clean);
            return trim($clean);
        }

        return $data;
    }
}
