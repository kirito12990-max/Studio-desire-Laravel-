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
        Schema::create('project_enquiries', function (Blueprint $table) {
            $table->id();
            $table->string('reference_number', 50)->unique()->index();
            $table->string('name', 255);
            $table->string('email', 255)->index();
            $table->string('phone', 100);
            $table->string('project_type', 100)->index();
            $table->string('location', 255)->nullable();
            $table->string('budget', 100)->nullable();
            $table->string('timeline', 100)->nullable();
            $table->text('message');
            $table->string('source', 50)->default('contact'); // contact, planning, modal
            $table->string('status', 50)->default('NEW')->index(); // NEW, CONTACTED, CONSULTATION, PROPOSAL, WON, LOST, ARCHIVED
            $table->text('internal_notes')->nullable();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            // Preserves original enquiries even if associated project is deleted
            $table->foreignId('converted_project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_enquiries');
    }
};
