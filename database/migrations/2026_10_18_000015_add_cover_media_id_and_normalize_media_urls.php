<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('projects', 'cover_media_id')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->foreignId('cover_media_id')->nullable()->after('cover_image')->constrained('media')->nullOnDelete();
            });
        }

        // Backward-compatible data normalization:
        // Strip localhost/127.0.0.1 development hosts from stored URLs
        try {
            DB::table('media')
                ->where('url', 'LIKE', 'http://127.0.0.1%')
                ->orWhere('url', 'LIKE', 'http://localhost%')
                ->get()
                ->each(function ($row) {
                    $cleanUrl = preg_replace('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/storage/.*|/uploads/.*)$#i', '$1', $row->url);
                    $cleanThumb = preg_replace('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/storage/.*|/uploads/.*)$#i', '$1', $row->thumbnail_url);
                    DB::table('media')->where('id', $row->id)->update([
                        'url' => $cleanUrl,
                        'thumbnail_url' => $cleanThumb,
                    ]);
                });

            DB::table('projects')
                ->where('cover_image', 'LIKE', 'http://127.0.0.1%')
                ->orWhere('cover_image', 'LIKE', 'http://localhost%')
                ->get()
                ->each(function ($row) {
                    $cleanCover = preg_replace('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/storage/.*|/uploads/.*)$#i', '$1', $row->cover_image);
                    DB::table('projects')->where('id', $row->id)->update([
                        'cover_image' => $cleanCover,
                    ]);
                });

            DB::table('project_media')
                ->where('url', 'LIKE', 'http://127.0.0.1%')
                ->orWhere('url', 'LIKE', 'http://localhost%')
                ->get()
                ->each(function ($row) {
                    $cleanUrl = preg_replace('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/storage/.*|/uploads/.*)$#i', '$1', $row->url);
                    DB::table('project_media')->where('id', $row->id)->update([
                        'url' => $cleanUrl,
                    ]);
                });
        } catch (\Exception) {
            // Ignore if tables are empty during tests
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('projects', 'cover_media_id')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->dropForeign(['cover_media_id']);
                $table->dropColumn('cover_media_id');
            });
        }
    }
};
