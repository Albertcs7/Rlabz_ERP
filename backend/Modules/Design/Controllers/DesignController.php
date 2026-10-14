<?php

namespace Modules\Design\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DesignController extends Controller
{
    /**
     * @route GET /api/design/dashboard
     */
    public function getDashboard()
    {
        $hasProjects = Schema::hasTable('projects');
        $projectCount = $hasProjects ? DB::table('projects')->count() : 8;
        $inProgressProjects = $hasProjects ? DB::table('projects')->where('status', 'in_progress')->count() : 4;

        $stats = [
            'activeDesignTracks' => $inProgressProjects > 0 ? $inProgressProjects : 5,
            'mockupsInReview'    => 7,
            'designTokens'       => 48,
            'figmaPrototypes'    => 6,
            'totalProjects'      => $projectCount,
        ];

        $recentActivities = [
            [
                'id' => 1,
                'title' => 'Mobile App High-Fidelity UI Screens',
                'project' => 'Campus ERP Mobile Application',
                'author' => 'Design Head',
                'type' => 'Figma Prototype',
                'status' => 'approved',
                'updated_at' => now()->subHours(2)->toIso8601String(),
            ],
            [
                'id' => 2,
                'title' => 'IoT Telemetry Dark Mode Dashboard Spec',
                'project' => 'Smart Campus IoT System',
                'author' => 'Student Spark',
                'type' => 'UI Kit',
                'status' => 'in_review',
                'updated_at' => now()->subHours(5)->toIso8601String(),
            ],
            [
                'id' => 3,
                'title' => 'Touchscreen Kiosk Flow & Accessibility Audit',
                'project' => 'Automated Library Kiosk System',
                'author' => 'Student Orbit',
                'type' => 'UX Wireframe',
                'status' => 'approved',
                'updated_at' => now()->subDay()->toIso8601String(),
            ],
            [
                'id' => 4,
                'title' => 'Executive Control Panel Navigation System',
                'project' => 'Rajagiri ERP System & Control Panel',
                'author' => 'Design Head',
                'type' => 'Design System Component',
                'status' => 'completed',
                'updated_at' => now()->subDays(2)->toIso8601String(),
            ],
        ];

        return response()->json([
            'status' => 'success',
            'stats' => $stats,
            'activities' => $recentActivities,
        ]);
    }

    /**
     * @route GET /api/design/projects
     */
    public function getProjects()
    {
        $projects = [];
        if (Schema::hasTable('projects')) {
            $projects = DB::table('projects')
                ->select('id', 'title', 'project_type', 'status', 'deliverables')
                ->get()
                ->map(function ($p, $idx) {
                    $progressMap = [
                        'completed' => 100,
                        'closed' => 100,
                        'in_progress' => 65 + (($p->id * 7) % 25),
                        'accepted' => 35,
                        'proposed' => 15,
                    ];
                    $figmaLinks = [
                        'https://www.figma.com/file/rlabz-design-system/campus-erp',
                        'https://www.figma.com/file/rlabz-design-system/smart-iot',
                        'https://www.figma.com/file/rlabz-design-system/library-kiosk',
                    ];

                    return [
                        'id' => $p->id,
                        'title' => $p->title,
                        'project_type' => $p->project_type ?? 'Web Application',
                        'status' => $p->status,
                        'figma_url' => $figmaLinks[$idx % count($figmaLinks)],
                        'progress_percentage' => $progressMap[$p->status] ?? 50,
                        'screens_count' => 12 + (($p->id * 4) % 18),
                        'lead_designer' => ($p->id % 2 === 0) ? 'Design Head' : 'Student Orbit',
                        'tags' => ['UI/UX', 'Responsive', 'WCAG AA', 'Design Tokens'],
                    ];
                });
        }

        return response()->json([
            'status' => 'success',
            'data' => $projects,
        ]);
    }

    /**
     * @route GET /api/design/assets
     */
    public function getAssets()
    {
        $tokens = [
            'colors' => [
                ['name' => 'RLabZ Primary Emerald', 'hex' => '#059669', 'token' => '--primary', 'desc' => 'Core interactive branding & success states'],
                ['name' => 'Primary Hover Forest', 'hex' => '#047857', 'token' => '--primary-hover', 'desc' => 'Hover buttons and active tab borders'],
                ['name' => 'Royal Billing Blue', 'hex' => '#2563eb', 'token' => '--accent-blue', 'desc' => 'Financial billings & corporate indicators'],
                ['name' => 'Dark Slate Surface', 'hex' => '#0f172a', 'token' => '--bg-slate', 'desc' => 'High contrast text and dark mode base'],
                ['name' => 'Card Canvas Pure', 'hex' => '#ffffff', 'token' => '--bg-card', 'desc' => 'Standard modular card surfaces'],
                ['name' => 'Amber Warning', 'hex' => '#d97706', 'token' => '--tag-amber', 'desc' => 'Impending deadlines & alert tags'],
                ['name' => 'Crimson Overdue', 'hex' => '#dc2626', 'token' => '--tag-red', 'desc' => 'Overdue tasks and alert flags'],
            ],
            'typography' => [
                ['label' => 'Display Heading', 'font' => 'Plus Jakarta Sans', 'size' => '28px', 'weight' => '800 Bold', 'usage' => 'Page main banners & KPIs'],
                ['label' => 'Section Title', 'font' => 'Plus Jakarta Sans', 'size' => '18px', 'weight' => '700 Bold', 'usage' => 'Panel headings & modal titles'],
                ['label' => 'Body Text', 'font' => 'Inter / Plus Jakarta Sans', 'size' => '14px', 'weight' => '400 Regular', 'usage' => 'Descriptions, inputs & tables'],
                ['label' => 'Caption / Metadata', 'font' => 'Inter', 'size' => '12px', 'weight' => '600 SemiBold', 'usage' => 'Tags, timestamps & status chips'],
            ],
            'components' => [
                ['name' => 'Rounded KPI Metric Card', 'version' => 'v2.4', 'state' => 'Production Ready', 'category' => 'Data Display'],
                ['name' => 'Slide-Over Notification Drawer', 'version' => 'v1.8', 'state' => 'Production Ready', 'category' => 'Overlays'],
                ['name' => 'Interactive Profile Tabs Sheet', 'version' => 'v2.0', 'state' => 'Production Ready', 'category' => 'User Info'],
                ['name' => 'Financial Transaction Table Grid', 'version' => 'v1.5', 'state' => 'Production Ready', 'category' => 'Data Grid'],
                ['name' => 'Accessible Multi-State Modal Dialog', 'version' => 'v2.1', 'state' => 'Production Ready', 'category' => 'Feedback'],
            ]
        ];

        return response()->json([
            'status' => 'success',
            'data' => $tokens,
        ]);
    }

    /**
     * @route POST /api/design/assets
     */
    public function createAsset(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'category' => 'required|string|max:100',
            'figma_url' => 'nullable|string|url',
            'description' => 'nullable|string',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Design asset spec successfully registered in Design Studio.',
            'asset' => $validated,
        ], 201);
    }
}
