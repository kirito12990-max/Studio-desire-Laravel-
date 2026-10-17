<?php

namespace Tests\Feature\EndToEnd;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DataMigrationAndCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_legacy_data_dry_run_executes_successfully(): void
    {
        $this->artisan('import:legacy-data', ['--dry-run' => true])
            ->assertExitCode(0);
    }

    public function test_make_owner_command_creates_authorized_admin_user(): void
    {
        $this->artisan('make:owner', [
            '--name' => 'Design Director',
            '--username' => 'designdirector',
            '--email' => 'director@studiodesire.com',
            '--password' => 'DirectorPass2026!',
        ])->assertExitCode(0);

        $this->assertDatabaseHas('users', [
            'username' => 'designdirector',
            'email' => 'director@studiodesire.com',
            'role' => 'OWNER',
            'is_active' => true,
        ]);

        $user = User::where('username', 'designdirector')->first();
        $this->assertTrue(Hash::check('DirectorPass2026!', $user->password));
    }
}
