<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('location', 255)->nullable()->change();
            $table->text('description')->nullable()->change();
            $table->string('publishing_status', 20)->default('draft')->index()->after('status');
            $table->string('seo_title', 255)->nullable()->after('aspect_ratio');
            $table->text('meta_description')->nullable()->after('seo_title');
            $table->string('canonical_url', 1000)->nullable()->after('meta_description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['publishing_status', 'seo_title', 'meta_description', 'canonical_url']);
        });
    }
};
