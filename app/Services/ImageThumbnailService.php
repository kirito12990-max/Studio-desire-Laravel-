<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageThumbnailService
{
    /**
     * Maximum bounding box dimensions for generated grid thumbnails.
     */
    protected const MAX_THUMB_WIDTH = 500;
    protected const MAX_THUMB_HEIGHT = 500;

    /**
     * Max pixels to guard against decompression-bomb crashes during GD processing.
     */
    protected const MAX_PIXEL_COUNT = 35000000;

    /**
     * Generate an optimized preview thumbnail from a source image on disk.
     *
     * @param string $sourceRealPath Absolute filesystem path to the original image.
     * @param string $subDir Relative subfolder under public storage (e.g. 'thumbnails/2026/10').
     * @return string|null Canonical relative URL to thumbnail (e.g. '/storage/thumbnails/...webp') or null on failure.
     */
    public function generateThumbnail(string $sourceRealPath, string $subDir = ''): ?string
    {
        if (!extension_loaded('gd') || !is_readable($sourceRealPath) || !filesize($sourceRealPath)) {
            return null;
        }

        try {
            $info = @getimagesize($sourceRealPath);
            if (!$info || empty($info[0]) || empty($info[1])) {
                return null;
            }

            [$origW, $origH] = $info;
            $mime = $info['mime'] ?? '';

            // Guard against decompression bombs
            if (($origW * $origH) > self::MAX_PIXEL_COUNT || $origW > 8000 || $origH > 8000) {
                Log::warning('Image skipped for thumbnail generation due to extreme dimensions', [
                    'path' => $sourceRealPath,
                    'dimensions' => "{$origW}x{$origH}",
                ]);
                return null;
            }

            // Load source image resource
            $srcImage = match ($mime) {
                'image/jpeg' => @imagecreatefromjpeg($sourceRealPath),
                'image/png' => @imagecreatefrompng($sourceRealPath),
                'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($sourceRealPath) : null,
                'image/avif' => function_exists('imagecreatefromavif') ? @imagecreatefromavif($sourceRealPath) : null,
                'image/gif' => @imagecreatefromgif($sourceRealPath),
                default => null,
            };

            if (!$srcImage) {
                return null;
            }

            // Calculate proportional thumbnail dimensions
            $scale = min(self::MAX_THUMB_WIDTH / $origW, self::MAX_THUMB_HEIGHT / $origH, 1.0);
            $targetW = max(1, (int) round($origW * $scale));
            $targetH = max(1, (int) round($origH * $scale));

            $thumb = imagecreatetruecolor($targetW, $targetH);
            if (!$thumb) {
                imagedestroy($srcImage);
                return null;
            }

            // Preserve alpha channel transparency for PNG/WebP/GIF
            if (in_array($mime, ['image/png', 'image/webp', 'image/gif', 'image/avif'])) {
                imagealphablending($thumb, false);
                imagesavealpha($thumb, true);
                $transparent = imagecolorallocatealpha($thumb, 255, 255, 255, 127);
                imagefilledrectangle($thumb, 0, 0, $targetW, $targetH, $transparent);
            }

            // High-quality resample
            imagecopyresampled($thumb, $srcImage, 0, 0, 0, 0, $targetW, $targetH, $origW, $origH);

            // Determine output directory and safe deterministic filename
            $dateFolder = !empty($subDir) ? trim($subDir, '/') : 'thumbnails/' . date('Y/m');
            $uniqueHash = hash_file('sha1', $sourceRealPath) ?: Str::random(20);
            $thumbFilename = 'thumb_' . substr($uniqueHash, 0, 16) . '_' . $targetW . 'x' . $targetH . '.webp';
            $storageRelativePath = $dateFolder . '/' . $thumbFilename;

            // Ensure destination directory exists on public disk
            $publicDisk = Storage::disk('public');
            $diskRoot = $publicDisk->path('');
            $destDir = dirname($diskRoot . '/' . $storageRelativePath);
            if (!is_dir($destDir)) {
                @mkdir($destDir, 0755, true);
            }

            $destAbsolutePath = $diskRoot . '/' . $storageRelativePath;

            // Prefer WebP for optimal compression and transparency support; fallback to JPEG
            $saved = false;
            if (function_exists('imagewebp')) {
                $saved = @imagewebp($thumb, $destAbsolutePath, 82);
            } elseif (function_exists('imagejpeg')) {
                $storageRelativePath = str_replace('.webp', '.jpg', $storageRelativePath);
                $destAbsolutePath = $diskRoot . '/' . $storageRelativePath;
                $saved = @imagejpeg($thumb, $destAbsolutePath, 85);
            }

            // Clean up memory
            imagedestroy($thumb);
            imagedestroy($srcImage);

            if ($saved && file_exists($destAbsolutePath) && filesize($destAbsolutePath) > 0) {
                return '/storage/' . ltrim($storageRelativePath, '/');
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning('Thumbnail generation error handled safely: ' . $e->getMessage(), [
                'file' => $sourceRealPath,
            ]);
            return null;
        }
    }

    /**
     * Safely remove a generated thumbnail from public storage.
     */
    public function deleteThumbnail(?string $thumbnailUrl): bool
    {
        if (empty($thumbnailUrl)) {
            return false;
        }

        $path = parse_url($thumbnailUrl, PHP_URL_PATH);
        if (!$path) {
            return false;
        }

        $relative = preg_replace('#^/storage/#', '', $path);
        if ($relative && Storage::disk('public')->exists($relative)) {
            return Storage::disk('public')->delete($relative);
        }

        return false;
    }
}
