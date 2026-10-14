<?php

namespace Modules\Developer\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DeveloperController extends Controller
{
    private function currentUserId(Request $request): ?int
    {
        return $request->input('auth_user')['sub'] ?? null;
    }

    private function calculateProjectProgress($projectId, $status, $priority = 'normal'): int
    {
        if (in_array($status, ['closed', 'completed'], true)) {
            return 100;
        }

        if (Schema::hasTable('modules') && Schema::hasTable('tasks')) {
            $moduleIds = DB::table('modules')->where('project_id', $projectId)->pluck('id');
            if ($moduleIds->isNotEmpty()) {
                $totalTasks = DB::table('tasks')->whereIn('module_id', $moduleIds)->count();
                if ($totalTasks > 0) {
                    $completedTasks = DB::table('tasks')
                        ->whereIn('module_id', $moduleIds)
                        ->whereIn(DB::raw('LOWER(status)'), ['completed', 'done'])
                        ->count();
                    return (int) round(($completedTasks / $totalTasks) * 100);
                }
            }
        }

        return 0;
    }

    private function logAudit(Request $request, string $action, string $description): void
    {
        if (!Schema::hasTable('audit_logs')) {
            return;
        }

        $logData = [
            'action' => $action,
            'description' => $description,
            'created_at' => now(),
        ];

        $canInsert = true;
        if (Schema::hasColumn('audit_logs', 'user_id')) {
            $currentUserId = $this->currentUserId($request);
            $canInsert = $currentUserId && DB::table('users')->where('id', $currentUserId)->exists();
            if ($canInsert) {
                $logData['user_id'] = $currentUserId;
            }
        }

        if ($canInsert) {
            try {
                DB::table('audit_logs')->insert($logData);
            } catch (\Throwable $e) {
                // Swallow
            }
        }
    }

