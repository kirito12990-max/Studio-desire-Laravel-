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
        Schema::create('visualization_spaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('title', 255);
            $table->string('slug', 255)->unique()->index();
            $table->string('project_name', 255);
            $table->string('room', 100)->index();
            $table->string('category', 100)->default('Residential')->index();
            $table->integer('year')->default(2026);
            $table->string('location', 255)->nullable();
            $table->text('description')->nullable();
            $table->string('cover_image', 1000);
            $table->string('vr_url', 1000)->nullable();
            $table->boolean('has_vr')->default(false)->index();
            $table->boolean('show_qr')->default(true);
            $table->boolean('is_published')->default(true)->index();
            $table->integer('sort_order')->default(0)->index();
            $table->timestamps();
        });

        Schema::create('visualization_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('space_id')->constrained('visualization_spaces')->cascadeOnDelete();
            $table->string('url', 1000);
            $table->string('caption', 500)->nullable();
            $table->string('angle', 100)->nullable();
            $table->string('vr_url', 1000)->nullable();
            $table->boolean('has_vr')->default(false);
            $table->integer('sort_order')->default(0)->index();
            $table->timestamps();
        });

        Schema::create('blueprint_drawings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('project_name', 255);
            $table->string('project_slug', 255)->index();
            $table->string('title', 255);
            $table->string('slug', 255)->unique()->index();
            $table->string('drawing_type', 100)->default('Floor Plan')->index();
            $table->string('room_area', 100)->nullable();
            $table->string('drawing_number', 100)->nullable();
            $table->string('revision', 50)->default('v1');
            $table->string('scale', 50)->nullable();
            $table->string('sheet_size', 20)->nullable();
            $table->string('thumbnail_url', 1000);
            $table->string('file_url', 1000);
            $table->string('file_type', 20)->default('image'); // image, pdf
            $table->integer('sort_order')->default(0)->index();
            $table->boolean('is_published')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('contact_inquiries', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('email', 255)->index();
            $table->string('phone', 100)->nullable();
            $table->string('subject', 255)->nullable();
            $table->text('message');
            $table->string('status', 50)->default('NEW')->index(); // NEW, REPLIED, ARCHIVED
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_inquiries');
        Schema::dropIfExists('blueprint_drawings');
        Schema::dropIfExists('visualization_media');
        Schema::dropIfExists('visualization_spaces');
    }
};
