<?php

use App\Models\ProjectEnquiry;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('project_enquiries', function (Blueprint $table) {
            $table->string('subject', 255)->nullable()->after('phone');
            $table->boolean('email_sent')->default(false)->index()->after('user_agent');
            $table->timestamp('email_sent_at')->nullable()->after('email_sent');
            $table->text('email_error')->nullable()->after('email_sent_at');
        });

        // Safe, idempotent data migration: copy existing contact_inquiries into project_enquiries
        if (Schema::hasTable('contact_inquiries')) {
            $contactMessages = DB::table('contact_inquiries')->orderBy('id', 'asc')->get();

            foreach ($contactMessages as $c) {
                // Check if this contact message was already migrated to avoid duplicates
                $alreadyMigrated = DB::table('project_enquiries')
                    ->where('email', $c->email)
                    ->where('created_at', $c->created_at)
                    ->where('message', $c->message)
                    ->exists();

                if (!$alreadyMigrated) {
                    $year = $c->created_at ? date('Y', strtotime($c->created_at)) : date('Y');
                    $ref = ProjectEnquiry::generateUniqueReference($year);

                    DB::table('project_enquiries')->insert([
                        'reference_number' => $ref,
                        'name' => $c->name,
                        'email' => $c->email,
                        'phone' => $c->phone,
                        'subject' => $c->subject ?: 'General Contact',
                        'project_type' => $c->subject ?: 'General Contact',
                        'location' => null,
                        'budget' => null,
                        'timeline' => null,
                        'message' => $c->message,
                        'source' => 'contact_form',
                        'source_page' => '/contact',
                        'status' => strtoupper($c->status ?? 'NEW'),
                        'internal_notes' => null,
                        'status_history' => null,
                        'client_id' => null,
                        'converted_project_id' => null,
                        'ip_address' => $c->ip_address,
                        'user_agent' => null,
                        'email_sent' => false,
                        'email_sent_at' => null,
                        'email_error' => null,
                        'created_at' => $c->created_at ?: now(),
                        'updated_at' => $c->updated_at ?: now(),
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_enquiries', function (Blueprint $table) {
            $table->dropColumn(['subject', 'email_sent', 'email_sent_at', 'email_error']);
        });
    }
};