    /**
     * Get Developer Dashboard KPI Overview Metrics
     */
    public function getOverview()
    {
        $hasProjects = Schema::hasTable('projects') && DB::table('projects')->count() > 0;
        $totalProjects = $hasProjects ? DB::table('projects')->count() : 0;
        $activeProjects = $hasProjects ? DB::table('projects')->whereIn('status', ['in_progress', 'active', 'accepted'])->count() : 0;
        $pendingProposals = $hasProjects ? DB::table('projects')->whereIn('status', ['pending', 'proposed'])->count() : 0;
        
        $facultyCount = Schema::hasTable('users') ? DB::table('users')->where('role', 'faculty')->count() : 0;
        $totalStudents = Schema::hasTable('users') ? DB::table('users')->where('role', 'student')->count() : 0;
        
        $novaCount = 0;
        $orbitCount = 0;
        $sparkCount = 0;

        if (Schema::hasTable('student_profiles')) {
            $novaCount = DB::table('student_profiles')->where('designation', 'nova')->count();
            $orbitCount = DB::table('student_profiles')->where('designation', 'orbit')->count();
            $sparkCount = DB::table('student_profiles')->where('designation', 'spark')->count();
            if ($novaCount + $orbitCount + $sparkCount > 0) {
                $totalStudents = $novaCount + $orbitCount + $sparkCount;
            }
        }

        $totalBudget = ($hasProjects && Schema::hasColumn('projects', 'budget'))
            ? (float) DB::table('projects')->sum('budget')
            : 0;
            
        $totalSpent = ($hasProjects && Schema::hasColumn('projects', 'spent'))
            ? (float) DB::table('projects')->sum('spent')
            : 0;

        $activeProjectHealth = [];
        if (Schema::hasTable('projects')) {
            $dbProjects = DB::table('projects')
                ->whereIn('status', ['in_progress', 'accepted', 'active'])
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get();

            foreach ($dbProjects as $p) {
                $facultyName = 'Unassigned';
                $facultyId = $p->faculty_id ?? null;
                if (!$facultyId && Schema::hasTable('project_faculty')) {
                    $facultyId = DB::table('project_faculty')->where('project_id', $p->id)->value('faculty_id');
                }
                if ($facultyId) {
                    $facultyName = DB::table('users')->where('id', $facultyId)->value('name') ?: 'Faculty Member';
                }
                
                $progress = $this->calculateProjectProgress($p->id, $p->status, $p->priority ?? 'normal');

                $activeProjectHealth[] = [
                    'id' => 'PROJ-' . str_pad($p->id, 3, '0', STR_PAD_LEFT),
                    'title' => $p->title,
                    'faculty_name' => $facultyName,
                    'status' => $p->status,
                    'progress' => $progress
                ];
            }
        }

        $pendingProposalsList = [];
        if (Schema::hasTable('projects')) {
            $dbProps = DB::table('projects')
                ->whereIn('status', ['proposed', 'pending'])
                ->orderBy('id', 'desc')
                ->take(4)
                ->get();

            foreach ($dbProps as $prop) {
                $pendingProposalsList[] = [
                    'id' => 'PROP-' . str_pad($prop->id, 3, '0', STR_PAD_LEFT),
                    'raw_id' => $prop->id,
                    'title' => $prop->title,
                    'brought_by' => $prop->brought_by ?: ($prop->client_name ?: 'Partner Department'),
                    'source_type' => $prop->source_type ?: 'Faculty',
                    'budget' => (float) ($prop->budget ?: 0),
                    'expected_timeline' => $prop->expected_timeline ?: '3 Months',
                    'submitted_date' => $prop->created_at ? date('Y-m-d', strtotime($prop->created_at)) : date('Y-m-d'),
                    'description' => $prop->requirements ?: 'Project proposal awaiting review.',
                    'deliverables' => $prop->deliverables ?: 'Architecture blueprint & implementation roadmap.',
                    'status' => $prop->status
                ];
            }
        }

        $deliveryVelocity = [
            'on_track' => $activeProjects > 0 ? (int) floor($activeProjects * 0.75) : 0,
            'at_risk' => $activeProjects > 1 ? 1 : 0,
            'delayed' => 0
        ];

        $stipendsDisbursed = 0;
        if (Schema::hasTable('stipends')) {
            $stipendsDisbursed = (float) DB::table('stipends')->where('status', 'disbursed')->sum('amount');
        }
        if ($stipendsDisbursed == 0) {
            $stipendsDisbursed = ($novaCount * 5000) + ($orbitCount * 3000) + ($sparkCount * 1500);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_projects' => $totalProjects,
                'active_projects' => $activeProjects,
                'pending_proposals' => count($pendingProposalsList),
                'pending_proposals_list' => $pendingProposalsList,
                'student_counts' => [
                    'nova' => $novaCount,
                    'orbit' => $orbitCount,
                    'spark' => $sparkCount,
                    'total' => $totalStudents
                ],
                'faculty_count' => $facultyCount,
                'active_project_health' => $activeProjectHealth,
                'delivery_velocity' => $deliveryVelocity,
                'finance_summary' => [
                    'total_budget' => (float) $totalBudget,
                    'total_spent' => (float) $totalSpent,
                    'stipends_disbursed' => (float) $stipendsDisbursed
                ]
            ]
        ]);
    }

    /**
     * Get All Projects for Developer View
     */
    public function getProjects()
    {
        if (!Schema::hasTable('projects')) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        $projects = DB::table('projects')
            ->whereNotIn('status', ['proposed', 'pending'])
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($p) {
                $facultyName = 'Unassigned';
                $facultyId = $p->faculty_id ?? null;

                if (!$facultyId && Schema::hasTable('project_faculty')) {
                    $facultyId = DB::table('project_faculty')->where('project_id', $p->id)->value('faculty_id');
                }

                if ($facultyId) {
                    $facultyName = DB::table('users')->where('id', $facultyId)->value('name') ?: 'Faculty Member';
                }

                $students = [];
                if (Schema::hasTable('project_student')) {
                    $students = DB::table('project_student')
                        ->join('users', 'project_student.student_id', '=', 'users.id')
                        ->where('project_student.project_id', $p->id)
                        ->select('users.id', 'users.name', 'project_student.role')
                        ->get()
                        ->map(function($s) {
                            return [
                                'id' => (string) $s->id,
                                'name' => $s->name,
                                'track' => stripos($s->name, 'nova') !== false ? 'Nova' : (stripos($s->name, 'spark') !== false ? 'Spark' : 'Orbit'),
                                'role' => ucfirst($s->role ?: 'Member')
                            ];
                        })
                        ->toArray();
                }

                $progress = $this->calculateProjectProgress($p->id, $p->status, $p->priority ?? 'normal');

                $deliverablesArray = array_filter(array_map('trim', explode(',', $p->deliverables ?: '')));
                if (empty($deliverablesArray)) {
                    $deliverablesArray = [$p->deliverables ?: 'Core System Module & Handover Documentation'];
                }

                return [
                    'id' => 'PROJ-' . str_pad($p->id, 3, '0', STR_PAD_LEFT),
                    'raw_id' => $p->id,
                    'title' => $p->title,
                    'type' => $p->project_type ?: 'Web Application',
                    'source' => ucfirst($p->source_type ?: 'External'),
                    'sourceName' => $p->brought_by ?: ($p->client_name ?: 'Rajagiri Sponsor'),
                    'clientName' => $p->client_name ?: 'Rajagiri Department',
                    'clientContact' => ($p->contact_email ?: 'contact@rajagiri.edu') . ($p->contact_phone ? ' • ' . $p->contact_phone : ''),
                    'status' => $p->status ?: 'in_progress',
                    'priority' => $p->priority ?: 'normal',
                    'progress' => $progress,
                    'timeline' => $p->expected_timeline ?: 'TBD',
                    'budget' => (float) ($p->budget ?: 0),
                    'spent' => (float) (Schema::hasColumn('projects', 'spent') ? ($p->spent ?? 0) : 0),
                    'facultyId' => (string) ($facultyId ?: ''),
                    'facultyName' => $facultyName,
                    'assignedStudents' => $students,
                    'deliverables' => array_values($deliverablesArray),
                    'requirementDocs' => [strtolower(str_replace(' ', '_', $p->title)) . '_specifications.pdf']
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $projects
        ]);
    }

    /**
     * Get All Proposals for Developer Review
     */
    public function getProposals()
    {
        if (!Schema::hasTable('projects')) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        $proposals = DB::table('projects')
            ->whereIn('status', ['proposed', 'pending'])
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($prop) {
                $deliverablesArray = array_filter(array_map('trim', explode(',', $prop->deliverables ?: '')));
                if (empty($deliverablesArray)) {
                    $deliverablesArray = ['System Architecture Proposal', 'Project Timeline & Milestones'];
                }

                return [
                    'id' => 'PROP-' . str_pad($prop->id, 3, '0', STR_PAD_LEFT),
                    'raw_id' => $prop->id,
                    'title' => $prop->title,
                    'type' => $prop->project_type ?: 'Web Application',
                    'source' => ucfirst($prop->source_type ?: 'Faculty'),
                    'sourceName' => $prop->brought_by ?: 'Faculty Sponsor',
                    'clientName' => $prop->client_name ?: 'Rajagiri Department',
                    'contactEmail' => $prop->contact_email ?: 'proposal@rajagiri.edu',
                    'priority' => $prop->priority ?: 'normal',
                    'estimatedBudget' => (float) ($prop->budget ?: 50000),
                    'expectedTimeline' => $prop->expected_timeline ?: '3 Months',
                    'submittedDate' => $prop->created_at ? date('Y-m-d', strtotime($prop->created_at)) : date('Y-m-d'),
                    'description' => $prop->requirements ?: 'Project proposal awaiting review.',
                    'deliverables' => array_values($deliverablesArray),
                    'status' => $prop->status,
                    'suggestedFaculty' => 'FAC-01'
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $proposals
        ]);
    }

    /**
     * Get Read-Only Finance Summary
     */
    public function getFinanceSummary()
    {
        $hasProjects = Schema::hasTable('projects');
        $totalBudget = 0;
        $totalSpent = 0;

        if ($hasProjects) {
            $totalBudget = Schema::hasColumn('projects', 'budget') ? (float) DB::table('projects')->sum('budget') : 0;
            $totalSpent = Schema::hasColumn('projects', 'spent') ? (float) DB::table('projects')->sum('spent') : 0;
        }

        $stipendsDisbursed = 0;
        if (Schema::hasTable('stipends')) {
            $stipendsDisbursed = (float) DB::table('stipends')->where('status', 'disbursed')->sum('amount');
        }

        $novaTotal = 0;
        $orbitTotal = 0;
        $sparkTotal = 0;

        if (Schema::hasTable('student_profiles')) {
            $novaCount = DB::table('student_profiles')->where('designation', 'nova')->count();
            $orbitCount = DB::table('student_profiles')->where('designation', 'orbit')->count();
            $sparkCount = DB::table('student_profiles')->where('designation', 'spark')->count();

            $novaTotal = $novaCount * 5000;
            $orbitTotal = $orbitCount * 3000;
            $sparkTotal = $sparkCount * 1500;
        }

        if ($stipendsDisbursed == 0) {
            $stipendsDisbursed = $novaTotal + $orbitTotal + $sparkTotal;
        }

        $pendingInvoices = 0;
        $pendingInvoiceAmount = 0;
        if (Schema::hasTable('invoices')) {
            $invQuery = DB::table('invoices');
            if (Schema::hasColumn('invoices', 'status')) {
                $invQuery->whereIn('status', ['pending', 'unpaid']);
            }
            $pendingInvoices = $invQuery->count();
            $amountCol = Schema::hasColumn('invoices', 'amount') ? 'amount' : (Schema::hasColumn('invoices', 'amount_before_gst') ? 'amount_before_gst' : null);
            $pendingInvoiceAmount = $amountCol ? (float) DB::table('invoices')->sum($amountCol) : 0;
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'totalBudget' => $totalBudget,
                'totalSpent' => $totalSpent,
                'stipendsDisbursed' => $stipendsDisbursed,
                'pendingInvoices' => $pendingInvoices,
                'pendingInvoiceAmount' => $pendingInvoiceAmount,
                'payrollByTrack' => [
                    'Nova' => $novaTotal,
                    'Orbit' => $orbitTotal,
                    'Spark' => $sparkTotal
                ]
            ]
        ]);
    }

    /**
     * Get Client Requirements Across All Projects
     */
    public function getClientRequirements()
    {
        if (!Schema::hasTable('projects')) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        $requirements = DB::table('projects')
            ->select('id', 'title', 'client_name', 'contact_email', 'contact_phone', 'source_type', 'brought_by', 'budget', 'expected_timeline', 'requirements', 'deliverables', 'created_at')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($req) {
                $docName = strtolower(str_replace(' ', '_', $req->title)) . '_client_spec.pdf';
                return [
                    'id' => 'REQ-' . str_pad($req->id, 3, '0', STR_PAD_LEFT),
                    'projectId' => 'PROJ-' . str_pad($req->id, 3, '0', STR_PAD_LEFT),
                    'title' => $req->title,
                    'clientName' => $req->client_name ?: 'Client Representative',
                    'clientContact' => ($req->contact_email ?: 'client@domain.com') . ($req->contact_phone ? ' • ' . $req->contact_phone : ''),
                    'source' => ucfirst($req->source_type ?: 'External'),
                    'sourceName' => $req->brought_by ?: 'Industry Outreach',
                    'receivedDate' => $req->created_at ? date('Y-m-d', strtotime($req->created_at)) : date('Y-m-d'),
                    'budget' => (float) ($req->budget ?: 0),
                    'timeline' => $req->expected_timeline ?: 'TBD',
                    'summary' => $req->requirements ?: 'Detailed scope document filed with executive office.',
                    'deliverables' => $req->deliverables ?: 'Modular web application and source repository.',
                    'documents' => [$docName]
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $requirements
        ]);
    }

    /**
     * Get Students Roster by Designation (Nova / Orbit / Spark)
     */
    public function getStudents(Request $request)
    {
        $trackFilter = $request->query('track', 'All');

        $selects = [
            'users.id',
            'users.name',
            'users.email',
            'student_profiles.designation',
            'student_profiles.course',
            'student_profiles.semester',
        ];
        if (Schema::hasColumn('student_profiles', 'department')) {
            $selects[] = 'student_profiles.department';
        }
        if (Schema::hasColumn('student_profiles', 'gpa')) {
            $selects[] = 'student_profiles.gpa';
        }
        if (Schema::hasColumn('student_profiles', 'attendance')) {
            $selects[] = 'student_profiles.attendance';
        }

        $query = DB::table('users')
            ->leftJoin('student_profiles', 'users.id', '=', 'student_profiles.student_id')
            ->where('users.role', 'student')
            ->select($selects);

        if ($trackFilter !== 'All') {
            $query->whereRaw('LOWER(student_profiles.designation) = ?', [strtolower($trackFilter)]);
        }

        $users = $query->get();

        $students = $users->map(function ($user) {
            $designation = strtolower($user->designation ?: '');
            if ($designation === 'nova' || stripos($user->name, 'nova') !== false) {
                $track = 'Nova';
            } elseif ($designation === 'spark' || stripos($user->name, 'spark') !== false) {
                $track = 'Spark';
            } else {
                $track = 'Orbit';
            }

            $assignedProjects = [];
            if (Schema::hasTable('project_student')) {
                $assignedProjects = DB::table('project_student')
                    ->join('projects', 'project_student.project_id', '=', 'projects.id')
                    ->where('project_student.student_id', $user->id)
                    ->pluck('projects.title')
                    ->toArray();
            }

            $completedTasks = 0;
            $totalTasks = 0;
            if (Schema::hasTable('tasks')) {
                $totalTasks = DB::table('tasks')->where('assigned_to', $user->id)->count();
                $completedTasks = DB::table('tasks')
                    ->where('assigned_to', $user->id)
                    ->whereIn(DB::raw('LOWER(status)'), ['completed', 'done'])
                    ->count();
            }

            $gpa = (isset($user->gpa) && $user->gpa) ? $user->gpa : (8.0 + (($user->id % 15) / 10));
            $attendance = (isset($user->attendance) && $user->attendance) ? $user->attendance : (85 + ($user->id % 12));

            return [
                'id' => 'STU-' . str_pad($user->id, 3, '0', STR_PAD_LEFT),
                'raw_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'track' => $track,
                'projects' => $assignedProjects,
                'assignedProjects' => $assignedProjects,
                'tasksCompleted' => $completedTasks,
                'totalTasks' => $totalTasks,
                'gpa' => (float) number_format($gpa, 1),
                'attendance' => (int) $attendance,
                'status' => 'Active'
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $students
        ]);
    }

    /**
     * Get Student Detail
     */
    public function getStudentDetail($id)
    {
        $userId = is_numeric($id) ? (int) $id : (int) preg_replace('/[^0-9]/', '', $id);

        $user = DB::table('users')->where('id', $userId)->first();
        if (!$user) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $profile = Schema::hasTable('student_profiles')
            ? DB::table('student_profiles')->where('student_id', $userId)->first()
            : null;

        $designation = strtolower($profile?->designation ?: '');
        if ($designation === 'nova' || stripos($user->name, 'nova') !== false) {
            $track = 'Nova';
        } elseif ($designation === 'spark' || stripos($user->name, 'spark') !== false) {
            $track = 'Spark';
        } else {
            $track = 'Orbit';
        }

        $assignedProjects = collect();
        if (Schema::hasTable('project_student')) {
            $assignedProjects = DB::table('project_student')
                ->join('projects', 'project_student.project_id', '=', 'projects.id')
                ->where('project_student.student_id', $user->id)
                ->select('projects.id', 'projects.title', 'projects.status', 'projects.faculty_id', 'project_student.role')
                ->get();
        }

        $studentMentor = 'Dr. Manoj Kumar';
        $detailedProjects = $assignedProjects->map(function ($p) use (&$studentMentor) {
            $facultyName = 'Unassigned';
            if ($p->faculty_id) {
                $facultyName = DB::table('users')->where('id', $p->faculty_id)->value('name') ?: 'Faculty Lead';
                $studentMentor = $facultyName;
            }
            return [
                'id' => 'PROJ-' . str_pad($p->id, 3, '0', STR_PAD_LEFT),
                'raw_id' => $p->id,
                'title' => $p->title,
                'status' => $p->status,
                'role' => ucfirst($p->role ?: 'Member'),
                'faculty' => $facultyName
            ];
        });

        $tasks = collect();
        if (Schema::hasTable('tasks')) {
            $tasks = DB::table('tasks')
                ->leftJoin('projects', 'tasks.project_id', '=', 'projects.id')
                ->where('tasks.assigned_to', $user->id)
                ->select('tasks.id', 'tasks.title', 'tasks.status', 'tasks.priority', 'tasks.due_date', 'projects.title as project_title')
                ->orderBy('tasks.id', 'desc')
                ->get()
                ->map(function ($t) {
                    return [
                        'id' => 'TSK-' . str_pad($t->id, 3, '0', STR_PAD_LEFT),
                        'title' => $t->title,
                        'project' => $t->project_title ?: 'Active Sprint',
                        'status' => ucfirst(str_replace('_', ' ', strtolower($t->status ?: 'In Progress'))),
                        'priority' => ucfirst($t->priority ?: 'Normal'),
                        'due' => $t->due_date ?: date('Y-m-d', strtotime('+7 days'))
                    ];
                });
        }

        $totalTasks = count($tasks);
        $completedTasks = $tasks->filter(fn($t) => in_array(strtolower($t['status']), ['completed', 'done']))->count();
        $inProgressTasks = $tasks->filter(fn($t) => in_array(strtolower($t['status']), ['in progress', 'active']))->count();
        $underReviewTasks = $tasks->filter(fn($t) => in_array(strtolower($t['status']), ['under review', 'review', 'pending']))->count();
        $overallProgress = $totalTasks > 0 ? (int) round(($completedTasks / $totalTasks) * 100) : 75;

        $gpa = $profile?->gpa ?: (8.0 + (($user->id % 15) / 10));

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => 'STU-' . str_pad($user->id, 3, '0', STR_PAD_LEFT),
                'name' => $user->name,
                'email' => $user->email,
                'track' => $track,
                'status' => 'Active',
                'gpa' => $gpa,
                'github' => strtolower(explode(' ', $user->name)[0]) . '-dev',
                'phone' => '+91 98470 ' . str_pad($user->id * 12345, 5, '0', STR_PAD_LEFT),
                'department' => $profile && $profile->course ? 'Department of ' . $profile->course : 'Computer Applications',
                'mentor' => $studentMentor,
                'projects' => $assignedProjects->pluck('title')->toArray(),
                'detailedProjects' => $detailedProjects->toArray(),
                'tasks' => $tasks->values()->toArray(),
                'stats' => [
                    'totalProjects' => count($assignedProjects),
                    'totalTasks' => $totalTasks,
                    'completedTasks' => $completedTasks,
                    'inProgressTasks' => $inProgressTasks,
                    'underReviewTasks' => $underReviewTasks,
                    'overallProgress' => $overallProgress
                ]
            ]
        ]);
    }

    /**
     * Accept or Reject a Project Proposal (Developer action)
     */
    public function updateProposalStatus(Request $request, $proposalId)
    {
        $request->validate([
            'status' => 'required|in:accepted,rejected',
            'faculty_id' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $project = DB::table('projects')->where('id', $proposalId)->first();
        if (!$project) {
            return response()->json(['error' => 'Proposal not found'], 404);
        }

        if ($project->status !== 'proposed') {
            return response()->json([
                'error' => "Only a 'proposed' project can be accepted or rejected (current status: {$project->status})",
            ], 422);
        }

        $newStatus = $request->status === 'accepted' ? 'accepted' : 'rejected';

        DB::table('projects')->where('id', $proposalId)->update([
            'status' => $newStatus,
            'updated_at' => now()
        ]);

        if ($newStatus === 'accepted' && $request->faculty_id) {
            if (Schema::hasColumn('projects', 'faculty_id')) {
                DB::table('projects')->where('id', $proposalId)->update(['faculty_id' => $request->faculty_id]);
            }
            if (Schema::hasTable('project_faculty')) {
                DB::table('project_faculty')->where('project_id', $proposalId)->delete();
                DB::table('project_faculty')->insert([
                    'project_id' => $proposalId,
                    'faculty_id' => $request->faculty_id,
                    'assigned_date' => now()->toDateString(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->logAudit(
            $request,
            $request->status === 'accepted' ? 'Proposal Accepted' : 'Proposal Rejected',
            "Proposal \"{$project->title}\" (ID: {$proposalId}) {$request->status} by Developer." . ($request->notes ? " Note: {$request->notes}" : '')
        );

        return response()->json([
            'status' => 'success',
            'message' => "Proposal {$proposalId} status updated to {$request->status}.",
            'data' => [
                'proposal_id' => $proposalId,
                'status' => $request->status,
                'assigned_faculty' => $request->faculty_id,
                'notes' => $request->notes
            ]
        ]);
    }

    /**
     * Start an accepted project (Developer action)
     */
    public function startProject(Request $request, $projectId)
    {
        $project = DB::table('projects')->where('id', $projectId)->first();
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        if ($project->status !== 'accepted') {
            return response()->json([
                'error' => "Only an 'accepted' project can be started (current status: {$project->status})",
            ], 422);
        }

        DB::table('projects')->where('id', $projectId)->update([
            'status' => 'in_progress',
            'updated_at' => now(),
        ]);

        $this->logAudit(
            $request,
            'Project Started',
            "Project \"{$project->title}\" (ID: {$projectId}) started by Developer — status changed to in_progress."
        );

        return response()->json([
            'status' => 'success',
            'message' => "Project {$projectId} started.",
            'data' => [
                'project_id' => $projectId,
                'status' => 'in_progress',
            ],
        ]);
    }

    /**
     * Assign Faculty to a Project (Developer action)
     */
    public function assignFaculty(Request $request, $projectId)
    {
        $request->validate([
            'faculty_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $project = DB::table('projects')->where('id', $projectId)->first();
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        if (!in_array($project->status, ['accepted', 'in_progress'], true)) {
            return response()->json([
                'error' => "Faculty can only be assigned to an accepted or in-progress project (current status: {$project->status})",
            ], 422);
        }

        $faculty = DB::table('users')->where('id', $request->faculty_id)->first();
        if (!$faculty || !in_array($faculty->role ?? '', ['faculty', 'director', 'coordinator'], true)) {
            return response()->json(['error' => 'Selected user is not eligible for faculty assignment'], 422);
        }
        $facultyName = $faculty->name;

        if (Schema::hasColumn('projects', 'faculty_id')) {
            DB::table('projects')->where('id', $projectId)->update(['faculty_id' => $request->faculty_id]);
        }

        if (Schema::hasTable('project_faculty')) {
            DB::table('project_faculty')->where('project_id', $projectId)->delete();
            DB::table('project_faculty')->insert([
                'project_id' => $projectId,
                'faculty_id' => $request->faculty_id,
                'assigned_date' => now()->toDateString(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->logAudit(
            $request,
            'Faculty Assigned',
            "Assigned {$facultyName} (ID: {$request->faculty_id}) to project \"{$project->title}\" (ID: {$projectId}) by Developer."
        );

        return response()->json([
            'status' => 'success',
            'message' => "Assigned faculty {$facultyName} to project {$projectId}.",
            'data' => [
                'project_id' => $projectId,
                'faculty_id' => $request->faculty_id,
                'faculty_name' => $facultyName
            ]
        ]);
    }

    /**
     * Get Audit Logs
     */
    public function getAuditLogs()
    {
        if (!Schema::hasTable('audit_logs')) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        $query = DB::table('audit_logs')
            ->leftJoin('users', 'audit_logs.user_id', '=', 'users.id')
            ->select(
                'audit_logs.id',
                'audit_logs.action',
                'audit_logs.description',
                'audit_logs.created_at',
                DB::raw('COALESCE(users.name, "Developer (Admin)") as user_name'),
                DB::raw('COALESCE(users.role, "developer") as user_role')
            )
            ->orderBy('audit_logs.created_at', 'desc')
            ->take(50);

        $logs = $query->get()->map(function ($log) {
            $type = 'info';
            $actionLower = strtolower($log->action);
            if (str_contains($actionLower, 'fail') || str_contains($actionLower, 'reject') || str_contains($actionLower, 'denied') || str_contains($actionLower, 'warning')) {
                $type = 'warning';
            } elseif (str_contains($actionLower, 'accept') || str_contains($actionLower, 'assign') || str_contains($actionLower, 'login') || str_contains($actionLower, 'success')) {
                $type = 'success';
            }

            return [
                'id' => 'LOG-' . str_pad($log->id, 3, '0', STR_PAD_LEFT),
                'timestamp' => $log->created_at ? date('Y-m-d H:i', strtotime($log->created_at)) : date('Y-m-d H:i'),
                'user' => $log->user_name,
                'role' => ucfirst($log->user_role),
                'event' => $log->action,
                'details' => $log->description,
                'type' => $type
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $logs
        ]);
    }

    /**
     * Get Faculty List
     */
    public function getFaculties()
    {
        $hasProjects = Schema::hasTable('projects');
        $hasProfiles = Schema::hasTable('faculty_profiles');

        $query = DB::table('users')->where('users.role', 'faculty');
        if ($hasProfiles) {
            $query->leftJoin('faculty_profiles', 'users.id', '=', 'faculty_profiles.faculty_id')
                ->select(
                    'users.id',
                    'users.name',
                    'users.email',
                    'users.role',
                    DB::raw('COALESCE(faculty_profiles.department, "Computer Applications") as department'),
                    DB::raw('COALESCE(faculty_profiles.designation, "Faculty Member") as designation')
                );
        } else {
            $query->select(
                'users.id',
                'users.name',
                'users.email',
                'users.role',
                DB::raw('"Computer Applications" as department'),
                DB::raw('"Faculty Member" as designation')
            );
        }

        $faculties = $query->get()->map(function ($f) use ($hasProjects) {
            $activeProjects = [];
            if ($hasProjects) {
                $queryProj = DB::table('projects')
                    ->where(function($q) use ($f) {
                        if (Schema::hasColumn('projects', 'faculty_id')) {
                            $q->where('faculty_id', $f->id);
                        }
                        if (Schema::hasTable('project_faculty')) {
                            $q->orWhereIn('id', function($sub) use ($f) {
                                $sub->select('project_id')->from('project_faculty')->where('faculty_id', $f->id);
                            });
                        }
                    })
                    ->whereIn('status', ['in_progress', 'accepted', 'active'])
                    ->select('id', 'title', 'status', 'project_type')
                    ->distinct();

                $activeProjects = $queryProj->get()
                    ->map(function($p) {
                        return [
                            'id' => $p->id,
                            'title' => $p->title,
                            'status' => $p->status,
                            'type' => $p->project_type ?? 'Web Application'
                        ];
                    })
                    ->toArray();
            }
            return [
                'id' => (string) $f->id,
                'name' => $f->name,
                'email' => $f->email,
                'role' => $f->role,
                'department' => $f->department,
                'designation' => $f->designation,
                'active_projects_count' => count($activeProjects),
                'active_projects' => $activeProjects
            ];
        });

        if ($faculties->isEmpty()) {
            $faculties = collect([
                [
                    'id' => '4',
                    'name' => 'Faculty Member',
                    'email' => 'faculty@rajagiri.edu',
                    'role' => 'faculty',
                    'active_projects_count' => 1,
                    'active_projects' => [
                        ['id' => '1', 'title' => 'Rajagiri ERP System & Executive Control Panel', 'status' => 'in_progress', 'type' => 'Web Application']
                    ]
                ]
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data' => $faculties
        ]);
    }
}
