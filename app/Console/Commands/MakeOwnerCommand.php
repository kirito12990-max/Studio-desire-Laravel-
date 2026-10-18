<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class MakeOwnerCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:owner 
                            {--name= : Full name of the owner}
                            {--username= : Unique login username}
                            {--email= : Owner email address}
                            {--password= : Plaintext password (will prompt securely if omitted)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely create or update an authorized Studio Desire owner/admin account without hardcoded credentials';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('--- Studio Desire Owner Account Provisioning ---');

        $name = $this->option('name') ?: $this->ask('Full Name', 'Studio Desire Owner');
        $username = $this->option('username') ?: $this->ask('Login Username', 'owner');
        $email = $this->option('email') ?: $this->ask('Email Address');
        $password = $this->option('password') ?: $this->secret('Password (min 8 characters)');

        if (empty($password)) {
            $this->error('Password cannot be empty.');
            return self::FAILURE;
        }

        $validator = Validator::make([
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'password' => $password,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return self::FAILURE;
        }

        $user = User::whereRaw('LOWER(email) = ?', [strtolower($email)])
            ->orWhereRaw('LOWER(username) = ?', [strtolower($username)])
            ->first();

        if ($user) {
            if (! $this->confirm("User '{$user->username}' ({$user->email}) already exists. Update password and ensure owner role?")) {
                $this->warn('Operation cancelled.');
                return self::SUCCESS;
            }

            $user->name = $name;
            $user->username = $username;
            $user->email = $email;
            $user->password = $password;
            $user->role = 'OWNER';
            $user->is_active = true;
            $user->must_change_password = false;
            $user->save();

            $this->info("Owner account '{$user->username}' updated successfully.");
            return self::SUCCESS;
        }

        $user = User::create([
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'password' => $password,
            'role' => 'OWNER',
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $this->info("Owner account '{$user->username}' ({$user->email}) created successfully.");
        return self::SUCCESS;
    }
}
