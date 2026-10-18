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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            // Restrict on delete ensures category cannot be deleted while projects reference it
            $table->foreignId('category_id')->constrained('portfolio_categories')->restrictOnDelete();
            $table->foreignId('subcategory_id')->nullable()->constrained('portfolio_subcategories')->nullOnDelete();
            // Null on delete ensures client records are preserved if a project is removed
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->string('title', 255);
            $table->string('slug', 255)->unique()->index();
            $table->string('subtitle', 500)->nullable();
            $table->string('location', 255)->nullable();
            $table->integer('year')->nullable()->default(null);
            $table->string('category', 100)->default('RESIDENTIAL')->index();
            $table->string('project_type', 255)->nullable();
            $table->string('area', 100)->nullable();
            $table->text('description');
            $table->string('cover_image', 1000)->nullable();
            $table->string('status', 50)->default('PLANNING')->index(); // PLANNING, IN_PROGRESS, COMPLETED, ARCHIVED
            $table->boolean('featured')->default(false)->index();
            $table->boolean('is_published')->default(false)->index();
            $table->string('vr_url', 1000)->nullable();
            $table->string('vr_qr_code', 1000)->nullable();
            $table->boolean('show_qr')->default(true);
            $table->string('vr_type', 50)->default('external');
            $table->string('grid_span', 50)->default('span-6');
            $table->string('aspect_ratio', 50)->default('ratio-standard');
            $table->integer('sort_order')->default(0)->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
