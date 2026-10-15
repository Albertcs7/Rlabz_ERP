<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('design_brand_kits')) {
            Schema::create('design_brand_kits', function (Blueprint $table) {
                $table->id();
                $table->string('slug', 100)->unique(); // e.g. rlabz_core
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->string('applicable_entity', 150)->nullable();
                $table->string('institution_or_client', 150)->nullable();
                $table->json('associated_projects')->nullable();
                $table->string('branding_portal_url', 255)->nullable();
                $table->string('logo_url', 255)->nullable();
                $table->json('brand_colors')->nullable();
                $table->json('typography')->nullable();
                $table->json('guidelines')->nullable();
                $table->json('downloadable_kits')->nullable();
                $table->boolean('is_active')->default(true);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });

            // Seed initial 4 brand kits
            $now = Carbon::now();
            DB::table('design_brand_kits')->insert([
                [
                    'slug' => 'rlabz_core',
                    'name' => 'RLabZ Core Platform Brand Kit',
                    'description' => 'Default master brand kit for RLabZ internal digital products, student portal, and general design briefs.',
                    'applicable_entity' => 'RLabZ Academy / Digital Platforms',
                    'institution_or_client' => 'RLabZ Innovations',
                    'associated_projects' => json_encode([1, 2]),
                    'branding_portal_url' => 'https://branding.rlabz.rajagiri.edu',
                    'logo_url' => '/assets/RlabZ_Logo.png',
                    'brand_colors' => json_encode([
                        ['name' => 'RLabZ Primary Teal', 'hex' => '#009688', 'token' => '--primary / --teal-500', 'usage' => 'Core Brand Color, Buttons, Interactive Elements, Active Tabs'],
                        ['name' => 'Deep Canvas Teal', 'hex' => '#004D40', 'token' => '--sidebar-bg / --teal-900', 'usage' => 'High-Contrast Sidebar, Brand Grounding, Dark Header Elements'],
                        ['name' => 'Forest Canopy Accent', 'hex' => '#00796B', 'token' => '--teal-700', 'usage' => 'Hover States, Section Accents, Elevated Badges'],
                        ['name' => 'Soft Mint Canvas Light', 'hex' => '#F0FAF9', 'token' => '--bg-canvas-light', 'usage' => 'Main ERP Background, Soft Tinted Contrast Canvas'],
                        ['name' => 'Surface Card Clean', 'hex' => '#FFFFFF', 'token' => '--surface-card', 'usage' => 'Card Panels, Clean White Negative Space'],
                        ['name' => 'Text Primary Slate', 'hex' => '#1A2E2B', 'token' => '--text-primary', 'usage' => 'Primary Headings, High-Legibility Typography'],
                    ]),
                    'typography' => json_encode([
                        ['label' => 'Primary Headings & Titles', 'family' => 'Plus Jakarta Sans', 'weights' => '700 Bold, 800 ExtraBold', 'usage' => 'Page headers, modal titles, key numerical metrics'],
                        ['label' => 'Interface Body & Forms', 'family' => 'Plus Jakarta Sans / Inter', 'weights' => '400 Regular, 500 Medium, 600 SemiBold', 'usage' => 'Form labels, table text, metadata, card descriptions'],
                        ['label' => 'Data & Code Elements', 'family' => 'ui-monospace, monospace', 'weights' => '500 Medium', 'usage' => 'Ticket IDs (DSN-YYYY-XXXX), color hex values, tokens'],
                    ]),
                    'guidelines' => json_encode([
                        'Do not alter the proportional aspect ratio of the Rajagiri or RLabZ crest logo mark.',
                        'Maintain minimum clear space equal to the height of the letter "R" around the logo mark.',
                        'For print posters, ensure CMYK 300 DPI output with minimum 3mm bleed margin.',
                        'Subtitles in vertical video reels must stay inside the 9:16 safe title boundary (120px margins top & bottom).',
                        'Deliverables approved by requesters are automatically archived into the shared Asset Library.',
                    ]),
                    'downloadable_kits' => json_encode([
                        ['title' => 'RLabZ Official Primary Logo (Light)', 'file_size' => '920 KB', 'format' => 'PNG (High-Res)', 'url' => '/assets/RlabZ_Logo.png', 'is_available' => true],
                        ['title' => 'RLabZ Dark Variant Logo', 'file_size' => '82 KB', 'format' => 'PNG (Dark)', 'url' => '/assets/Rlabz_Logo_dark.png', 'is_available' => true],
                        ['title' => 'RLabZ Official Watermark Graphic', 'file_size' => '180 KB', 'format' => 'PNG (Transparent)', 'url' => '/assets/RlabZ_Watermark.png', 'is_available' => true],
                        ['title' => 'Official Brand Guidelines PDF Booklet', 'file_size' => 'Pending', 'format' => 'PDF', 'url' => null, 'is_available' => false, 'note' => 'Available Soon / Pending Division Upload'],
                        ['title' => 'Master Vector SVG/EPS Pack', 'file_size' => 'Pending', 'format' => 'ZIP (Vector)', 'url' => null, 'is_available' => false, 'note' => 'Available Soon / Pending Division Upload'],
                    ]),
                    'is_active' => true,
                    'created_by' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'slug' => 'rajagiri_college',
                    'name' => 'Rajagiri College Institutional Brand Kit',
                    'description' => 'Official corporate identity for Rajagiri College of Social Sciences (Autonomous) institutional applications.',
                    'applicable_entity' => 'Department of Computer Applications / College Administration',
                    'institution_or_client' => 'Rajagiri College of Social Sciences (Autonomous)',
                    'associated_projects' => json_encode([3, 4, 7, 9, 10]),
                    'branding_portal_url' => 'https://rajagiri.edu',
                    'logo_url' => '/assets/RlabZ_Logo.png',
                    'brand_colors' => json_encode([
                        ['name' => 'Rajagiri Institutional Burgundy', 'hex' => '#800020', 'token' => '--brand-burgundy', 'usage' => 'Official college seals, certificate borders, formal letterheads'],
                        ['name' => 'Rajagiri Academic Gold', 'hex' => '#D4AF37', 'token' => '--brand-gold', 'usage' => 'Convocations, honor cords, ceremonial graphics, crest embellishments'],
                        ['name' => 'Deep Collegiate Navy', 'hex' => '#0A192F', 'token' => '--brand-navy', 'usage' => 'Executive documentation, institutional reports, formal presentations'],
                        ['name' => 'Parchment Ivory Canvas', 'hex' => '#FDFBF7', 'token' => '--bg-parchment', 'usage' => 'Formal certificates, invitation cards, official documents'],
                        ['name' => 'Slate Formal Neutral', 'hex' => '#334155', 'token' => '--text-formal', 'usage' => 'Body text, academic transcripts, event programmes'],
                    ]),
                    'typography' => json_encode([
                        ['label' => 'Ceremonial & Formal Headings', 'family' => 'Cinzel / Garamond / Serif', 'weights' => '600 SemiBold, 700 Bold', 'usage' => 'Certificates, annual report covers, convocation posters'],
                        ['label' => 'Standard Academic Body', 'family' => 'Inter / Times New Roman', 'weights' => '400 Regular, 500 Medium', 'usage' => 'Circulars, syllabus layouts, academic announcements'],
                    ]),
                    'guidelines' => json_encode([
                        'The college coat of arms must always sit prominently at the top-center or top-left of official media.',
                        'Burgundy and Gold must always maintain high contrast; do not place gold text over white backgrounds.',
                        'Academic division notices require institutional signature block approved by Vice-Principal / Dean.',
                    ]),
                    'downloadable_kits' => json_encode([
                        ['title' => 'Rajagiri College Official Seal', 'file_size' => '1.2 MB', 'format' => 'PNG (High-Res)', 'url' => '/assets/RlabZ_Logo.png', 'is_available' => true],
                        ['title' => 'Institutional Typography Package', 'file_size' => 'Pending', 'format' => 'ZIP', 'url' => null, 'is_available' => false, 'note' => 'Available Soon / Pending Division Upload'],
                    ]),
                    'is_active' => true,
                    'created_by' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'slug' => 'tech_solutions',
                    'name' => 'Tech Solutions Pvt Ltd Client Approved Kit',
                    'description' => 'Approved external client brand identity for Smart Campus IoT and enterprise cloud products.',
                    'applicable_entity' => 'Tech Solutions Pvt Ltd (External Client)',
                    'institution_or_client' => 'Tech Solutions Pvt Ltd',
                    'associated_projects' => json_encode([8]),
                    'branding_portal_url' => null,
                    'logo_url' => null,
                    'brand_colors' => json_encode([
                        ['name' => 'Tech Electric Blue', 'hex' => '#2563EB', 'token' => '--tech-blue', 'usage' => 'Primary UI CTA, tech hardware casing accents, dashboard indicators'],
                        ['name' => 'Cyan Sensor Glow', 'hex' => '#06B6D4', 'token' => '--sensor-cyan', 'usage' => 'Real-time telemetry alerts, IoT network node indicators'],
                        ['name' => 'Dark Terminal Navy', 'hex' => '#0F172A', 'token' => '--tech-terminal', 'usage' => 'High-contrast IoT telemetry dark mode backdrop'],
                        ['name' => 'Clean Tech Surface', 'hex' => '#F8FAFC', 'token' => '--tech-surface', 'usage' => 'Enterprise admin consoles, diagnostic charts'],
                    ]),
                    'typography' => json_encode([
                        ['label' => 'Digital Headings & Dashboards', 'family' => 'Outfit / Inter', 'weights' => '600 SemiBold, 700 Bold', 'usage' => 'IoT real-time dashboards, client pitch decks'],
                        ['label' => 'Sensor Telemetry & Numbers', 'family' => 'JetBrains Mono / monospace', 'weights' => '500 Medium', 'usage' => 'Device MAC IDs, sensor readings, IP matrices'],
                    ]),
                    'guidelines' => json_encode([
                        'All public releases must contain "Powered by Tech Solutions IoT Architecture" attribution line.',
                        'Use high-contrast electric blue on dark terminal backdrops for operations center displays.',
                    ]),
                    'downloadable_kits' => json_encode([
                        ['title' => 'Client Vector Lockup Pack', 'file_size' => 'Pending', 'format' => 'ZIP', 'url' => null, 'is_available' => false, 'note' => 'Available Soon / Client Upload Pending'],
                    ]),
                    'is_active' => true,
                    'created_by' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'slug' => 'rajagiri_alumni',
                    'name' => 'Rajagiri Alumni & Placement Relations Kit',
                    'description' => 'Official branding for alumni chapters, career fairs, placement drives, and global chapters.',
                    'applicable_entity' => 'Rajagiri Placement Cell & Alumni Relations',
                    'institution_or_client' => 'Rajagiri Alumni Association',
                    'associated_projects' => json_encode([6]),
                    'branding_portal_url' => null,
                    'logo_url' => null,
                    'brand_colors' => json_encode([
                        ['name' => 'Executive Royal Indigo', 'hex' => '#312E81', 'token' => '--alumni-indigo', 'usage' => 'Placement brochures, chapter flags, LinkedIn networking graphics'],
                        ['name' => 'Achievement Gold', 'hex' => '#F59E0B', 'token' => '--alumni-gold', 'usage' => 'Distinguished alumni awards, milestone badges, keynote banners'],
                        ['name' => 'Clean Crisp Grey', 'hex' => '#F3F4F6', 'token' => '--alumni-canvas', 'usage' => 'Resume books, recruiter dossier layouts'],
                    ]),
                    'typography' => json_encode([
                        ['label' => 'Placement Titles & Headlines', 'family' => 'Plus Jakarta Sans', 'weights' => '700 Bold, 800 ExtraBold', 'usage' => 'Placement statistics, recruitment banners'],
                        ['label' => 'Editorial & Student Profiles', 'family' => 'Inter', 'weights' => '400 Regular, 500 Medium', 'usage' => 'Student bios, company recruiter guidelines'],
                    ]),
                    'guidelines' => json_encode([
                        'Career fair posters must prominently feature participating enterprise partner logos in equal-size lockups.',
                        'Do not use informal cartoon graphics for recruitment or placement announcements.',
                    ]),
                    'downloadable_kits' => json_encode([
                        ['title' => 'Alumni Chapter Badge Pack', 'file_size' => 'Pending', 'format' => 'ZIP', 'url' => null, 'is_available' => false, 'note' => 'Available Soon / Pending Division Upload'],
                    ]),
                    'is_active' => true,
                    'created_by' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('design_brand_kits');
    }
};
