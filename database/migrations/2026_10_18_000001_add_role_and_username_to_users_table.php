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
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 100)->nullable()->unique()->after('name');
            $table->string('role', 50)->default('OWNER')->index()->after('password');
            $table->boolean('must_change_password')->default(false)->after('role');
            $table->boolean('is_active')->default(true)->index()->after('must_change_password');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['username', 'role', 'must_change_password', 'is_active']);
        });
    }
};
