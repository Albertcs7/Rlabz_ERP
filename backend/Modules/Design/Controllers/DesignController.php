<?php

namespace Modules\Design\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class DesignController extends Controller
{
    /**
     * Helper to log audit actions immutably
     */
    protected function logAudit($ticketId, $userId, $action, $prev = null, $new = null, $reason = null)
    {
        if (Schema::hasTable('design_audit_logs')) {
            DB::table('design_audit_logs')->insert([
                'ticket_id' => $ticketId,
                'user_id' => $userId ?? 17,
                'action' => $action,
                'previous_value' => is_array($prev) ? json_encode($prev) : (string)$prev,
                'new_value' => is_array($new) ? json_encode($new) : (string)$new,
                'reason' => $reason,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }
    }

    /**
     * Helper to trigger notification in shared notifications system
     */
    protected function notifyUser($ticketId, $userId, $event, $title, $message)
    {
        if ($userId && Schema::hasTable('notifications')) {
            $userExists = DB::table('users')->where('id', $userId)->exists();
            if ($userExists) {
                $urgency = 'normal';
                if (stripos($event, 'urgent') !== false || stripos($event, 'revision') !== false || stripos($event, 'rejected') !== false) {
                    $urgency = 'urgent';
                } elseif (stripos($event, 'new') !== false || stripos($event, 'assigned') !== false || stripos($event, 'submitted') !== false) {
                    $urgency = 'high';
                }

                DB::table('notifications')->insert([
                    'user_id' => $userId,
                    'project_id' => null,
                    'type' => 'design',
                    'urgency' => $urgency,
                    'message' => "{$title}: {$message}",
                    'is_read' => 0,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);
            }
        }
    }

    /**
     * @route GET /api/design/dashboard
     * Dashboard KPIs & role-oriented summaries (PDF Module 10)
     */
    public function getDashboard(Request $request)
    {
        $user = $request->attributes->get('auth_user') ?? (object)['id' => 17, 'role' => 'design_head'];
        $role = $user->role ?? 'design_head';
        $userId = $user->id ?? 17;

        $ticketsQuery = DB::table('design_tickets');
        $allTickets = DB::table('design_tickets')->get();

        $openTicketsCount = $allTickets->whereNotIn('status', ['Approved', 'Closed', 'Cancelled'])->count();
        $unassignedCount = $allTickets->whereNull('assigned_to')->whereNotIn('status', ['Closed', 'Cancelled'])->count();
        $inReviewCount = $allTickets->where('status', 'In Review')->count();
        $submittedCount = $allTickets->where('status', 'Submitted')->count();
        $revisionCount = $allTickets->where('status', 'Revision')->count();
        $urgentCount = $allTickets->where('priority', 'urgent')->whereNotIn('status', ['Approved', 'Closed', 'Cancelled'])->count();

        // Overdue count (required_by < now and not approved/closed)
        $overdueCount = $allTickets->filter(function ($t) {
            return !in_array($t->status, ['Approved', 'Closed', 'Cancelled']) && Carbon::parse($t->required_by)->isPast();
        })->count();

        // Role-specific slices:
        // Designer: my open tickets, due today & this week, revision rate
        $myTickets = $allTickets->where('assigned_to', $userId);
        $myOpenTickets = $myTickets->whereNotIn('status', ['Approved', 'Closed', 'Cancelled'])->values();
        $myDueThisWeek = $myTickets->filter(function ($t) {
            return !in_array($t->status, ['Approved', 'Closed']) && Carbon::parse($t->required_by)->isBetween(now(), now()->addDays(7));
        })->values();

        // Requester: status of everything I raised
        $myRaisedTickets = $allTickets->where('requester_id', $userId)->values();

        $stats = [
            'totalTickets' => $allTickets->count(),
            'openTickets' => $openTicketsCount,
            'unassignedQueue' => $unassignedCount,
            'approvalsPending' => $inReviewCount + $submittedCount,
            'revisionsActive' => $revisionCount,
            'urgentPriority' => $urgentCount,
            'overdueCount' => $overdueCount,
            'assetCount' => DB::table('design_assets')->count(),
        ];

        // Recent Activity Stream from Audit Log
        $activities = DB::table('design_audit_logs')
            ->leftJoin('users', 'design_audit_logs.user_id', '=', 'users.id')
            ->leftJoin('design_tickets', 'design_audit_logs.ticket_id', '=', 'design_tickets.id')
            ->select(
                'design_audit_logs.*',
                'users.name as actor_name',
                'design_tickets.ticket_number',
                'design_tickets.title as ticket_title'
            )
            ->orderBy('design_audit_logs.created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'status' => 'success',
            'role' => $role,
            'stats' => $stats,
            'designerWorkload' => [
                'myOpenCount' => $myOpenTickets->count(),
                'myDueThisWeek' => $myDueThisWeek->count(),
                'myTickets' => $myOpenTickets,
            ],
            'requesterOverview' => [
                'myRaisedCount' => $myRaisedTickets->count(),
                'myTickets' => $myRaisedTickets,
            ],
            'activities' => $activities,
        ]);
    }

    /**
     * @route GET /api/design/tickets
     */
    public function getTickets(Request $request)
    {
        $query = DB::table('design_tickets')
            ->leftJoin('users as requesters', 'design_tickets.requester_id', '=', 'requesters.id')
            ->leftJoin('users as designers', 'design_tickets.assigned_to', '=', 'designers.id')
            ->leftJoin('projects', 'design_tickets.project_id', '=', 'projects.id')
            ->leftJoin('design_versions', 'design_tickets.current_version_id', '=', 'design_versions.id')
            ->select(
                'design_tickets.*',
                'projects.title as project_title',
                'requesters.name as requester_name',
                'requesters.email as requester_email',
                'designers.name as assigned_to_name',
                'design_versions.file_url as current_preview_url',
                'design_versions.version_number as current_version_number'
            );

        // Enforce student-level scoping if authenticated user is a student
        $auth = $request->attributes->get('auth_user') ?? $request->get('auth_user');
        $userRole = is_object($auth) ? ($auth->role ?? null) : (is_array($auth) ? ($auth['role'] ?? null) : null);
        $userId = is_object($auth) ? ($auth->id ?? $auth->sub ?? null) : (is_array($auth) ? ($auth['id'] ?? $auth['sub'] ?? null) : null);
        if ($userRole === 'student' && $userId) {
            $query->where('design_tickets.assigned_to', $userId);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('design_tickets.status', $request->status);
        }
        if ($request->has('work_type') && $request->work_type !== 'all') {
            $query->where('design_tickets.work_type', $request->work_type);
        }
        if ($request->has('priority') && $request->priority !== 'all') {
            $query->where('design_tickets.priority', $request->priority);
        }
        if ($request->has('project_id') && $request->project_id !== 'all') {
            $query->where('design_tickets.project_id', $request->project_id);
        }
        if ($request->has('search') && !empty($request->search)) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('design_tickets.ticket_number', 'like', $s)
                  ->orWhere('design_tickets.title', 'like', $s)
                  ->orWhere('design_tickets.final_copy', 'like', $s)
                  ->orWhere('design_tickets.requesting_division', 'like', $s)
                  ->orWhere('projects.title', 'like', $s);
            });
        }

        $tickets = $query->orderBy('design_tickets.created_at', 'desc')->get();

        // Decode JSON fields
        $tickets->transform(function ($item) {
            $item->type_specific_fields = json_decode($item->type_specific_fields ?? '{}', true);
            $item->attachments = json_decode($item->attachments ?? '[]', true);
            $item->collaborators = json_decode($item->collaborators ?? '[]', true);
            return $item;
        });

