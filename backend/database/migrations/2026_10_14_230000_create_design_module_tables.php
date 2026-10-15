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
        // 1. Design User Profiles (Skill tags, weekly capacity, division, notification prefs)
        if (!Schema::hasTable('design_user_profiles')) {
            Schema::create('design_user_profiles', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique();
                $table->string('division', 100)->default('Design'); // teaching, training, design, etc.
                $table->json('skill_tags')->nullable(); // poster, video edit, motion, illustration, UI
                $table->unsignedInteger('weekly_capacity_hours')->default(20);
                $table->boolean('is_active')->default(true);
                $table->json('notification_preferences')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // 2. Design Tickets
        if (!Schema::hasTable('design_tickets')) {
            Schema::create('design_tickets', function (Blueprint $table) {
                $table->id();
                $table->string('ticket_number', 50)->unique(); // e.g. DSN-2026-0001
                $table->string('work_type', 50); // poster, social_creative, video_motion, presentation, other
                $table->string('title');
                $table->text('purpose')->nullable();
                $table->unsignedBigInteger('requester_id');
                $table->string('requesting_division', 100); // teaching, training, design, ai_ops
                $table->string('target_audience')->nullable();
                $table->string('publishing_channel')->nullable();
                $table->dateTime('required_by');
                $table->dateTime('committed_delivery_date')->nullable();
                $table->enum('priority', ['normal', 'high', 'urgent'])->default('normal');
                $table->longText('final_copy')->nullable();
                $table->text('reference_links')->nullable();
                $table->json('attachments')->nullable(); // raw footage, logos, photographs
                $table->text('brand_constraints')->nullable();
                $table->json('type_specific_fields')->nullable(); // dimensions, DPI, platforms, slide count, aspect ratio, etc.
                
                // Status matching PDF Module 5:
                // New, Assigned, In Progress, Submitted, In Review, Revision, Approved, Closed, On Hold, Cancelled
                $table->string('status', 30)->default('New');
                $table->string('ball_is_with', 50)->default('Design Lead'); // Design Lead, Designer, Requester, -

                $table->unsignedBigInteger('assigned_to')->nullable(); // Designer
                $table->json('collaborators')->nullable(); // Array of user IDs for multi-person video jobs
                $table->decimal('estimated_hours', 6, 2)->default(0);
                $table->decimal('actual_hours_logged', 6, 2)->default(0);

                $table->text('on_hold_reason')->nullable();
                $table->text('cancellation_reason')->nullable();
                $table->unsignedInteger('revision_count')->default(0);

                $table->unsignedBigInteger('current_version_id')->nullable();
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->dateTime('approved_at')->nullable();
                $table->unsignedBigInteger('second_level_approved_by')->nullable();
                $table->dateTime('second_level_approved_at')->nullable();
                
                $table->timestamps();

                $table->foreign('requester_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('assigned_to')->references('id')->on('users')->onDelete('set null');
            });
        }

        // 3. Design Versions (V1, V2, V3 with files, notes, approved flag)
        if (!Schema::hasTable('design_versions')) {
            Schema::create('design_versions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ticket_id');
                $table->unsignedInteger('version_number'); // 1, 2, 3...
                $table->unsignedBigInteger('uploader_id');
                $table->string('file_url');
                $table->string('file_name')->nullable();
                $table->string('file_type', 50)->default('image'); // image, video, pdf, archive
                $table->unsignedBigInteger('file_size_kb')->default(0);
                $table->text('change_notes')->nullable();
                $table->boolean('is_current')->default(true);
                $table->boolean('is_approved')->default(false);
                $table->timestamps();

                $table->foreign('ticket_id')->references('id')->on('design_tickets')->onDelete('cascade');
                $table->foreign('uploader_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // 4. Threaded Comments attached to specific versions
        if (!Schema::hasTable('design_comments')) {
            Schema::create('design_comments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ticket_id');
                $table->unsignedBigInteger('version_id')->nullable();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('parent_id')->nullable();
                $table->text('comment');
                $table->enum('status', ['open', 'resolved'])->default('open');
                $table->unsignedBigInteger('resolved_by')->nullable();
                $table->dateTime('resolved_at')->nullable();
                $table->timestamps();

                $table->foreign('ticket_id')->references('id')->on('design_tickets')->onDelete('cascade');
                $table->foreign('version_id')->references('id')->on('design_versions')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // 5. Asset Library (Auto-archived on approval, searchable, cloneable)
        if (!Schema::hasTable('design_assets')) {
            Schema::create('design_assets', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('campaign')->nullable();
                $table->string('division', 100)->nullable();
                $table->string('work_type', 50);
                $table->unsignedBigInteger('source_ticket_id')->nullable();
                $table->unsignedBigInteger('designer_id')->nullable();
                $table->string('preview_url')->nullable();
                $table->string('deliverable_url')->nullable();
                $table->string('source_file_url')->nullable(); // editable source file
                $table->json('packaged_formats')->nullable(); // print PDF, web JPG/PNG, source PSD/AI/FIG, video MP4
                $table->json('tags')->nullable();
                $table->unsignedInteger('usage_count')->default(0);
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->foreign('source_ticket_id')->references('id')->on('design_tickets')->onDelete('set null');
                $table->foreign('designer_id')->references('id')->on('users')->onDelete('set null');
            });
        }

        // 6. Audit Log (Immutable record of changes, transitions, deadlines, reassignments)
        if (!Schema::hasTable('design_audit_logs')) {
            Schema::create('design_audit_logs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ticket_id')->nullable();
                $table->unsignedBigInteger('user_id');
                $table->string('action', 100); // state_change, assigned, reassigned, deadline_edit, version_upload, approved, rejected
                $table->text('previous_value')->nullable();
                $table->text('new_value')->nullable();
                $table->text('reason')->nullable();
                $table->timestamps();

                $table->foreign('ticket_id')->references('id')->on('design_tickets')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // 7. Design Notifications
        if (!Schema::hasTable('design_notifications')) {
            Schema::create('design_notifications', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('ticket_id')->nullable();
                $table->unsignedBigInteger('user_id');
                $table->string('event', 100);
                $table->string('title');
                $table->text('message');
                $table->string('channel', 50)->default('in-app'); // email, in-app, email+in-app
                $table->boolean('is_read')->default(false);
                $table->timestamps();

                $table->foreign('ticket_id')->references('id')->on('design_tickets')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('design_notifications');
        Schema::dropIfExists('design_audit_logs');
        Schema::dropIfExists('design_assets');
        Schema::dropIfExists('design_comments');
        Schema::dropIfExists('design_versions');
        Schema::dropIfExists('design_tickets');
        Schema::dropIfExists('design_user_profiles');
    }
};
