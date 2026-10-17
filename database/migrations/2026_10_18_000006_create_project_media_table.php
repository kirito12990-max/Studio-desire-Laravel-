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
        Schema::create('project_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            // Shared media record is preserved when project or project_media assignment is removed
            $table->foreignId('media_id')->nullable()->constrained('media')->nullOnDelete();
            $table->string('url', 1000)->nullable();
            $table->string('thumbnail_url', 1000)->nullable();
            $table->string('media_type', 50)->default('image'); // image, video, 3d, blueprint
            $table->string('title', 255)->nullable();
            $table->string('caption', 500)->nullable();
            $table->string('alt_text', 500)->nullable();
            $table->string('room_name', 100)->nullable()->index();
            $table->integer('sort_order')->default(0)->index();
            $table->boolean('is_published')->default(true)->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_media');
    }
};
