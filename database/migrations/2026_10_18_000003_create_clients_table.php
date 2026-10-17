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
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255)->index();
            $table->string('email', 255)->nullable()->index();
            $table->string('phone', 100)->nullable();
            $table->string('company', 255)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 50)->default('ACTIVE')->index(); // ACTIVE, INACTIVE, ARCHIVED
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
