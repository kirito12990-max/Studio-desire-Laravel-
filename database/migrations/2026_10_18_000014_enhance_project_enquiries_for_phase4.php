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
        Schema::table('project_enquiries', function (Blueprint $table) {
            $table->string('phone', 100)->nullable()->change();
            $table->string('project_type', 100)->nullable()->default('GENERAL')->change();
            $table->json('status_history')->nullable()->after('internal_notes');
            $table->string('source_page', 255)->nullable()->after('source');
            $table->foreignId('originating_project_id')->nullable()->after('source_page')->constrained('projects')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_enquiries', function (Blueprint $table) {
            $table->dropForeign(['originating_project_id']);
            $table->dropColumn(['originating_project_id', 'source_page', 'status_history']);
        });
    }
};
