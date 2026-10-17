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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->string('slug', 255)->unique()->index();
            $table->string('subtitle', 500)->nullable();
            $table->string('category', 100)->index(); // Furniture, Seating, Tables, Storage, Beds, Lighting, Custom
            $table->text('description');
            $table->string('cover_image', 1000);
            $table->integer('year')->default(2026);
            $table->string('materials', 500)->nullable();
            $table->string('dimensions', 255)->nullable();
            $table->boolean('featured')->default(false)->index();
            $table->boolean('is_published')->default(true)->index();
            $table->string('grid_span', 50)->default('span-6');
            $table->string('aspect_ratio', 50)->default('ratio-standard');
            $table->timestamps();
        });

        Schema::create('product_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('media_id')->nullable()->constrained('media')->nullOnDelete();
            $table->string('url', 1000);
            $table->string('thumbnail_url', 1000)->nullable();
            $table->string('caption', 500)->nullable();
            $table->string('alt_text', 500)->nullable();
            $table->integer('sort_order')->default(0)->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_media');
        Schema::dropIfExists('products');
    }
};