        return response()->json([
            'status' => 'success',
            'data' => $tickets,
        ]);
    }

    /**
     * @route POST /api/design/tickets
     * PDF Module 3: Request Intake (Dynamic 3-step brief)
     */
    public function createTicket(Request $request)
    {
        $validated = $request->validate([
            'work_type' => 'required|string|in:poster,social_creative,video_motion,presentation,other',
            'title' => 'required|string|max:255',
            'project_id' => 'nullable|exists:projects,id',
            'brand_kit_name' => 'nullable|string|max:150',
            'purpose' => 'nullable|string',
            'requesting_division' => 'required|string|max:100', // Teaching & Academics, Training & Placement, Design & Branding, AI-Ops Division
            'target_audience' => 'nullable|string|max:255',
            'publishing_channel' => 'nullable|string|max:255',
            'required_by' => 'required|date',
            'priority' => 'required|in:normal,high,urgent',
            'final_copy' => 'nullable|string', // copy-pasted directly so searchable
            'reference_links' => 'nullable|string',
            'attachments' => 'nullable|array',
            'brand_constraints' => 'nullable|string',
            'type_specific_fields' => 'nullable|array',
        ]);

        $divisionMap = [
            'teaching' => 'Teaching & Academics',
            'training' => 'Training & Placement',
            'design' => 'Design & Branding',
            'ai_ops' => 'AI-Ops Division',
            'Teaching & Academics' => 'Teaching & Academics',
            'Training & Placement' => 'Training & Placement',
            'Design & Branding' => 'Design & Branding',
            'AI-Ops Division' => 'AI-Ops Division',
        ];
        $standardDivision = $divisionMap[$validated['requesting_division']] ?? $validated['requesting_division'];

        $auth = $request->attributes->get('auth_user');
        $requesterId = $auth->id ?? 3;

        $created = DB::transaction(function () use ($validated, $standardDivision, $requesterId) {
            $year = date('Y');
            $lastTicket = DB::table('design_tickets')
                ->where('ticket_number', 'like', "DSN-{$year}-%")
                ->orderBy('id', 'desc')
                ->lockForUpdate()
                ->first();

            $nextSeq = 1;
            if ($lastTicket) {
                $parts = explode('-', $lastTicket->ticket_number);
                $nextSeq = intval(end($parts)) + 1;
            }
            $ticketNumber = sprintf("DSN-%s-%04d", $year, $nextSeq);

            $now = Carbon::now();
            $ticketId = DB::table('design_tickets')->insertGetId([
                'ticket_number' => $ticketNumber,
                'work_type' => $validated['work_type'],
                'project_id' => $validated['project_id'] ?? null,
                'brand_kit_name' => $validated['brand_kit_name'] ?? 'RLabZ Core Platform',
                'title' => $validated['title'],
                'purpose' => $validated['purpose'] ?? null,
                'requester_id' => $requesterId,
                'requesting_division' => $standardDivision,
                'target_audience' => $validated['target_audience'] ?? null,
                'publishing_channel' => $validated['publishing_channel'] ?? null,
                'required_by' => Carbon::parse($validated['required_by']),
                'committed_delivery_date' => null,
                'priority' => $validated['priority'],
                'final_copy' => $validated['final_copy'] ?? null,
                'reference_links' => $validated['reference_links'] ?? null,
                'attachments' => isset($validated['attachments']) ? json_encode($validated['attachments']) : null,
                'brand_constraints' => $validated['brand_constraints'] ?? null,
                'type_specific_fields' => isset($validated['type_specific_fields']) ? json_encode($validated['type_specific_fields']) : null,
                'status' => 'New',
                'ball_is_with' => 'Design Lead',
                'assigned_to' => null,
                'collaborators' => null,
                'estimated_hours' => 0,
                'actual_hours_logged' => 0,
                'revision_count' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Immutable Audit Log entry
            $this->logAudit($ticketId, $requesterId, 'created', null, 'New', 'Request submitted via 3-step intake brief');

            return ['id' => $ticketId, 'number' => $ticketNumber];
        });

        // Notify Design Heads awaiting allocation
        $designHeads = DB::table('users')->where('role', 'design_head')->pluck('id');
        if ($designHeads->isEmpty()) {
            $designHeads = collect([17]);
        }
        foreach ($designHeads as $dhId) {
            $this->notifyUser(
                $created['id'],
                $dhId,
                'New request awaiting allocation',
                "New Brief: {$created['number']}",
                "{$validated['title']} submitted by division {$validated['requesting_division']}. Awaiting assignment."
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => "Ticket {$created['number']} created successfully.",
            'ticket_id' => $created['id'],
            'ticket_number' => $created['number'],
        ], 201);
    }

    /**
     * @route GET /api/design/tickets/{id}
     * Get ticket details with versions, comments, and audit timeline
     */
    public function getTicketDetail(Request $request, $id)
    {
        $ticket = DB::table('design_tickets')
            ->leftJoin('users as requesters', 'design_tickets.requester_id', '=', 'requesters.id')
            ->leftJoin('users as designers', 'design_tickets.assigned_to', '=', 'designers.id')
            ->leftJoin('projects', 'design_tickets.project_id', '=', 'projects.id')
            ->where(function($q) use ($id) {
                $q->where('design_tickets.id', $id)->orWhere('design_tickets.ticket_number', $id);
            })
            ->select(
                'design_tickets.*',
                'projects.title as project_title',
                'projects.client_name as project_client_name',
                'requesters.name as requester_name',
                'requesters.email as requester_email',
                'designers.name as assigned_to_name',
                'designers.email as assigned_to_email'
            )
            ->first();

        if (!$ticket) {
            return response()->json(['status' => 'error', 'message' => 'Ticket not found'], 404);
        }

        // Enforce role-based access: Students can only view tickets assigned to them
        $auth = $request->attributes->get('auth_user');
        if ($auth && $auth->role === 'student') {
            if ($ticket->assigned_to != $auth->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized ticket access. You are only permitted to view tickets assigned to your account.'
                ], 403);
            }
        }

        $ticket->type_specific_fields = json_decode($ticket->type_specific_fields ?? '{}', true);
        $ticket->attachments = json_decode($ticket->attachments ?? '[]', true);
        $ticket->collaborators = json_decode($ticket->collaborators ?? '[]', true);

        $ticketId = $ticket->id;

        // Fetch sequential versions (V1, V2, V3)
        $versions = DB::table('design_versions')
            ->leftJoin('users', 'design_versions.uploader_id', '=', 'users.id')
            ->where('ticket_id', $ticketId)
            ->select('design_versions.*', 'users.name as uploader_name')
            ->orderBy('version_number', 'asc')
            ->get();

        // Fetch threaded comments grouped or ordered
        $comments = DB::table('design_comments')
            ->leftJoin('users', 'design_comments.user_id', '=', 'users.id')
            ->leftJoin('users as resolvers', 'design_comments.resolved_by', '=', 'resolvers.id')
            ->where('ticket_id', $ticketId)
            ->select('design_comments.*', 'users.name as author_name', 'resolvers.name as resolver_name')
            ->orderBy('created_at', 'asc')
            ->get();

        // Fetch brand kit guidelines if applicable
        $brandKit = null;
        if (Schema::hasTable('design_brand_kits') && !empty($ticket->brand_kit_name)) {
            $brandKit = DB::table('design_brand_kits')
                ->where('name', $ticket->brand_kit_name)
                ->orWhere('name', 'like', "%{$ticket->brand_kit_name}%")
                ->orWhere('slug', $ticket->brand_kit_name)
                ->first();
            if ($brandKit) {
                $rawColors = $brandKit->brand_colors ?? ($brandKit->color_palette ?? null);
                $rawType = $brandKit->typography ?? ($brandKit->typography_rules ?? null);
                $rawLogos = $brandKit->downloadable_kits ?? ($brandKit->logo_assets ?? null);

                $brandKit->color_palette = is_string($rawColors) ? json_decode($rawColors, true) : ($rawColors ?: []);
                $brandKit->typography_rules = is_string($rawType) ? json_decode($rawType, true) : ($rawType ?: []);
                $brandKit->logo_assets = is_string($rawLogos) ? json_decode($rawLogos, true) : ($rawLogos ?: []);
            }
        }

        // Fetch ticket chronological audit strip (PDF Module 11)
        $auditLogs = DB::table('design_audit_logs')
            ->leftJoin('users', 'design_audit_logs.user_id', '=', 'users.id')
            ->where('ticket_id', $ticketId)
            ->select('design_audit_logs.*', 'users.name as actor_name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'ticket' => $ticket,
            'versions' => $versions,
            'comments' => $comments,
            'auditLogs' => $auditLogs,
            'brand_kit' => $brandKit,
            'brandKit' => $brandKit,
        ]);
    }

    /**
     * @route POST /api/design/tickets/{id}/assign
     * PDF Module 4: Assignment & Scheduling (Workload-aware allocation, committed date distinct from requested date)
     */
    public function assignTicket(Request $request, $id)
    {
        $auth = $request->attributes->get('auth_user');
        if ($auth && $auth->role === 'student') {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden: Students cannot assign or reassign creative tickets.'
            ], 403);
        }

        $validated = $request->validate([
            'assigned_to' => 'required|exists:users,id',
            'committed_delivery_date' => 'required|date',
            'estimated_hours' => 'nullable|numeric|min:0.5',
            'collaborators' => 'nullable|array',
            'reason' => 'nullable|string', // mandatory on reassignment
        ]);

        $ticket = DB::table('design_tickets')->where('id', $id)->first();
        if (!$ticket) {
            return response()->json(['status' => 'error', 'message' => 'Ticket not found'], 404);
        }

        // Prevent assignment to inactive designers (PDF Module 1 & 4)
        $assigneeProfile = DB::table('design_user_profiles')->where('user_id', $validated['assigned_to'])->first();
        if ($assigneeProfile && !$assigneeProfile->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot assign ticket to an inactive designer. Please activate their profile or select an active designer.',
            ], 422);
        }

        $auth = $request->attributes->get('auth_user');
        $actorId = $auth->id ?? 17;

        $isReassignment = !empty($ticket->assigned_to) && $ticket->assigned_to != $validated['assigned_to'];
        if ($isReassignment && empty($validated['reason'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Reassignment requires a mandatory reason recorded in the audit log.',
            ], 422);
        }

        $prevDesignerId = $ticket->assigned_to;
        $prevDesigner = $prevDesignerId ? DB::table('users')->where('id', $prevDesignerId)->value('name') : 'Unassigned';
        $newDesigner = DB::table('users')->where('id', $validated['assigned_to'])->value('name');
        $oldCommitted = $ticket->committed_delivery_date;
        $newCommitted = Carbon::parse($validated['committed_delivery_date'])->format('Y-m-d');
        $deadlineChanged = !empty($oldCommitted) && Carbon::parse($oldCommitted)->format('Y-m-d') !== $newCommitted;

        DB::transaction(function () use ($id, $validated, $ticket, $isReassignment, $prevDesigner, $newDesigner, $actorId) {
            DB::table('design_tickets')->where('id', $id)->update([
                'assigned_to' => $validated['assigned_to'],
                'committed_delivery_date' => Carbon::parse($validated['committed_delivery_date']),
                'estimated_hours' => $validated['estimated_hours'] ?? $ticket->estimated_hours,
                'collaborators' => isset($validated['collaborators']) ? json_encode($validated['collaborators']) : $ticket->collaborators,
                'status' => ($ticket->status === 'New') ? 'Assigned' : $ticket->status,
                'ball_is_with' => 'Designer',
                'updated_at' => Carbon::now(),
            ]);

            $auditAction = $isReassignment ? 'reassigned' : 'assigned';
            $reason = $validated['reason'] ?? ($isReassignment ? 'Lead reassigned ticket' : 'Initial workload allocation');
            $this->logAudit($id, $actorId, $auditAction, $prevDesigner, $newDesigner, $reason);
        });

        // 1. Notify newly assigned Designer
        $this->notifyUser(
            $id,
            $validated['assigned_to'],
            $isReassignment ? 'Ticket reassigned to you' : 'New ticket assigned to you',
            $isReassignment ? "Reassigned: {$ticket->ticket_number}" : "Assigned: {$ticket->ticket_number}",
            "You are assigned to '{$ticket->title}'. Committed delivery date: {$validated['committed_delivery_date']}."
        );

        // 2. Notify Requester
        if ($ticket->requester_id) {
            $this->notifyUser(
                $id,
                $ticket->requester_id,
                'Ticket assigned to designer',
                "Assigned: {$ticket->ticket_number}",
                "Your request '{$ticket->title}' has been assigned to {$newDesigner} with committed delivery by {$validated['committed_delivery_date']}."
            );
        }

        // 3. If reassignment, notify previously assigned designer
        if ($isReassignment && $prevDesignerId && $prevDesignerId != $validated['assigned_to']) {
            $this->notifyUser(
                $id,
                $prevDesignerId,
                'Ticket reassigned',
                "Reassigned: {$ticket->ticket_number}",
                "Ticket '{$ticket->title}' was reassigned to {$newDesigner}. Reason: " . ($validated['reason'] ?? 'Workload rebalance')
            );
        }

        // 4. If committed deadline was modified, notify both
        if ($deadlineChanged) {
            $this->notifyUser(
                $id,
                $validated['assigned_to'],
                'Committed deadline changed',
                "Deadline Updated: {$ticket->ticket_number}",
                "Committed delivery date set to {$validated['committed_delivery_date']}."
            );
            if ($ticket->requester_id) {
                $this->notifyUser(
                    $id,
                    $ticket->requester_id,
                    'Committed deadline changed',
                    "Deadline Updated: {$ticket->ticket_number}",
                    "Committed delivery date set to {$validated['committed_delivery_date']}."
                );
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Ticket {$ticket->ticket_number} assigned to {$newDesigner}.",
        ]);
    }

    /**
     * @route PATCH /api/design/tickets/{id}/status
     * Lifecycle status transitions (On Hold, Cancelled, In Progress, etc.)
     */
    public function updateTicketStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:New,Assigned,In Progress,Submitted,In Review,Revision,Approved,Closed,On Hold,Cancelled',
            'reason' => 'nullable|string',
            'actual_hours' => 'nullable|numeric',
        ]);

        $ticket = DB::table('design_tickets')->where('id', $id)->first();
        if (!$ticket) {
            return response()->json(['status' => 'error', 'message' => 'Ticket not found'], 404);
        }

        // On Hold and Cancelled require a stated reason (PDF Module 4/5)
        if (in_array($validated['status'], ['On Hold', 'Cancelled']) && empty($validated['reason'])) {
            return response()->json([
                'status' => 'error',
                'message' => "A stated reason is mandatory when placing a ticket {$validated['status']}.",
            ], 422);
        }

        $ballMap = [
            'New' => 'Design Lead',
            'Assigned' => 'Designer',
            'In Progress' => 'Designer',
            'Submitted' => 'Requester',
            'In Review' => 'Requester',
            'Revision' => 'Designer',
            'Approved' => 'Design Lead',
            'Closed' => '-',
            'On Hold' => 'Design Lead',
            'Cancelled' => '-',
        ];

        $updateData = [
            'status' => $validated['status'],
            'ball_is_with' => $ballMap[$validated['status']] ?? 'Designer',
            'updated_at' => Carbon::now(),
        ];

        if ($validated['status'] === 'On Hold') {
            $updateData['on_hold_reason'] = $validated['reason'];
        }
        if ($validated['status'] === 'Cancelled') {
            $updateData['cancellation_reason'] = $validated['reason'];
        }
        if (isset($validated['actual_hours'])) {
            $updateData['actual_hours_logged'] = $validated['actual_hours'];
        }

        $auth = $request->attributes->get('auth_user');
        $actorId = $auth->id ?? 17;
        $oldStatus = $ticket->status;
        $newStatus = $validated['status'];

        DB::transaction(function () use ($id, $ticket, $updateData, $validated, $actorId, $oldStatus, $newStatus) {
            // Auto-archive to Asset Library if moving to Closed
            if ($validated['status'] === 'Closed' && $ticket->status !== 'Closed') {
                $this->archiveTicketToAssets($ticket);
            }

            DB::table('design_tickets')->where('id', $id)->update($updateData);

            $this->logAudit($id, $actorId, 'status_change', $oldStatus, $newStatus, $validated['reason'] ?? null);
        });

        // Notify Designer & Requester of status transition
        $statusMsg = "Ticket {$ticket->ticket_number} moved from {$oldStatus} to {$newStatus}." . (!empty($validated['reason']) ? " Reason: {$validated['reason']}" : "");
        if ($ticket->assigned_to && $ticket->assigned_to != $actorId) {
            $this->notifyUser($id, $ticket->assigned_to, 'Status changed to ' . $newStatus, "Status Update: {$ticket->ticket_number}", $statusMsg);
        }
        if ($ticket->requester_id && $ticket->requester_id != $actorId) {
            $this->notifyUser($id, $ticket->requester_id, 'Status changed to ' . $newStatus, "Status Update: {$ticket->ticket_number}", $statusMsg);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Ticket {$ticket->ticket_number} status updated to {$validated['status']}.",
        ]);
    }

    /**
     * @route POST /api/design/tickets/{id}/versions
     * PDF Module 6: Sequential versions under single ticket (V1, V2, V3)
     */
    public function uploadVersion(Request $request, $id)
    {
        $ticket = DB::table('design_tickets')->where('id', $id)->first();
        if (!$ticket) {
            return response()->json(['status' => 'error', 'message' => 'Ticket not found'], 404);
        }

        $auth = $request->attributes->get('auth_user');

        // Check if student is assigned to this ticket
        if ($auth && $auth->role === 'student') {
            if ($ticket->assigned_to != $auth->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Forbidden: You are only authorized to upload deliverables for tickets assigned to you.'
                ], 403);
            }
        }

        // Check ticket status
        if (in_array($ticket->status, ['Approved', 'Closed', 'Cancelled'])) {
            return response()->json([
                'status' => 'error',
                'message' => "Cannot upload versions to a ticket marked as {$ticket->status}."
            ], 403);
        }

        $changeNotes = $request->input('change_notes') ?? $request->input('change_summary');
        if (empty($changeNotes) || !is_string($changeNotes)) {
            return response()->json(['status' => 'error', 'message' => 'Change notes describing what was updated are required.'], 422);
        }

        $fileUrl = $request->input('file_url');
        $fileName = $request->input('file_name');
        $fileType = $request->input('file_type', 'image');
        $fileSizeKb = 0;

        if ($request->hasFile('file')) {
            $request->validate([
                'file' => 'required|file|max:51200|mimes:png,jpg,jpeg,webp,svg,pdf,mp4,webm,zip,tar,gz',
            ]);
            $uploaded = $request->file('file');
            $fileName = $uploaded->getClientOriginalName();
            $fileSizeKb = (int)ceil($uploaded->getSize() / 1024);
            $mime = $uploaded->getMimeType();
            if (str_starts_with($mime, 'image/')) $fileType = 'image';
            elseif (str_starts_with($mime, 'video/')) $fileType = 'video';
            elseif ($mime === 'application/pdf') $fileType = 'pdf';
            else $fileType = 'archive';

            $path = $uploaded->store('design_deliverables', 'public');
            $fileUrl = Storage::disk('public')->url($path);
        } elseif (!empty($fileUrl)) {
            if (!filter_var($fileUrl, FILTER_VALIDATE_URL) && !str_starts_with($fileUrl, '/')) {
                return response()->json(['status' => 'error', 'message' => 'A valid deliverable file or URL is required.'], 422);
            }
            if (empty($fileName)) $fileName = 'Deliverable_URL';
        } else {
            return response()->json(['status' => 'error', 'message' => 'Please select a deliverable file or enter a valid URL.'], 422);
        }

        $uploaderId = $auth->id ?? ($ticket->assigned_to ?? 6);

        $res = DB::transaction(function () use ($id, $uploaderId, $fileUrl, $fileName, $fileType, $fileSizeKb, $changeNotes) {
            // Determine next sequential version number
            $lastVersion = DB::table('design_versions')->where('ticket_id', $id)->lockForUpdate()->max('version_number');
            $versionNum = ($lastVersion ?? 0) + 1;

            // Reset previous is_current flags
            DB::table('design_versions')->where('ticket_id', $id)->update(['is_current' => false]);

            $now = Carbon::now();
            $versionId = DB::table('design_versions')->insertGetId([
                'ticket_id' => $id,
                'version_number' => $versionNum,
                'uploader_id' => $uploaderId,
                'file_url' => $fileUrl,
                'file_name' => $fileName ?? "Deliverable_V{$versionNum}",
                'file_type' => $fileType,
                'file_size_kb' => $fileSizeKb ?: 1024,
                'change_notes' => $changeNotes,
                'is_current' => true,
                'is_approved' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Transition ticket to 'Submitted' and set ball to Design Lead
            DB::table('design_tickets')->where('id', $id)->update([
                'current_version_id' => $versionId,
                'status' => 'Submitted',
                'ball_is_with' => 'Design Lead',
                'updated_at' => $now,
            ]);

            $this->logAudit($id, $uploaderId, 'version_upload', "V" . ($versionNum - 1), "V{$versionNum}", $changeNotes);

            return ['version_id' => $versionId, 'version_number' => $versionNum];
        });

        $versionNum = $res['version_number'];

        // Notify Requester that version is ready for review
        if ($ticket->requester_id) {
            $this->notifyUser(
                $id,
                $ticket->requester_id,
                'Version submitted, approval pending',
                "V{$versionNum} Ready for Review: {$ticket->ticket_number}",
                "A new version V{$versionNum} has been uploaded for '{$ticket->title}'. Please review and approve or request revisions."
            );
        }

        // Notify Design Heads
        $designHeads = DB::table('users')->where('role', 'design_head')->pluck('id');
        foreach ($designHeads as $dhId) {
            if ($dhId != $uploaderId) {
                $this->notifyUser(
                    $id,
                    $dhId,
                    'Version submitted',
                    "V{$versionNum} Submitted: {$ticket->ticket_number}",
                    "Version V{$versionNum} uploaded for '{$ticket->title}'."
                );
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Version V{$versionNum} uploaded successfully.",
            'version_id' => $res['version_id'],
            'version_number' => $versionNum,
        ], 201);
    }

    /**
     * @route POST /api/design/tickets/{id}/comments
     * Threaded comments attached to specific version (PDF Module 6)
     */
    public function addComment(Request $request, $id)
    {
        $validated = $request->validate([
            'version_id' => 'required|exists:design_versions,id',
            'comment' => 'required|string',
            'parent_id' => 'nullable|exists:design_comments,id',
        ]);

        $ticket = DB::table('design_tickets')->where('id', $id)->first();
        $auth = $request->attributes->get('auth_user');
        $userId = $auth->id ?? 17;

        $commentId = DB::table('design_comments')->insertGetId([
            'ticket_id' => $id,
            'version_id' => $validated['version_id'],
            'user_id' => $userId,
            'parent_id' => $validated['parent_id'] ?? null,
            'comment' => $validated['comment'],
            'status' => 'open',
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        // If ticket was in Submitted state, comment moves it to In Review
        DB::table('design_tickets')->where('id', $id)->where('status', 'Submitted')->update([
            'status' => 'In Review',
            'ball_is_with' => 'Requester',
        ]);

        // Notify opposite party of new comment feedback
        if ($ticket) {
            if ($ticket->assigned_to && $ticket->assigned_to != $userId) {
                $this->notifyUser($id, $ticket->assigned_to, 'New feedback comment', "Feedback: {$ticket->ticket_number}", "New feedback comment: \"{$validated['comment']}\"");
            }
            if ($ticket->requester_id && $ticket->requester_id != $userId) {
                $this->notifyUser($id, $ticket->requester_id, 'New feedback comment', "Feedback: {$ticket->ticket_number}", "New comment: \"{$validated['comment']}\"");
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Comment added to version thread.',
            'comment_id' => $commentId,
        ], 201);
    }

    /**
     * @route PATCH /api/design/comments/{id}/resolve
     * Comment status open / resolved (PDF Module 6)
     */
    public function resolveComment(Request $request, $id)
    {
        $auth = $request->attributes->get('auth_user');
        $userId = $auth->id ?? 17;

        $comment = DB::table('design_comments')->where('id', $id)->first();
        if (!$comment) {
            return response()->json(['status' => 'error', 'message' => 'Comment not found'], 404);
        }

        $newStatus = ($comment->status === 'resolved') ? 'open' : 'resolved';
        DB::table('design_comments')->where('id', $id)->update([
            'status' => $newStatus,
            'resolved_by' => ($newStatus === 'resolved') ? $userId : null,
            'resolved_at' => ($newStatus === 'resolved') ? Carbon::now() : null,
            'updated_at' => Carbon::now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Comment marked as {$newStatus}.",
            'current_status' => $newStatus,
        ]);
    }

    /**
     * @route POST /api/design/tickets/{id}/approve
     * PDF Module 7: Approval & Sign-off (Requester approves -> packages delivery formats)
     */
    public function approveDeliverable(Request $request, $id)
    {
        $ticket = DB::table('design_tickets')->where('id', $id)->first();
        if (!$ticket) {
            return response()->json(['status' => 'error', 'message' => 'Ticket not found'], 404);
        }

        $auth = $request->attributes->get('auth_user');
        if ($auth && $auth->role === 'student') {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden: Students cannot approve or reject creative deliverables.'
            ], 403);
        }
        $userId = $auth->id ?? $ticket->requester_id;

        // Policy: Designers cannot approve their own work (PDF Module 7 constraint)
        if ($ticket->assigned_to && $ticket->assigned_to == $userId) {
            return response()->json([
                'status' => 'error',
                'message' => 'Policy constraint: Designers cannot approve their own work. Approval must be provided by the requester or another authorized reviewer.',
            ], 403);
        }

        $now = Carbon::now();

        DB::transaction(function () use ($id, $ticket, $userId, $now) {
            // Mark current version approved
            if ($ticket->current_version_id) {
                DB::table('design_versions')->where('id', $ticket->current_version_id)->update(['is_approved' => true]);
            }

            DB::table('design_tickets')->where('id', $id)->update([
                'status' => 'Approved',
                'ball_is_with' => 'Design Lead',
                'approved_by' => $userId,
                'approved_at' => $now,
                'updated_at' => $now,
            ]);

            $this->logAudit($id, $userId, 'approved', $ticket->status, 'Approved', 'Deliverable signed off by requester');

            // Auto-archive to Asset Library (PDF Module 8: "Auto-archive on approval, with no manual upload step")
            $this->archiveTicketToAssets($ticket);
        });

        // Notify Designer and Requester
        if ($ticket->assigned_to) {
            $this->notifyUser(
                $id,
                $ticket->assigned_to,
                'Ticket approved and closed',
                "Approved: {$ticket->ticket_number}",
                "Your design for '{$ticket->title}' has been signed off! Packaging formats ready."
            );
        }
        if ($ticket->requester_id && $ticket->requester_id != $userId) {
            $this->notifyUser(
                $id,
                $ticket->requester_id,
                'Ticket approved and closed',
                "Approved: {$ticket->ticket_number}",
                "Deliverable for '{$ticket->title}' was approved."
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => "Ticket {$ticket->ticket_number} successfully signed off and auto-archived to Asset Library.",
        ]);
    }

    /**
     * @route POST /api/design/tickets/{id}/reject
     * PDF Module 7: Rejection requires written reasons, which automatically open a new revision round
     */
    public function rejectDeliverable(Request $request, $id)
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|min:5',
        ]);

        $ticket = DB::table('design_tickets')->where('id', $id)->first();
        if (!$ticket) {
            return response()->json(['status' => 'error', 'message' => 'Ticket not found'], 404);
        }

        $auth = $request->attributes->get('auth_user');
        if ($auth && $auth->role === 'student') {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden: Students cannot approve or reject creative deliverables.'
            ], 403);
        }
        $userId = $auth->id ?? $ticket->requester_id;
        $now = Carbon::now();

        $newRevisionCount = ($ticket->revision_count ?? 0) + 1;

        DB::transaction(function () use ($id, $ticket, $userId, $now, $newRevisionCount, $validated) {
            DB::table('design_tickets')->where('id', $id)->update([
                'status' => 'Revision',
                'ball_is_with' => 'Designer',
                'revision_count' => $newRevisionCount,
                'updated_at' => $now,
            ]);

            $this->logAudit($id, $userId, 'rejected', $ticket->status, 'Revision', $validated['rejection_reason']);

            // Create comment thread entry explaining rejection
            if ($ticket->current_version_id) {
                DB::table('design_comments')->insert([
                    'ticket_id' => $id,
                    'version_id' => $ticket->current_version_id,
                    'user_id' => $userId,
                    'comment' => "REVISION REQUESTED: " . $validated['rejection_reason'],
                    'status' => 'open',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        });

        // Notify Designer (PDF Module 9)
        if ($ticket->assigned_to) {
            $this->notifyUser(
                $id,
                $ticket->assigned_to,
                'Revision requested',
                "Changes Requested: {$ticket->ticket_number} (Round {$newRevisionCount})",
                $validated['rejection_reason']
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => "Revision round {$newRevisionCount} opened with requested feedback.",
        ]);
    }

    /**
     * Helper to auto-archive approved deliverable to Asset Library (PDF Module 8)
     */
    protected function archiveTicketToAssets($ticket)
    {
        $existing = DB::table('design_assets')->where('source_ticket_id', $ticket->id)->first();
        if ($existing) {
            return $existing->id;
        }

        $version = DB::table('design_versions')->where('id', $ticket->current_version_id)->first();
        $previewUrl = $version ? $version->file_url : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';

        $now = Carbon::now();
        return DB::table('design_assets')->insertGetId([
            'title' => $ticket->title,
            'project_id' => $ticket->project_id ?? null,
            'brand_kit_name' => $ticket->brand_kit_name ?? 'RLabZ Core Platform',
            'campaign' => $ticket->requesting_division . ' Initiative',
            'division' => $ticket->requesting_division,
            'work_type' => $ticket->work_type,
            'source_ticket_id' => $ticket->id,
            'designer_id' => $ticket->assigned_to,
            'preview_url' => $previewUrl,
            'deliverable_url' => $previewUrl,
            'source_file_url' => $previewUrl,
            'packaged_formats' => json_encode([
                'print_pdf' => "{$ticket->ticket_number}_print.pdf",
                'web_png' => "{$ticket->ticket_number}_web.png",
                'source_figma_psd' => "{$ticket->ticket_number}_source.zip",
            ]),
            'tags' => json_encode([$ticket->work_type, $ticket->requesting_division, 'Archived']),
            'usage_count' => 1,
            'metadata' => json_encode([
                'ticket_number' => $ticket->ticket_number,
                'project_id' => $ticket->project_id,
                'brand_kit_name' => $ticket->brand_kit_name ?? 'RLabZ Core Platform',
                'approved_by' => $ticket->approved_by,
                'type_specific' => json_decode($ticket->type_specific_fields ?? '{}', true),
            ]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * @route GET /api/design/assets
     * PDF Module 8: Asset Library (Searchable archive, stops repeat work)
     */
    public function getAssets(Request $request)
    {
        $query = DB::table('design_assets')
            ->leftJoin('users as designers', 'design_assets.designer_id', '=', 'designers.id')
            ->leftJoin('projects', 'design_assets.project_id', '=', 'projects.id')
            ->select('design_assets.*', 'designers.name as designer_name', 'projects.title as project_title');

        if ($request->has('project_id') && $request->project_id !== 'all') {
            $query->where('design_assets.project_id', $request->project_id);
        }
        if ($request->has('work_type') && $request->work_type !== 'all') {
            $query->where('design_assets.work_type', $request->work_type);
        }
        if ($request->has('division') && $request->division !== 'all') {
            $query->where('design_assets.division', $request->division);
        }
        if ($request->has('search') && !empty($request->search)) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('design_assets.title', 'like', $s)
                  ->orWhere('design_assets.campaign', 'like', $s)
                  ->orWhere('design_assets.tags', 'like', $s)
                  ->orWhere('design_assets.brand_kit_name', 'like', $s)
                  ->orWhere('projects.title', 'like', $s);
            });
        }

        $assets = $query->orderBy('created_at', 'desc')->get();

        $assets->transform(function ($item) {
            $item->tags = json_decode($item->tags ?? '[]', true);
            $item->packaged_formats = json_decode($item->packaged_formats ?? '{}', true);
            $item->metadata = json_decode($item->metadata ?? '{}', true);
            return $item;
        });

        return response()->json([
            'status' => 'success',
            'data' => $assets,
        ]);
    }

    /**
     * @route POST /api/design/assets/{id}/clone
     * PDF Module 8: "Clone-to-new-request action, pre-fills a fresh brief from existing asset"
     */
    public function cloneAssetToRequest(Request $request, $id)
    {
        $asset = DB::table('design_assets')->where('id', $id)->first();
        if (!$asset) {
            return response()->json(['status' => 'error', 'message' => 'Asset not found'], 404);
        }

        // Increment usage counter (PDF Module 8: "Usage counter showing how often an asset has been reused or cloned")
        DB::table('design_assets')->where('id', $id)->increment('usage_count');

        $clonedBrief = [
            'work_type' => $asset->work_type,
            'title' => "Clone of " . $asset->title,
            'purpose' => "Reusing creative foundations from {$asset->title} ({$asset->campaign})",
            'requesting_division' => $asset->division ?? 'design',
            'project_id' => $asset->project_id,
            'brand_kit_name' => $asset->brand_kit_name ?? 'RLabZ Core Platform',
            'priority' => 'normal',
            'brand_constraints' => 'Maintain consistent branding with prior asset ID #' . $asset->id,
            'reference_links' => $asset->deliverable_url ?? $asset->preview_url,
            'type_specific_fields' => json_decode($asset->metadata ?? '{}', true)['type_specific'] ?? [],
        ];

        return response()->json([
            'status' => 'success',
            'message' => "Asset #{$id} cloned. Usage counter incremented to " . ($asset->usage_count + 1) . ".",
            'clonedBrief' => $clonedBrief,
        ]);
    }

    /**
     * @route GET /api/design/team-capacity
     * PDF Module 4: Per-designer load panel (open tickets, hours committed this week, next free slot, skill tags)
     */
    public function getTeamCapacity()
    {
        // Get all active design team members (design_user_profiles) + design_head
        $profiles = DB::table('design_user_profiles')->get()->keyBy('user_id');
        $profileUserIds = $profiles->where('is_active', 1)->pluck('user_id')->toArray();

        $users = DB::table('users')
            ->whereIn('id', $profileUserIds)
            ->orWhere('role', 'design_head')
            ->select('id', 'name', 'email', 'role', 'avatar')
            ->get();

        $now = Carbon::now();
        $startOfWeek = $now->copy()->startOfWeek();
        $endOfWeek = $now->copy()->endOfWeek();

        $capacityReport = $users->map(function ($u) use ($profiles, $startOfWeek, $endOfWeek) {
            $prof = $profiles->get($u->id);
            $weeklyCap = $prof ? $prof->weekly_capacity_hours : ($u->role === 'design_head' ? 30 : 20);
            $skills = $prof ? json_decode($prof->skill_tags ?? '[]', true) : ['UI', 'General Design'];

            // Fetch open tickets
            $openTickets = DB::table('design_tickets')
                ->where('assigned_to', $u->id)
                ->whereNotIn('status', ['Approved', 'Closed', 'Cancelled'])
                ->get();

            // Calculate hours committed this week
            $hoursCommitted = $openTickets->sum('estimated_hours');
            $utilizationPct = $weeklyCap > 0 ? round(($hoursCommitted / $weeklyCap) * 100) : 0;

            // Determine next free slot
            $latestDue = $openTickets->max('committed_delivery_date');
            $nextFreeSlot = $latestDue ? Carbon::parse($latestDue)->addHours(4)->format('M d, H:i') : 'Immediate Availability';

            return [
                'user_id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'avatar' => $u->avatar,
                'skill_tags' => $skills,
                'weekly_capacity_hours' => $weeklyCap,
                'hours_committed_this_week' => $hoursCommitted,
                'open_tickets_count' => $openTickets->count(),
                'utilization_percentage' => $utilizationPct,
                'next_free_slot' => $nextFreeSlot,
                'is_active' => $prof ? (bool)$prof->is_active : true,
            ];
        });

        // Queue of unassigned requests, sortable by required-by date and priority (PDF Module 4)
        $unassignedQueue = DB::table('design_tickets')
            ->leftJoin('users', 'design_tickets.requester_id', '=', 'users.id')
            ->whereNull('assigned_to')
            ->whereNotIn('status', ['Closed', 'Cancelled'])
            ->select('design_tickets.*', 'users.name as requester_name')
            ->orderBy('required_by', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'team' => $capacityReport,
            'unassignedQueue' => $unassignedQueue,
        ]);
    }

    /**
     * @route GET /api/design/schedule/calendar
     * PDF Module 4: Dynamic rolling calendar view of the division's committed deliveries
     */
    public function getFortnightCalendar(Request $request)
    {
        $startParam = $request->query('start_date');
        $startDate = $startParam ? Carbon::parse($startParam)->startOfDay() : Carbon::now()->startOfDay();
        $days = (int)($request->query('days', 14));
        if ($days <= 0 || $days > 31) {
            $days = 14;
        }
        $endDate = (clone $startDate)->addDays($days - 1)->endOfDay();

        $deliveries = DB::table('design_tickets')
            ->leftJoin('users as designers', 'design_tickets.assigned_to', '=', 'designers.id')
            ->leftJoin('users as requesters', 'design_tickets.requester_id', '=', 'requesters.id')
            ->whereBetween('committed_delivery_date', [$startDate, $endDate])
            ->whereNotIn('status', ['Cancelled'])
            ->select(
                'design_tickets.id',
                'design_tickets.ticket_number',
                'design_tickets.title',
                'design_tickets.work_type',
                'design_tickets.status',
                'design_tickets.priority',
                'design_tickets.committed_delivery_date',
                'design_tickets.required_by',
                'design_tickets.brand_kit_name',
                'designers.name as assigned_to_name',
                'requesters.name as requester_name'
            )
            ->orderBy('committed_delivery_date', 'asc')
            ->get();

        // Overdue tickets (committed date passed or required-by passed without approval/closure)
        $now = Carbon::now();
        $overdueTickets = DB::table('design_tickets')
            ->leftJoin('users as designers', 'design_tickets.assigned_to', '=', 'designers.id')
            ->whereNotIn('status', ['Approved', 'Closed', 'Cancelled'])
            ->where(function ($q) use ($now) {
                $q->where(function ($sub) use ($now) {
                    $sub->whereNotNull('committed_delivery_date')
                        ->where('committed_delivery_date', '<', $now);
                })->orWhere(function ($sub) use ($now) {
                    $sub->whereNull('committed_delivery_date')
                        ->where('required_by', '<', $now);
                });
            })
            ->select(
                'design_tickets.id',
                'design_tickets.ticket_number',
                'design_tickets.title',
                'design_tickets.work_type',
                'design_tickets.status',
                'design_tickets.priority',
                'design_tickets.committed_delivery_date',
                'design_tickets.required_by',
                'designers.name as assigned_to_name'
            )
            ->get();

        // Uncommitted active tickets
        $uncommittedTickets = DB::table('design_tickets')
            ->leftJoin('users as designers', 'design_tickets.assigned_to', '=', 'designers.id')
            ->whereNull('committed_delivery_date')
            ->whereNotIn('status', ['Approved', 'Closed', 'Cancelled'])
            ->select(
                'design_tickets.id',
                'design_tickets.ticket_number',
                'design_tickets.title',
                'design_tickets.work_type',
                'design_tickets.status',
                'design_tickets.priority',
                'design_tickets.required_by',
                'designers.name as assigned_to_name'
            )
            ->get();

        return response()->json([
            'status' => 'success',
            'startDate' => $startDate->toDateString(),
            'endDate' => $endDate->toDateString(),
            'days' => $days,
            'fortnightDeliveries' => $deliveries,
            'overdueTickets' => $overdueTickets,
            'uncommittedTickets' => $uncommittedTickets,
        ]);
    }

    /**
     * @route GET /api/design/reports
     * PDF Module 10: Reports worth having from day one (Turnaround, on-time %, revision rates, capacity utilization)
     */
    public function getReports()
    {
        $tickets = DB::table('design_tickets')->get();

        // 1. Volume by division & work type per month
        $byDivision = $tickets->groupBy('requesting_division')->map->count();
        $byWorkType = $tickets->groupBy('work_type')->map->count();

        // 2. On-time delivery percentage against committed dates
        $closedOrApproved = $tickets->whereIn('status', ['Approved', 'Closed']);
        $onTimeCount = $closedOrApproved->filter(function ($t) {
            if (!$t->committed_delivery_date) return true;
            $approvedAt = $t->approved_at ? Carbon::parse($t->approved_at) : Carbon::parse($t->updated_at);
            return $approvedAt->lte(Carbon::parse($t->committed_delivery_date));
        })->count();

        $onTimePercentage = $closedOrApproved->count() > 0 ? round(($onTimeCount / $closedOrApproved->count()) * 100) : 0;

        // 3. Average revision rounds per ticket & which requesters drive the most
        $avgRevisionRounds = round($tickets->avg('revision_count') ?? 0, 1);
        $revisionsByRequester = DB::table('design_tickets')
            ->leftJoin('users', 'design_tickets.requester_id', '=', 'users.id')
            ->select('users.name', DB::raw('SUM(design_tickets.revision_count) as total_revisions'), DB::raw('COUNT(design_tickets.id) as tickets_raised'))
            ->groupBy('users.name')
            ->orderBy('total_revisions', 'desc')
            ->get();

        // 4. Average turnaround split by work type in days (calculated dynamically from actual database records)
        $turnaroundByType = [];
        $workTypes = ['poster', 'social_creative', 'video_motion', 'presentation', 'other'];

        foreach ($workTypes as $wt) {
            $wtTickets = $tickets->where('work_type', $wt)->whereIn('status', ['Approved', 'Closed']);
            if ($wtTickets->count() > 0) {
                $totalHours = 0;
                foreach ($wtTickets as $t) {
                    $end = $t->approved_at ? Carbon::parse($t->approved_at) : Carbon::parse($t->updated_at);
                    $start = Carbon::parse($t->created_at);
                    $totalHours += max(0, $end->diffInHours($start));
                }
                $avgDays = round(($totalHours / $wtTickets->count()) / 24, 1);
                $turnaroundByType[$wt] = $avgDays;
            } else {
                $turnaroundByType[$wt] = 0.0;
            }
        }

        return response()->json([
            'status' => 'success',
            'metrics' => [
                'onTimePercentage' => $onTimePercentage,
                'avgRevisionRounds' => $avgRevisionRounds,
                'totalRequests' => $tickets->count(),
                'activeRequests' => $tickets->whereNotIn('status', ['Approved', 'Closed', 'Cancelled'])->count(),
            ],
            'byDivision' => $byDivision,
            'byWorkType' => $byWorkType,
            'turnaroundByType' => $turnaroundByType,
            'revisionsByRequester' => $revisionsByRequester,
        ]);
    }

    /**
     * @route GET /api/design/brand-kit
     * PDF Module 2: Multi-brand kit & guidelines library (RLabZ + External clients/institutions)
     */
    public function getBrandKit(Request $request)
    {
        $projects = DB::table('projects')->select('id', 'title', 'client_name')->get();

        $dbKits = Schema::hasTable('design_brand_kits') 
            ? DB::table('design_brand_kits')->orderBy('id', 'asc')->get() 
            : collect([]);

        $brandKits = [];
        foreach ($dbKits as $k) {
            $brandKits[$k->slug] = [
                'id' => $k->slug,
                'db_id' => $k->id,
                'name' => $k->name,
                'description' => $k->description,
                'applicable_entity' => $k->applicable_entity,
                'institution_or_client' => $k->institution_or_client,
                'associated_projects' => is_string($k->associated_projects) ? json_decode($k->associated_projects, true) : ($k->associated_projects ?: []),
                'brandingPortalUrl' => $k->branding_portal_url,
                'logo_url' => $k->logo_url,
                'brandColors' => is_string($k->brand_colors) ? json_decode($k->brand_colors, true) : ($k->brand_colors ?: []),
                'typography' => is_string($k->typography) ? json_decode($k->typography, true) : ($k->typography ?: []),
                'guidelines' => is_string($k->guidelines) ? json_decode($k->guidelines, true) : ($k->guidelines ?: []),
                'downloadableKits' => is_string($k->downloadable_kits) ? json_decode($k->downloadable_kits, true) : ($k->downloadable_kits ?: []),
                'is_active' => (bool)$k->is_active,
            ];
        }

        $selectedKey = $request->query('kit_id');
        $projectId = $request->query('project_id');

        if ($projectId) {
            foreach ($brandKits as $key => $k) {
                if (in_array((int)$projectId, $k['associated_projects'])) {
                    $selectedKey = $key;
                    break;
                }
            }
        }

        $activeKit = $brandKits[$selectedKey] ?? ($brandKits['rlabz_core'] ?? reset($brandKits));

        return response()->json([
            'status' => 'success',
            'availableProjects' => $projects,
            'brandKits' => array_values($brandKits),
            'selectedKitKey' => $activeKit ? $activeKit['id'] : 'rlabz_core',
            'brandingPortalUrl' => $activeKit['brandingPortalUrl'] ?? 'https://branding.rlabz.rajagiri.edu',
            'brandColors' => $activeKit['brandColors'] ?? [],
            'typography' => $activeKit['typography'] ?? [],
            'guidelines' => $activeKit['guidelines'] ?? [],
            'downloadableKits' => $activeKit['downloadableKits'] ?? [],
            'activeKit' => $activeKit,
        ]);
    }

    /**
     * @route POST /api/design/brand-kits
     * Authorised creation of new Brand Kit for external client/institution
     */
    public function createBrandKit(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'applicable_entity' => 'nullable|string|max:150',
            'institution_or_client' => 'nullable|string|max:150',
            'associated_projects' => 'nullable|array',
            'branding_portal_url' => 'nullable|string|max:255',
            'logo_url' => 'nullable|string|max:255',
            'brand_colors' => 'nullable|array',
            'typography' => 'nullable|array',
            'guidelines' => 'nullable|array',
            'downloadable_kits' => 'nullable|array',
        ]);

        $auth = $request->attributes->get('auth_user');
        $userId = $auth->id ?? 17;

        // Generate a clean slug
        $baseSlug = preg_replace('/[^a-z0-9]+/i', '_', strtolower(trim($validated['name'])));
        $baseSlug = trim($baseSlug, '_') ?: 'custom_brand';
        
        // Prevent collision with rlabz_core
        if ($baseSlug === 'rlabz_core') {
            $baseSlug = 'rlabz_custom_' . time();
        }

        $slug = $baseSlug;
        $counter = 1;
        while (DB::table('design_brand_kits')->where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}_{$counter}";
            $counter++;
        }

        $now = Carbon::now();
        $kitId = DB::table('design_brand_kits')->insertGetId([
            'slug' => $slug,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? 'Approved brand identity guidelines and asset package.',
            'applicable_entity' => $validated['applicable_entity'] ?? ($validated['institution_or_client'] ?? 'External Entity'),
            'institution_or_client' => $validated['institution_or_client'] ?? $validated['applicable_entity'],
            'associated_projects' => isset($validated['associated_projects']) ? json_encode($validated['associated_projects']) : json_encode([]),
            'branding_portal_url' => $validated['branding_portal_url'] ?? null,
            'logo_url' => $validated['logo_url'] ?? null,
            'brand_colors' => isset($validated['brand_colors']) ? json_encode($validated['brand_colors']) : json_encode([]),
            'typography' => isset($validated['typography']) ? json_encode($validated['typography']) : json_encode([]),
            'guidelines' => isset($validated['guidelines']) ? json_encode($validated['guidelines']) : json_encode([]),
            'downloadable_kits' => isset($validated['downloadable_kits']) ? json_encode($validated['downloadable_kits']) : json_encode([]),
            'is_active' => true,
            'created_by' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->logAudit(null, $userId, 'brand_kit_created', null, $validated['name'], "Created new Brand Kit: {$validated['name']} ({$slug})");

        return response()->json([
            'status' => 'success',
            'message' => "Brand Kit '{$validated['name']}' created successfully.",
            'kit_id' => $slug,
            'db_id' => $kitId,
        ], 201);
    }

    /**
     * @route PUT /api/design/brand-kits/{id}
     * Edit Brand Kit guidelines, tokens, and assets
     */
    public function updateBrandKit(Request $request, $id)
    {
        $kit = DB::table('design_brand_kits')->where('slug', $id)->orWhere('id', $id)->first();
        if (!$kit) {
            return response()->json(['status' => 'error', 'message' => 'Brand Kit not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'description' => 'nullable|string',
            'applicable_entity' => 'nullable|string|max:150',
            'institution_or_client' => 'nullable|string|max:150',
            'associated_projects' => 'nullable|array',
            'branding_portal_url' => 'nullable|string|max:255',
            'logo_url' => 'nullable|string|max:255',
            'brand_colors' => 'nullable|array',
            'typography' => 'nullable|array',
            'guidelines' => 'nullable|array',
            'downloadable_kits' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $auth = $request->attributes->get('auth_user');
        $userId = $auth->id ?? 17;

        $updateData = ['updated_at' => Carbon::now()];
        if (isset($validated['name'])) $updateData['name'] = $validated['name'];
        if (isset($validated['description'])) $updateData['description'] = $validated['description'];
        if (isset($validated['applicable_entity'])) $updateData['applicable_entity'] = $validated['applicable_entity'];
        if (isset($validated['institution_or_client'])) $updateData['institution_or_client'] = $validated['institution_or_client'];
        if (isset($validated['associated_projects'])) $updateData['associated_projects'] = json_encode($validated['associated_projects']);
        if (isset($validated['branding_portal_url'])) $updateData['branding_portal_url'] = $validated['branding_portal_url'];
        if (isset($validated['logo_url'])) $updateData['logo_url'] = $validated['logo_url'];
        if (isset($validated['brand_colors'])) $updateData['brand_colors'] = json_encode($validated['brand_colors']);
        if (isset($validated['typography'])) $updateData['typography'] = json_encode($validated['typography']);
        if (isset($validated['guidelines'])) $updateData['guidelines'] = json_encode($validated['guidelines']);
        if (isset($validated['downloadable_kits'])) $updateData['downloadable_kits'] = json_encode($validated['downloadable_kits']);
        if (isset($validated['is_active'])) $updateData['is_active'] = $validated['is_active'];

        DB::table('design_brand_kits')->where('id', $kit->id)->update($updateData);

        $this->logAudit(null, $userId, 'brand_kit_updated', $kit->name, $validated['name'] ?? $kit->name, "Updated Brand Kit specifications");

        return response()->json([
            'status' => 'success',
            'message' => "Brand Kit '{$kit->name}' updated successfully.",
        ]);
    }

    /**
     * @route PATCH /api/design/brand-kits/{id}/status
     * Toggle Brand Kit active/inactive status
     */
    public function toggleBrandKitStatus(Request $request, $id)
    {
        $kit = DB::table('design_brand_kits')->where('slug', $id)->orWhere('id', $id)->first();
        if (!$kit) {
            return response()->json(['status' => 'error', 'message' => 'Brand Kit not found'], 404);
        }

        // Do not allow deactivating default RLabZ brand kit
        if ($kit->slug === 'rlabz_core') {
            return response()->json([
                'status' => 'error',
                'message' => 'The default RLabZ Core Brand Kit cannot be deactivated.',
            ], 422);
        }

        $newStatus = !$kit->is_active;
        DB::table('design_brand_kits')->where('id', $kit->id)->update([
            'is_active' => $newStatus,
            'updated_at' => Carbon::now(),
        ]);

        $auth = $request->attributes->get('auth_user');
        $userId = $auth->id ?? 17;
        $statusStr = $newStatus ? 'activated' : 'deactivated';
        $this->logAudit(null, $userId, 'brand_kit_status_changed', (string)$kit->is_active, (string)$newStatus, "Brand kit '{$kit->name}' {$statusStr}");

        return response()->json([
            'status' => 'success',
            'message' => "Brand Kit '{$kit->name}' {$statusStr} successfully.",
            'is_active' => $newStatus,
        ]);
    }

    /**
     * @route GET /api/design/users
     * Team Management: View Design Team members with capacity, skills, workload
     */
    public function getDesignUsers()
    {
        $profiles = DB::table('design_user_profiles')->get()->keyBy('user_id');
        $profileUserIds = $profiles->keys()->toArray();

        // Include users with design_user_profiles or design_head role
        $users = DB::table('users')
            ->whereIn('id', $profileUserIds)
            ->orWhere('role', 'design_head')
            ->select('id', 'name', 'email', 'phone', 'avatar', 'role', 'department', 'created_at')
            ->get();

        // Calculate workload & committed hours from active tickets
        $workloads = DB::table('design_tickets')
            ->whereIn('status', ['New', 'Assigned', 'In Progress', 'Submitted', 'In Review', 'Revision'])
            ->whereNotNull('assigned_to')
            ->select(
                'assigned_to',
                DB::raw('COUNT(id) as open_tickets_count'),
                DB::raw('SUM(estimated_hours) as hours_committed')
            )
            ->groupBy('assigned_to')
            ->get()
            ->keyBy('assigned_to');

        $result = $users->map(function ($u) use ($profiles, $workloads) {
            $prof = $profiles->get($u->id);
            $wl = $workloads->get($u->id);

            $designRole = 'Designer';
            if ($u->role === 'design_head') $designRole = 'Design Lead';
            elseif ($u->role === 'director' || $u->id == 1) $designRole = 'Admin';
            elseif ($u->role === 'student') $designRole = 'Student Designer';
            else $designRole = 'Designer';

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone ?? '+91 98470 00000',
                'avatar' => $u->avatar,
                'system_role' => $u->role,
                'design_role' => $designRole,
                'division' => $prof->division ?? ($u->department ?? 'Creative Studio'),
                'skill_tags' => $prof ? json_decode($prof->skill_tags ?? '[]', true) : ['poster', 'UI'],
                'weekly_capacity_hours' => $prof ? (int)$prof->weekly_capacity_hours : 20,
                'is_active' => $prof ? (bool)$prof->is_active : true,
                'open_tickets_count' => $wl ? (int)$wl->open_tickets_count : 0,
                'hours_committed_this_week' => $wl ? (float)$wl->hours_committed : 0,
                'notification_preferences' => $prof ? json_decode($prof->notification_preferences ?? '{"in_app":true,"email":true}', true) : ['in_app' => true, 'email' => true],
                'joining_date' => Carbon::parse($u->created_at)->format('Y-m-d'),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }

    /**
     * @route GET /api/design/team-candidates
     * Search existing ERP users to add to the design team
     */
    public function searchEligibleTeamCandidates(Request $request)
    {
        $q = trim($request->input('q', ''));
        $existingTeamUserIds = DB::table('design_user_profiles')
            ->where('is_active', 1)
            ->pluck('user_id')
            ->toArray();

        $query = DB::table('users')
            ->leftJoin('student_profiles', 'users.id', '=', 'student_profiles.student_id')
            ->select(
                'users.id',
                'users.name',
                'users.email',
                'users.role',
                'users.department',
                'student_profiles.course',
                'student_profiles.batch',
                'student_profiles.designation as student_designation'
            );

        if (!empty($q)) {
            $s = '%' . $q . '%';
            $query->where(function ($sub) use ($s) {
                $sub->where('users.name', 'like', $s)
                    ->orWhere('users.email', 'like', $s)
                    ->orWhere('users.role', 'like', $s);
            });
        }

        $candidates = $query->limit(20)->get()->map(function ($u) use ($existingTeamUserIds) {
            $isOnTeam = in_array($u->id, $existingTeamUserIds);
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'department' => $u->department ?? 'General',
                'is_student' => ($u->role === 'student'),
                'academic_summary' => ($u->role === 'student') ? "{$u->course} · {$u->batch} · " . ucfirst($u->student_designation ?? 'Nova') : null,
                'is_on_design_team' => $isOnTeam,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $candidates,
        ]);
    }

    /**
     * @route POST /api/design/team-members
     * Add existing ERP user to Design Team
     */
    public function addExistingUserToTeam(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'skill_tags' => 'required|array|min:1',
            'weekly_capacity_hours' => 'required|integer|min:1|max:80',
            'division' => 'nullable|string|max:100',
            'notification_preferences' => 'nullable|array',
        ]);

        $userId = $validated['user_id'];
        $user = DB::table('users')->where('id', $userId)->first();

        // Check if already on team and active
        $existing = DB::table('design_user_profiles')->where('user_id', $userId)->first();
        if ($existing && $existing->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => "User {$user->name} already belongs to the Design Team.",
            ], 422);
        }

        $division = $validated['division'] ?? ($user->department ?: 'Design');

        DB::table('design_user_profiles')->updateOrInsert(
            ['user_id' => $userId],
            [
                'division' => $division,
                'skill_tags' => json_encode($validated['skill_tags']),
                'weekly_capacity_hours' => $validated['weekly_capacity_hours'],
                'notification_preferences' => json_encode($validated['notification_preferences'] ?? ['in_app' => true, 'email' => true]),
                'is_active' => true,
                'updated_at' => now(),
                'created_at' => $existing ? $existing->created_at : now(),
            ]
        );

        $auth = $request->attributes->get('auth_user');
        $actorId = $auth['id'] ?? ($auth['sub'] ?? 17);
        $this->logAudit(null, $actorId, 'team_member_added', null, [
            'user_id' => $userId,
            'name' => $user->name,
            'skills' => $validated['skill_tags'],
            'capacity' => $validated['weekly_capacity_hours'],
        ], "Added {$user->name} to Design Team.");

        return response()->json([
            'status' => 'success',
            'message' => "{$user->name} added to the Design Team successfully.",
        ], 201);
    }

    /**
     * @route POST /api/design/create-designer
     * Create new designer account (reuses Coordinator/Admin account creation workflow)
     */
    public function createNewDesignerAccount(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:20',
            'account_type' => 'required|string|in:student,non-student',
            'skill_tags' => 'required|array|min:1',
            'weekly_capacity_hours' => 'required|integer|min:1|max:80',
            'division' => 'nullable|string|max:100',
            // Student specific fields if student
            'course' => 'nullable|string|max:100',
            'batch' => 'nullable|string|max:50',
            'semester' => 'nullable|integer|min:1|max:12',
            'student_designation' => 'nullable|string|in:nova,orbit,spark',
        ]);

        $isStudent = ($validated['account_type'] === 'student');
        $role = $isStudent ? 'student' : 'developer'; // narrow supported designer role
        $permissions = $isStudent
            ? ['view-student', 'view-projects', 'view-communication', 'view-design']
            : ['view-design', 'view-projects', 'view-communication'];

        $userId = DB::table('users')->insertGetId([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => \Illuminate\Support\Facades\Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'role' => $role,
            'permissions' => json_encode($permissions),
            'department' => $validated['division'] ?? 'Design & Creative Studio',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Student Profile (if student designer)
        if ($isStudent && Schema::hasTable('student_profiles')) {
            DB::table('student_profiles')->insert([
                'student_id' => $userId,
                'course' => $validated['course'] ?? 'MCA',
                'batch' => $validated['batch'] ?? date('Y') . '-' . (date('Y') + 2),
                'semester' => (int)($validated['semester'] ?? 1),
                'designation' => $validated['student_designation'] ?? 'nova',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Design Profile
        DB::table('design_user_profiles')->insert([
            'user_id' => $userId,
            'division' => $validated['division'] ?? 'Design',
            'skill_tags' => json_encode($validated['skill_tags']),
            'weekly_capacity_hours' => (int)$validated['weekly_capacity_hours'],
            'notification_preferences' => json_encode(['in_app' => true, 'email' => true]),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $auth = $request->attributes->get('auth_user');
        $actorId = $auth['id'] ?? ($auth['sub'] ?? 17);
        $this->logAudit(null, $actorId, 'designer_account_created', null, [
            'user_id' => $userId,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $role,
        ], "Created new {$validated['account_type']} designer account for {$validated['name']}.");

        return response()->json([
            'status' => 'success',
            'message' => "Designer account for {$validated['name']} created successfully.",
            'user' => [
                'id' => $userId,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'role' => $role,
            ]
        ], 201);
    }

    /**
     * @route PATCH /api/design/users/{id}/status
     * Activate or deactivate design team membership
     */
    public function toggleTeamMemberStatus(Request $request, $id)
    {
        $membership = DB::table('design_user_profiles')->where('user_id', $id)->first();
        if (!$membership) {
            return response()->json(['error' => 'Design profile not found'], 404);
        }

        $newActive = $request->has('is_active') ? (bool)$request->is_active : !$membership->is_active;

        DB::table('design_user_profiles')->where('user_id', $id)->update([
            'is_active' => $newActive,
            'updated_at' => now(),
        ]);

        $auth = $request->attributes->get('auth_user');
        $actorId = $auth['id'] ?? ($auth['sub'] ?? 17);
        $action = $newActive ? 'membership_activated' : 'membership_deactivated';
        $user = DB::table('users')->where('id', $id)->first();
        $userName = $user ? $user->name : "User #{$id}";

        $this->logAudit(null, $actorId, $action, (string)$membership->is_active, (string)$newActive, "{$action} for {$userName}");

        return response()->json([
            'status' => 'success',
            'message' => "Membership for {$userName} " . ($newActive ? 'activated' : 'deactivated') . " successfully.",
            'is_active' => $newActive,
        ]);
    }

    /**
     * @route PUT /api/design/users/{id}/profile
     * Update user skills, capacity, division
     */
    public function updateUserProfile(Request $request, $id)
    {
        $validated = $request->validate([
            'skill_tags' => 'nullable|array',
            'weekly_capacity_hours' => 'nullable|integer|min:0|max:80',
            'division' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $data = [
            'updated_at' => Carbon::now(),
        ];
        if (isset($validated['skill_tags'])) $data['skill_tags'] = json_encode($validated['skill_tags']);
        if (isset($validated['weekly_capacity_hours'])) $data['weekly_capacity_hours'] = $validated['weekly_capacity_hours'];
        if (isset($validated['division'])) $data['division'] = $validated['division'];
        if (isset($validated['is_active'])) $data['is_active'] = $validated['is_active'];

        DB::table('design_user_profiles')->updateOrInsert(['user_id' => $id], $data);

        return response()->json([
            'status' => 'success',
            'message' => 'Design user profile updated.',
        ]);
    }

    /**
     * @route POST /api/design/tickets/{id}/reassign
     * Reassign ticket with required permission and recorded reason
     */
    public function reassignTicket(Request $request, $id)
    {
        $auth = $request->attributes->get('auth_user');
        if ($auth && $auth->role === 'student') {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden: Students cannot assign or reassign creative tickets.'
            ], 403);
        }

        $validated = $request->validate([
            'assigned_to' => 'required|integer|exists:users,id',
            'reason' => 'required|string|max:1000',
            'committed_delivery_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0.5',
        ]);

        $ticket = DB::table('design_tickets')->where('id', $id)->first();
        if (!$ticket) {
            return response()->json(['error' => 'Ticket not found'], 404);
        }

        $prevAssigneeId = $ticket->assigned_to;
        $prevAssignee = $prevAssigneeId ? DB::table('users')->where('id', $prevAssigneeId)->value('name') : 'Unassigned';
        $newAssignee = DB::table('users')->where('id', $validated['assigned_to'])->value('name');

        $update = [
            'assigned_to' => $validated['assigned_to'],
            'updated_at' => now(),
        ];
        if (!empty($validated['committed_delivery_date'])) {
            $update['committed_delivery_date'] = $validated['committed_delivery_date'];
        }
        if (!empty($validated['estimated_hours'])) {
            $update['estimated_hours'] = $validated['estimated_hours'];
        }

        DB::table('design_tickets')->where('id', $id)->update($update);

        $auth = $request->attributes->get('auth_user');
        $actorId = $auth['id'] ?? ($auth['sub'] ?? 17);
        $this->logAudit($id, $actorId, 'reassigned', $prevAssignee, $newAssignee, $validated['reason']);

        // Notify new designer
        $this->notifyUser(
            $id,
            $validated['assigned_to'],
            'ticket_reassigned',
            'Ticket Reassigned to You',
            "You have been assigned ticket {$ticket->ticket_number} ({$ticket->title}). Reason: {$validated['reason']}"
        );

        return response()->json([
            'status' => 'success',
            'message' => "Ticket {$ticket->ticket_number} reassigned to {$newAssignee}.",
        ]);
    }

    /**
     * @route GET /api/design/notifications
     * Reuses shared notifications table and synthesizes active action alerts
     */
    public function getNotifications(Request $request)
    {
        $auth = $request->attributes->get('auth_user');
        $userId = $auth->id ?? 17;

        $notifs = DB::table('notifications')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit(30)
            ->get();

        // Synthesize Action Items matching Finance layout
        $allTickets = DB::table('design_tickets')
            ->leftJoin('projects', 'design_tickets.project_id', '=', 'projects.id')
            ->leftJoin('users as designers', 'design_tickets.assigned_to', '=', 'designers.id')
            ->select(
                'design_tickets.*',
                'projects.title as project_title',
                'designers.name as assigned_to_name'
            )
            ->get();

        $alerts = [];
        $now = Carbon::now();

        foreach ($allTickets as $t) {
            // 1. Unassigned Requests Queue
            if (!$t->assigned_to && !in_array($t->status, ['Approved', 'Closed', 'Cancelled'])) {
                $alerts[] = [
                    'id' => "unassigned-{$t->id}",
                    'category' => 'UNASSIGNED',
                    'type' => 'unassigned',
                    'ticketId' => $t->id,
                    'ticketNumber' => $t->ticket_number,
                    'title' => $t->title,
                    'projectName' => $t->project_title ?: $t->requesting_division,
                    'daysLeft' => $t->required_by ? (int)ceil($now->diffInDays(Carbon::parse($t->required_by), false)) : 0,
                    'isOverdue' => $t->required_by ? Carbon::parse($t->required_by)->isPast() : false,
                    'message' => "New creative brief '{$t->ticket_number}: {$t->title}' awaits designer allocation.",
                    'dateStr' => $t->required_by ? Carbon::parse($t->required_by)->format('M d, Y') : '',
                ];
            }

            // 2. Pending Approvals (Submitted / In Review)
            if (in_array($t->status, ['Submitted', 'In Review'])) {
                $alerts[] = [
                    'id' => "approval-{$t->id}",
                    'category' => 'APPROVAL',
                    'type' => 'approval',
                    'ticketId' => $t->id,
                    'ticketNumber' => $t->ticket_number,
                    'title' => $t->title,
                    'projectName' => $t->project_title ?: $t->requesting_division,
                    'daysLeft' => $t->committed_delivery_date ? (int)ceil($now->diffInDays(Carbon::parse($t->committed_delivery_date), false)) : 0,
                    'isOverdue' => false,
                    'message' => "Deliverable for '{$t->ticket_number}' has been submitted and is awaiting review.",
                    'dateStr' => $t->committed_delivery_date ? Carbon::parse($t->committed_delivery_date)->format('M d, Y') : '',
                ];
            }

            // 3. Active Revisions
            if ($t->status === 'Revision') {
                $alerts[] = [
                    'id' => "revision-{$t->id}",
                    'category' => 'REVISION',
                    'type' => 'revision',
                    'ticketId' => $t->id,
                    'ticketNumber' => $t->ticket_number,
                    'title' => $t->title,
                    'projectName' => $t->project_title ?: $t->requesting_division,
                    'daysLeft' => $t->committed_delivery_date ? (int)ceil($now->diffInDays(Carbon::parse($t->committed_delivery_date), false)) : 0,
                    'isOverdue' => false,
                    'message' => "Revision round active on '{$t->ticket_number}' (Assigned to {$t->assigned_to_name}).",
                    'dateStr' => $t->committed_delivery_date ? Carbon::parse($t->committed_delivery_date)->format('M d, Y') : '',
                ];
            }

            // 4. Overdue or Approaching Deadlines
            if (!in_array($t->status, ['Approved', 'Closed', 'Cancelled'])) {
                $targetDate = $t->committed_delivery_date ? Carbon::parse($t->committed_delivery_date) : ($t->required_by ? Carbon::parse($t->required_by) : null);
                if ($targetDate) {
                    $daysLeft = (int)ceil($now->diffInDays($targetDate, false));
                    if ($targetDate->isPast()) {
                        $alerts[] = [
                            'id' => "overdue-{$t->id}",
                            'category' => 'OVERDUE',
                            'type' => 'overdue',
                            'ticketId' => $t->id,
                            'ticketNumber' => $t->ticket_number,
                            'title' => $t->title,
                            'projectName' => $t->project_title ?: $t->requesting_division,
                            'daysLeft' => $daysLeft,
                            'isOverdue' => true,
                            'message' => "Deliverable '{$t->ticket_number}' is overdue by " . abs($daysLeft) . " day(s).",
                            'dateStr' => $targetDate->format('M d, Y'),
                        ];
                    } elseif ($daysLeft <= 2) {
                        $alerts[] = [
                            'id' => "deadline-{$t->id}",
                            'category' => 'DEADLINE',
                            'type' => 'deadline',
                            'ticketId' => $t->id,
                            'ticketNumber' => $t->ticket_number,
                            'title' => $t->title,
                            'projectName' => $t->project_title ?: $t->requesting_division,
                            'daysLeft' => $daysLeft,
                            'isOverdue' => false,
                            'message' => "Committed deadline approaching for '{$t->ticket_number}' in {$daysLeft} day(s).",
                            'dateStr' => $targetDate->format('M d, Y'),
                        ];
                    }
                }
            }
        }

        // Deduplicate alerts by id
        $uniqueAlerts = collect($alerts)->unique('id')->values()->all();

        return response()->json([
            'status' => 'success',
            'data' => $notifs,
            'alerts' => $uniqueAlerts,
            'unreadCount' => $notifs->where('is_read', 0)->count() + count($uniqueAlerts),
        ]);
    }

    /**
     * @route PATCH /api/design/notifications/{id}/read
     */
    public function markNotificationRead(Request $request, $id)
    {
        DB::table('notifications')->where('id', $id)->update(['is_read' => 1]);
        return response()->json(['status' => 'success']);
    }

    /**
     * @route GET /api/design/audit-logs
     * PDF Module 11: Admin-level global view, filterable by user and date range
     */
    public function getAuditLogs(Request $request)
    {
        $query = DB::table('design_audit_logs')
            ->leftJoin('users', 'design_audit_logs.user_id', '=', 'users.id')
            ->leftJoin('design_tickets', 'design_audit_logs.ticket_id', '=', 'design_tickets.id')
            ->select(
                'design_audit_logs.*',
                'users.name as actor_name',
                'users.email as actor_email',
                'design_tickets.ticket_number',
                'design_tickets.title as ticket_title'
            );

        if ($request->has('user_id') && !empty($request->user_id)) {
            $query->where('design_audit_logs.user_id', $request->user_id);
        }
        if ($request->has('ticket_id') && !empty($request->ticket_id)) {
            $query->where('design_audit_logs.ticket_id', $request->ticket_id);
        }

        $logs = $query->orderBy('design_audit_logs.created_at', 'desc')->limit(100)->get();

        return response()->json([
            'status' => 'success',
            'data' => $logs,
        ]);
    }
}
