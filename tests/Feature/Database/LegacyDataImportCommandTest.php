<?php

namespace Tests\Feature\Database;

use App\Models\Client;
use App\Models\PortfolioCategory;
use App\Models\Project;
use App\Models\ProjectEnquiry;
use App\Models\ProjectMedia;
use App\Models\Media;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class LegacyDataImportCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_command_dry_run_does_not_modify_database(): void
    {
        $exitCode = Artisan::call('import:legacy-data', [
            '--dry-run' => true,
        ]);

        $this->assertEquals(0, $exitCode);
        $this->assertEquals(0, Project::count());
        $this->assertEquals(0, PortfolioCategory::count());
        $this->assertEquals(0, Client::count());
    }

    public function test_import_command_imports_hardikbhai_with_verified_media(): void
    {
        $exitCode = Artisan::call('import:legacy-data', [
            '--force' => true,
        ]);

        $this->assertEquals(0, $exitCode);

        // Verify Hardikbhai project exists
        $hardikbhai = Project::where('slug', 'hardikbhai')->first();
        $this->assertNotNull($hardikbhai);
        $this->assertEquals('Hardikbhai', $hardikbhai->title);
        $this->assertTrue((bool) $hardikbhai->is_published);
        $this->assertEquals('/uploads/projects/hardik-bhai/cover.webp', $hardikbhai->cover_image);

        // Verify 24 media items are attached
        $this->assertEquals(24, $hardikbhai->media()->count());

        // Verify Media table contains canonical records
        $this->assertDatabaseHas('media', [
            'url' => '/uploads/projects/hardik-bhai/cover.webp',
        ]);
        $this->assertDatabaseHas('media', [
            'url' => '/uploads/projects/hardik-bhai/entrance-01.webp',
        ]);

        // Verify Category & Client associations
        $this->assertNotNull($hardikbhai->portfolioCategory);
        $this->assertEquals('Residential', $hardikbhai->portfolioCategory->name);

        $this->assertNotNull($hardikbhai->client);
        $this->assertEquals('Hardikbhai Patel', $hardikbhai->client->name);

        // Verify Enquiries imported
        $this->assertGreaterThan(0, ProjectEnquiry::count());
    }

    public function test_import_command_is_repeatable_and_idempotent(): void
    {
        // First run
        Artisan::call('import:legacy-data', ['--force' => true]);
        $firstProjectCount = Project::count();
        $firstMediaCount = ProjectMedia::count();

        // Second run
        $exitCode = Artisan::call('import:legacy-data', ['--force' => true]);
        $this->assertEquals(0, $exitCode);

        // Counts must be identical without duplication
        $this->assertEquals($firstProjectCount, Project::count());
        $this->assertEquals($firstMediaCount, ProjectMedia::count());
    }
}
