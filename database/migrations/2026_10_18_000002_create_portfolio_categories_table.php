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
        Schema::create('portfolio_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique()->index();
            $table->string('slug', 100)->unique()->index();
            $table->text('description')->nullable();
            $table->integer('display_order')->default(0)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->string('cover_image', 1000)->nullable();
            $table->string('puzzle_size', 50)->default('small'); // small, wide, tall, large
            $table->timestamps();
        });

        Schema::create('portfolio_subcategories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('portfolio_categories')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('slug', 100);
            $table->integer('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['category_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('portfolio_subcategories');
        Schema::dropIfExists('portfolio_categories');
    }
};
