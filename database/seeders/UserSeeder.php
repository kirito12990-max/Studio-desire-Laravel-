<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;

class UserSeeder extends Seeder
{
    /**
     * Seed initial owner account safely from environment variables if present.
     */
    public function run(): void
    {
        // Prevent duplicate user creation
        if (User::whereIn('role', ['OWNER', 'MASTER', 'ADMIN'])->exists()) {
            return;
        }

        $email = env('INITIAL_ADMIN_EMAIL', 'admin@studiodesire.com');
        $username = env('INITIAL_ADMIN_USERNAME', 'admin');
        $name = env('INITIAL_ADMIN_NAME', 'Studio Desire Administrator');
        $password = env('INITIAL_ADMIN_PASSWORD');

        if (empty($password)) {
            $this->command?->warn('[UserSeeder] INITIAL_ADMIN_PASSWORD is not set in .env. Skipping initial user seeding. Run "php artisan make:owner" to create an admin account.');
            return;
        }

        $user = User::create([
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'password' => $password, // Automatically hashed by User model casts
            'role' => 'OWNER',
            'must_change_password' => false,
            'is_active' => true,
        ]);

        $this->command?->info("[UserSeeder] Bootstrapped initial Owner account: {$user->username} ({$user->email})");
        Log::info('Bootstrapped initial owner account via UserSeeder', ['email' => $user->email]);
    }
}
