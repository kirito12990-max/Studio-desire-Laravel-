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
        Schema::create('enquiry_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enquiry_id')->constrained('project_enquiries')->cascadeOnDelete();
            $table->string('original_filename', 255);
            $table->string('filename', 255);
            $table->string('file_type', 50)->default('document'); // document, pdf, image
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->string('storage_path', 500); // private storage path
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enquiry_attachments');
    }
};
