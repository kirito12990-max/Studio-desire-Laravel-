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
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('filename', 255)->unique()->index();
            $table->string('original_name', 255);
            $table->string('url', 1000);
            $table->string('thumbnail_url', 1000)->nullable();
            $table->string('media_type', 50)->default('image')->index(); // image, video, 3d, blueprint, document
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->string('dimensions', 50)->nullable();
            $table->string('title', 255)->nullable();
            $table->string('alt_text', 500)->nullable();
            $table->boolean('is_public')->default(true)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
