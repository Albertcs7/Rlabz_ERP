<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ProjectDummyFinanceAndTaskSeeder extends Seeder
{
    public function run()
    {
        // 1. Resolve Users by Email
        $users = DB::table('users')->pluck('id', 'email')->toArray();

        $coordinatorId = $users['coordinator@rajagiri.edu'] ?? 3;
        $financeId = $users['finance@rajagiri.edu'] ?? 4;
        $facultyMemberId = $users['faculty@rajagiri.edu'] ?? 5;
        $drAliceId = $users['alice.smith@rajagiri.edu'] ?? 9;
        $profBobId = $users['bob.johnson@rajagiri.edu'] ?? 10;
        $drJosephId = $users['joseph.thomas@rajagiri.edu'] ?? 11;
        $profAnitaId = $users['anita.sharma@rajagiri.edu'] ?? 12;

        $studentNovaId = $users['nova@rajagiri.edu'] ?? 6;
        $studentOrbitId = $users['orbit@rajagiri.edu'] ?? 7;
        $studentSparkId = $users['spark@rajagiri.edu'] ?? 8;
        $alexId = $users['alex.varghese@rajagiri.edu'] ?? 13;
        $rheaId = $users['rhea.mathew@rajagiri.edu'] ?? 14;
        $karanId = $users['karan.nair@rajagiri.edu'] ?? 15;
        $meeraId = $users['meera.kurien@rajagiri.edu'] ?? 16;

        // 2. Fetch Projects
        $projects = DB::table('projects')->pluck('id', 'title')->toArray();

        // Helper: Project Student Assignment
        $assignStudent = function ($projectId, $studentId, $role = 'developer') {
            $existing = DB::table('project_student')->where('project_id', $projectId)->where('student_id', $studentId)->first();
            if ($existing) {
                return $existing->id;
            }
            return DB::table('project_student')->insertGetId([
                'project_id' => $projectId,
                'student_id' => $studentId,
                'role' => in_array($role, ['project_lead', 'developer', 'designer', 'tester', 'other']) ? $role : 'developer',
                'assigned_date' => Carbon::now()->subMonths(3)->toDateString(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        };

        // Helper: Project Faculty Assignment
        $assignFaculty = function ($projectId, $facultyId) {
            $existing = DB::table('project_faculty')->where('project_id', $projectId)->where('faculty_id', $facultyId)->first();
            if ($existing) {
                return $existing->id;
            }
            return DB::table('project_faculty')->insertGetId([
                'project_id' => $projectId,
                'faculty_id' => $facultyId,
                'assigned_date' => Carbon::now()->subMonths(3)->toDateString(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        };

        // Helper: Create/Find Module
        $createModule = function ($projectId, $name, $weight, $status, $description, $creatorId) {
            $existing = DB::table('modules')->where('project_id', $projectId)->where('module_name', $name)->first();
            if ($existing) {
                DB::table('modules')->where('id', $existing->id)->update([
                    'weight_percentage' => $weight,
                    'status' => $status,
                    'description' => $description,
                    'updated_at' => now(),
                ]);
                return $existing->id;
            }
            return DB::table('modules')->insertGetId([
                'project_id' => $projectId,
                'module_name' => $name,
                'weight_percentage' => $weight,
                'description' => $description,
                'status' => $status,
                'created_by' => $creatorId,
                'created_at' => Carbon::now()->subDays(60),
                'updated_at' => now(),
            ]);
        };

        // Helper: Create/Update Task
        $createTask = function ($moduleId, $title, $description, $assignedTo, $status, $rating, $dueDate, $creatorId, $reviewedBy = null, $reviewedAt = null) {
            $existing = DB::table('tasks')->where('module_id', $moduleId)->where('title', $title)->first();
            if ($existing) {
                DB::table('tasks')->where('id', $existing->id)->update([
                    'description' => $description,
                    'assigned_to' => $assignedTo,
                    'status' => $status,
                    'rating' => $rating,
                    'due_date' => $dueDate,
                    'reviewed_by' => $reviewedBy,
                    'reviewed_at' => $reviewedAt,
                    'updated_at' => now(),
                ]);
                return $existing->id;
            }
            return DB::table('tasks')->insertGetId([
                'module_id' => $moduleId,
                'title' => $title,
                'description' => $description,
                'assigned_to' => $assignedTo,
                'status' => $status,
                'rating' => $rating,
                'due_date' => $dueDate,
                'reviewed_by' => $reviewedBy,
                'reviewed_at' => $reviewedAt,
                'created_by' => $creatorId,
                'created_at' => Carbon::now()->subDays(45),
                'updated_at' => now(),
            ]);
        };

        // Helper: Create/Update Work Log
        $createWorkLog = function ($psId, $taskId, $hours, $desc, $approvalStatus, $approvedBy, $rating, $workDate) {
            $existing = DB::table('student_work_logs')->where('project_student_id', $psId)->where('task_id', $taskId)->first();
            if ($existing) {
                DB::table('student_work_logs')->where('id', $existing->id)->update([
                    'hours_worked' => $hours,
                    'description' => $desc,
                    'approval_status' => $approvalStatus,
                    'approved_by' => $approvedBy,
                    'approved_at' => $approvalStatus === 'approved' ? Carbon::parse($workDate)->addDay()->toDateTimeString() : null,
                    'rating' => $rating,
                    'updated_at' => now(),
                ]);
                return $existing->id;
            }
            return DB::table('student_work_logs')->insertGetId([
                'project_student_id' => $psId,
                'task_id' => $taskId,
                'work_date' => $workDate,
                'hours_worked' => $hours,
                'description' => $desc,
                'rating' => $rating,
                'approval_status' => $approvalStatus,
                'approved_by' => $approvedBy,
                'approved_at' => $approvalStatus === 'approved' ? Carbon::parse($workDate)->addDay()->toDateTimeString() : null,
                'created_at' => Carbon::parse($workDate)->toDateTimeString(),
                'updated_at' => now(),
            ]);
        };

        // Helper: Ensure Project Finance
        $getOrCreateProjectFinance = function ($projectId, $budget, $status = 'approved') use ($coordinatorId) {
            $existing = DB::table('project_finances')->where('project_id', $projectId)->first();
            if ($existing) {
                return $existing->id;
            }
            $pfId = DB::table('project_finances')->insertGetId([
                'project_id' => $projectId,
                'total_development_amount' => $budget,
                'created_by' => $coordinatorId,
                'status' => $status,
                'created_at' => Carbon::now()->subDays(60),
                'updated_at' => now(),
            ]);

            // Default allocations: 40% student, 20% faculty, 40% rlabz
            $studentShare = round($budget * 0.40, 2);
            $facultyShare = round($budget * 0.20, 2);
            $rlabzShare = round($budget - $studentShare - $facultyShare, 2);

            DB::table('development_allocations')->insert([
                ['project_finance_id' => $pfId, 'category' => 'student', 'amount' => $studentShare, 'created_at' => now(), 'updated_at' => now()],
                ['project_finance_id' => $pfId, 'category' => 'faculty', 'amount' => $facultyShare, 'created_at' => now(), 'updated_at' => now()],
                ['project_finance_id' => $pfId, 'category' => 'rlabz', 'amount' => $rlabzShare, 'created_at' => now(), 'updated_at' => now()],
            ]);

            return $pfId;
        };

        // Helper: Create Invoice + Items
        $createInvoice = function ($pfId, $invoiceNumber, $date, $dueDate, $amountBeforeGst, $gstPct, $desc, $items = []) use ($financeId) {
            $existing = DB::table('invoices')->where('invoice_number', $invoiceNumber)->first();
            if ($existing) {
                $invId = $existing->id;
                DB::table('invoices')->where('id', $invId)->update([
                    'project_finance_id' => $pfId,
                    'invoice_date' => $date,
                    'due_date' => $dueDate,
                    'amount_before_gst' => $amountBeforeGst,
                    'gst_percentage' => $gstPct,
                    'description' => $desc,
                    'updated_at' => now(),
                ]);
            } else {
                $invId = DB::table('invoices')->insertGetId([
                    'project_finance_id' => $pfId,
                    'invoice_number' => $invoiceNumber,
                    'invoice_date' => $date,
                    'due_date' => $dueDate,
                    'amount_before_gst' => $amountBeforeGst,
                    'gst_percentage' => $gstPct,
                    'description' => $desc,
                    'created_by' => $financeId,
                    'created_at' => Carbon::parse($date)->toDateTimeString(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('invoice_items')->where('invoice_id', $invId)->delete();
            foreach ($items as $item) {
                DB::table('invoice_items')->insert([
                    'invoice_id' => $invId,
                    'description' => $item['description'],
                    'rate' => $item['rate'],
                    'quantity' => $item['quantity'] ?? 1,
                    'amount' => $item['amount'] ?? ($item['rate'] * ($item['quantity'] ?? 1)),
                    'created_at' => Carbon::parse($date)->toDateTimeString(),
                    'updated_at' => now(),
                ]);
            }

            return $invId;
        };

        // Helper: Client Payment
        $createClientPayment = function ($invoiceId, $amount, $date, $method, $ref, $remarks) use ($financeId) {
            $existing = DB::table('client_payments')->where('invoice_id', $invoiceId)->where('payment_reference', $ref)->first();
            if ($existing) {
                return $existing->id;
            }
            return DB::table('client_payments')->insertGetId([
                'invoice_id' => $invoiceId,
                'amount' => $amount,
                'payment_date' => $date,
                'payment_method' => $method,
                'payment_reference' => $ref,
                'remarks' => $remarks,
                'recorded_by' => $financeId,
                'created_at' => Carbon::parse($date)->toDateTimeString(),
                'updated_at' => now(),
            ]);
        };

        // Helper: Student Payment
        $createStudentPayment = function ($psId, $designation, $approvedHours, $rate, $amount, $date) {
            $existing = DB::table('student_payments')->where('project_student_id', $psId)->first();
            if ($existing) {
                DB::table('student_payments')->where('id', $existing->id)->update([
                    'designation' => $designation,
                    'approved_hours' => $approvedHours,
                    'hourly_rate' => $rate,
                    'amount' => $amount,
                    'payment_date' => $date,
                    'updated_at' => now(),
                ]);
                return $existing->id;
            }
            return DB::table('student_payments')->insertGetId([
                'project_student_id' => $psId,
                'designation' => $designation,
                'approved_hours' => $approvedHours,
                'hourly_rate' => $rate,
                'amount' => $amount,
                'payment_date' => $date,
                'created_at' => Carbon::parse($date)->toDateTimeString(),
                'updated_at' => now(),
            ]);
        };

        // Helper: Faculty Payment
        $createFacultyPayment = function ($pfacId, $amount, $date, $status = 'paid') {
            $existing = DB::table('faculty_payments')->where('project_faculty_id', $pfacId)->first();
            if ($existing) {
                DB::table('faculty_payments')->where('id', $existing->id)->update([
                    'amount' => $amount,
                    'payment_date' => $date,
                    'status' => $status,
                    'updated_at' => now(),
                ]);
                return $existing->id;
            }
            return DB::table('faculty_payments')->insertGetId([
                'project_faculty_id' => $pfacId,
                'amount' => $amount,
                'payment_date' => $date,
                'status' => $status,
                'created_at' => Carbon::parse($date)->toDateTimeString(),
                'updated_at' => now(),
            ]);
        };

        // Helper: Hosting / SSL Charge
        $createHostingCharge = function ($pfId, $type, $amount, $purchaseDate, $expiryDate, $domain, $details) {
            $existing = DB::table('hosting_charges')
                ->where('project_finance_id', $pfId)
                ->where('domain_name', $domain)
                ->where('charge_type', $type)
                ->first();
            if ($existing) {
                DB::table('hosting_charges')->where('id', $existing->id)->update([
                    'amount' => $amount,
                    'purchase_date' => $purchaseDate,
                    'expiry_date' => $expiryDate,
                    'reference_details' => $details,
                    'updated_at' => now(),
                ]);
                return $existing->id;
            }
            return DB::table('hosting_charges')->insertGetId([
                'project_finance_id' => $pfId,
                'charge_type' => $type,
                'amount' => $amount,
                'purchase_date' => $purchaseDate,
                'expiry_date' => $expiryDate,
                'domain_name' => $domain,
                'reference_details' => $details,
                'created_at' => Carbon::parse($purchaseDate)->toDateTimeString(),
                'updated_at' => now(),
            ]);
        };

        // Helper: Maintenance Charge
        $createMaintenanceCharge = function ($pfId, $amount, $startDate, $endDate, $description) {
            $existing = DB::table('maintenance_support_charges')
                ->where('project_finance_id', $pfId)
                ->where('description', $description)
                ->first();
            if ($existing) {
                return $existing->id;
            }
            return DB::table('maintenance_support_charges')->insertGetId([
                'project_finance_id' => $pfId,
                'amount' => $amount,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'description' => $description,
                'created_at' => Carbon::parse($startDate)->toDateTimeString(),
                'updated_at' => now(),
            ]);
        };

        // Hourly rate setting
        $hourlyRate = 300.00;

        // =========================================================================
        // PROJECT 1: RLabZ ERP - Student Portal (ID: 1)
        // =========================================================================
        $p1Id = $projects['RLabZ ERP - Student Portal'] ?? 1;
        $pf1Id = $getOrCreateProjectFinance($p1Id, 150000.00);

        // Assign Faculty & Students
        $pfac1 = $assignFaculty($p1Id, $facultyMemberId);
        $ps1_nova = $assignStudent($p1Id, $studentNovaId, 'project_lead');
        $ps1_orbit = $assignStudent($p1Id, $studentOrbitId, 'developer');
        $ps1_spark = $assignStudent($p1Id, $studentSparkId, 'designer');

        // Update ratings on existing completed tasks
        DB::table('tasks')->where('module_id', 1)->where('title', 'like', '%frontend directory%')->update(['rating' => 4.80, 'reviewed_by' => $facultyMemberId, 'reviewed_at' => Carbon::now()->subDays(30)]);
        DB::table('tasks')->where('module_id', 1)->where('title', 'like', '%AuthStore%')->update(['rating' => 4.70, 'reviewed_by' => $facultyMemberId, 'reviewed_at' => Carbon::now()->subDays(28)]);
        DB::table('tasks')->where('module_id', 2)->where('title', 'like', '%student sidebar%')->update(['rating' => 4.90, 'reviewed_by' => $facultyMemberId, 'reviewed_at' => Carbon::now()->subDays(20)]);
        DB::table('tasks')->where('module_id', 2)->where('title', 'like', '%obsolete project%')->update(['rating' => 4.60, 'reviewed_by' => $facultyMemberId, 'reviewed_at' => Carbon::now()->subDays(18)]);
        DB::table('tasks')->where('module_id', 4)->where('title', 'like', '%certificates page%')->update(['rating' => 5.00, 'reviewed_by' => $facultyMemberId, 'reviewed_at' => Carbon::now()->subDays(10)]);

        // Find task IDs for work logs
        $t1 = DB::table('tasks')->where('module_id', 1)->where('title', 'like', '%frontend directory%')->value('id');
        $t2 = DB::table('tasks')->where('module_id', 1)->where('title', 'like', '%AuthStore%')->value('id');
        $t3 = DB::table('tasks')->where('module_id', 2)->where('title', 'like', '%student sidebar%')->value('id');
        $t5 = DB::table('tasks')->where('module_id', 2)->where('title', 'like', '%obsolete project%')->value('id');
        $t8 = DB::table('tasks')->where('module_id', 4)->where('title', 'like', '%certificates page%')->value('id');

        // Work Logs
        if ($t2) $createWorkLog($ps1_orbit, $t2, 16.00, 'Implemented Pinia AuthStore with JWT token persistence and route guards', 'approved', $facultyMemberId, 4.70, '2026-09-02');
        if ($t3) $createWorkLog($ps1_nova, $t3, 10.00, 'Refined responsive student sidebar navigation with badges', 'approved', $facultyMemberId, 4.90, '2026-09-10');
        if ($t5) $createWorkLog($ps1_nova, $t5, 8.00, 'Purged deprecated proposal templates and refreshed form layout', 'approved', $facultyMemberId, 4.60, '2026-09-15');
        if ($t8) $createWorkLog($ps1_nova, $t8, 14.00, 'Integrated canvas-based certificate previewer with PDF download', 'approved', $facultyMemberId, 5.00, '2026-09-22');

        // Invoices for P1
        $inv1_1 = $createInvoice($pf1Id, 'INV-2026-004', '2026-08-01', '2026-08-15', 60000.00, 18.00, 'Milestone 1: Frontend Workspace Architecture & Auth Guards', [
            ['description' => 'Single-page Vue/Vite App Architecture & Styling Tokens', 'rate' => 30000.00, 'quantity' => 1, 'amount' => 30000.00],
            ['description' => 'JWT Authentication Engine & Student Session Storage', 'rate' => 30000.00, 'quantity' => 1, 'amount' => 30000.00],
        ]);
        $createClientPayment($inv1_1, 70800.00, '2026-08-14', 'bank_transfer', 'TXN-RLABZ-001', 'Milestone 1 settlement from Rajagiri IT Cell');

        $inv1_2 = $createInvoice($pf1Id, 'INV-2026-005', '2026-09-15', '2026-09-30', 50000.00, 18.00, 'Milestone 2: Dashboards, Progress Reports & Certificate Hub', [
            ['description' => 'Student KPI Dashboard & Daily Log Submissions', 'rate' => 25000.00, 'quantity' => 1, 'amount' => 25000.00],
            ['description' => 'Certificate Generation & Secure Verifier Portal', 'rate' => 25000.00, 'quantity' => 1, 'amount' => 25000.00],
        ]);
        $createClientPayment($inv1_2, 30000.00, '2026-09-28', 'neft', 'NEFT-RLABZ-002', 'Part payment for Milestone 2');

        // Student Payments for P1
        // Nova (User #6): Approved hours: Task 1 (6h) + Task 3 (10h) + Task 5 (8h) + Task 8 (14h) = 38h * 300 = ₹11,400. Paid: ₹11,400 (Paid in full)
        $createStudentPayment($ps1_nova, 'nova', 38.00, $hourlyRate, 11400.00, '2026-09-30');
        // Orbit (User #7): Approved hours: Task 2 (16h) * 300 = ₹4,800. Paid: ₹3,000 (Partially Paid)
        $createStudentPayment($ps1_orbit, 'orbit', 16.00, $hourlyRate, 3000.00, '2026-09-30');

        // Faculty Payment for P1
        $createFacultyPayment($pfac1, 12000.00, '2026-09-05', 'paid');

        // Hosting & SSL for P1
        $createHostingCharge($pf1Id, 'hosting', 8500.00, '2026-07-01', '2027-07-01', 'student.rlabz.in', 'AWS LightSail 4GB Production Node (Student Portal)');
        $createHostingCharge($pf1Id, 'ssl', 2400.00, '2026-07-05', '2027-07-05', 'student.rlabz.in', 'DigiCert Wildcard SSL Certificate');

        // =========================================================================
        // PROJECT 2: CMS Academic Module (ID: 2) [CLOSED]
        // =========================================================================
        $p2Id = $projects['CMS Academic Module'] ?? 2;
        $pf2Id = $getOrCreateProjectFinance($p2Id, 85000.00);

        $pfac2 = $assignFaculty($p2Id, $facultyMemberId);
        $ps2_nova = $assignStudent($p2Id, $studentNovaId, 'Database Architect');
        $ps2_orbit = $assignStudent($p2Id, $studentOrbitId, 'API Developer');

        // Rate existing tasks
        DB::table('tasks')->where('module_id', 5)->where('title', 'like', '%Database design%')->update(['rating' => 4.90, 'reviewed_by' => $facultyMemberId, 'reviewed_at' => Carbon::now()->subDays(90)]);
        DB::table('tasks')->where('module_id', 5)->where('title', 'like', '%REST API%')->update(['rating' => 4.80, 'reviewed_by' => $facultyMemberId, 'reviewed_at' => Carbon::now()->subDays(85)]);
        DB::table('tasks')->where('module_id', 6)->where('title', 'like', '%Course assignment%')->update(['rating' => 4.70, 'reviewed_by' => $facultyMemberId, 'reviewed_at' => Carbon::now()->subDays(70)]);
        DB::table('tasks')->where('module_id', 6)->where('title', 'like', '%Design UI prototype%')->update(['rating' => 5.00, 'reviewed_by' => $facultyMemberId, 'reviewed_at' => Carbon::now()->subDays(65)]);

        $t10 = DB::table('tasks')->where('module_id', 5)->where('title', 'like', '%Database design%')->value('id');
        $t11 = DB::table('tasks')->where('module_id', 5)->where('title', 'like', '%REST API%')->value('id');
        $t12 = DB::table('tasks')->where('module_id', 6)->where('title', 'like', '%Course assignment%')->value('id');
        $t13 = DB::table('tasks')->where('module_id', 6)->where('title', 'like', '%Design UI prototype%')->value('id');

        if ($t10) $createWorkLog($ps2_nova, $t10, 20.00, 'Formulated MySQL relational tables for syllabus, credits, and electives', 'approved', $facultyMemberId, 4.90, '2026-05-10');
        if ($t11) $createWorkLog($ps2_orbit, $t11, 24.00, 'Built RESTful endpoints with input sanitation and validation rules', 'approved', $facultyMemberId, 4.80, '2026-05-18');
        if ($t12) $createWorkLog($ps2_orbit, $t12, 16.00, 'Automated course capacity limits and prerequisite checks', 'approved', $facultyMemberId, 4.70, '2026-06-05');
        if ($t13) $createWorkLog($ps2_nova, $t13, 15.00, 'Designed interactive faculty-student credit workload visualization', 'approved', $facultyMemberId, 5.00, '2026-06-12');

        // Invoices for P2 (Closed project -> 100% billed and collected)
        $inv2_1 = $createInvoice($pf2Id, 'INV-2026-006', '2026-05-01', '2026-05-15', 45000.00, 18.00, 'Phase 1: Academic Schema Modeling & Course Catalog API', [
            ['description' => 'Curriculum Schema Design & MySQL Index Optimization', 'rate' => 20000.00, 'quantity' => 1, 'amount' => 20000.00],
            ['description' => 'RESTful Course Enrollment APIs & Tests', 'rate' => 25000.00, 'quantity' => 1, 'amount' => 25000.00],
        ]);
        $createClientPayment($inv2_1, 53100.00, '2026-05-14', 'bank_transfer', 'TXN-CMS-001', 'Phase 1 full payment received');

        $inv2_2 = $createInvoice($pf2Id, 'INV-2026-007', '2026-06-15', '2026-06-30', 40000.00, 18.00, 'Phase 2: Final Handover, Course Assignment & System Sign-off', [
            ['description' => 'Automated Faculty Allocation Matrix Engine', 'rate' => 20000.00, 'quantity' => 1, 'amount' => 20000.00],
            ['description' => 'Final QA Audit, Production Deployment & Handover Sign-off', 'rate' => 20000.00, 'quantity' => 1, 'amount' => 20000.00],
        ]);
        $createClientPayment($inv2_2, 47200.00, '2026-06-28', 'bank_transfer', 'TXN-CMS-002', 'Final settlement received');

        // Student Payments (Paid in full)
        // Nova (User #6): (20h + 15h) = 35h * 300 = ₹10,500
        $createStudentPayment($ps2_nova, 'nova', 35.00, $hourlyRate, 10500.00, '2026-06-30');
        // Orbit (User #7): (24h + 16h) = 40h * 300 = ₹12,000
        $createStudentPayment($ps2_orbit, 'orbit', 40.00, $hourlyRate, 12000.00, '2026-06-30');

        // Faculty Payment
        $createFacultyPayment($pfac2, 17000.00, '2026-07-02', 'paid');

        // Maintenance Charge
        $createMaintenanceCharge($pf2Id, 6500.00, '2026-07-01', '2027-06-30', 'Annual Academic CMS System Maintenance & Patch Contract');

        // =========================================================================
        // PROJECT 3: Rajagiri ERP System & Executive Control Panel (ID: 3)
        // =========================================================================
        $p3Id = $projects['Rajagiri ERP System & Executive Control Panel'] ?? 3;
        $pf3Id = $getOrCreateProjectFinance($p3Id, 125000.00);

        // Assign Faculty & Students
        $pfac3 = $assignFaculty($p3Id, $drJosephId);
        $ps3_alex = $assignStudent($p3Id, $alexId, 'Lead Architect');
        $ps3_rhea = $assignStudent($p3Id, $rheaId, 'Backend & Security Dev');
        $ps3_meera = $assignStudent($p3Id, $meeraId, 'Frontend UI Specialist');

        // Create Modules
        $m3_1 = $createModule($p3Id, 'Sprint 1: Executive KPI Panel & Data Aggregation', 35.00, 'completed', 'Executive analytics dashboard for college leadership', $drJosephId);
        $m3_2 = $createModule($p3Id, 'Sprint 2: Multi-Role Authorization & Access Control', 35.00, 'in_progress', 'Granular permission matrix and middleware security', $drJosephId);
        $m3_3 = $createModule($p3Id, 'Sprint 3: Enterprise Audit Trails & Real-Time Security Alerts', 30.00, 'in_progress', 'Immutable audit logging and security event streaming', $drJosephId);

        // Create Tasks
        $t3_1 = $createTask($m3_1, 'Design Director & Coordinator executive KPI cards', 'Interactive metric summary widgets displaying project burn rates and health index', $alexId, 'completed', 4.90, '2026-09-08', $drJosephId, $drJosephId, Carbon::now()->subDays(35));
        $t3_2 = $createTask($m3_1, 'Integrate real-time Chart.js financial trends & burn-rate charts', 'Interactive line & doughnut charts for billing vs expenses', $rheaId, 'completed', 4.80, '2026-09-14', $drJosephId, $drJosephId, Carbon::now()->subDays(30));
        $t3_3 = $createTask($m3_1, 'Export executive summary reports to PDF and spreadsheet formats', 'Automated server-side document rendering for executive board meetings', $meeraId, 'completed', 4.70, '2026-09-20', $drJosephId, $drJosephId, Carbon::now()->subDays(24));

        $t3_4 = $createTask($m3_2, 'Architect fine-grained permissions tree for 6 primary ERP roles', 'Database permission definitions and role hierarchy inheritance', $alexId, 'completed', 5.00, '2026-09-28', $drJosephId, $drJosephId, Carbon::now()->subDays(16));
        $t3_5 = $createTask($m3_2, 'Develop JWT token revocation & session heartbeat middleware', 'Centralized token blacklist in Redis with automatic inactivity timeout', $rheaId, 'in_progress', null, Carbon::now()->addDays(12)->toDateString(), $drJosephId);
        $t3_6 = $createTask($m3_2, 'Build role assignment modal with search & bulk assignment', 'Responsive modal allowing Coordinators to grant temporary permissions', $meeraId, 'todo', null, Carbon::now()->addDays(20)->toDateString(), $drJosephId);

        $t3_7 = $createTask($m3_3, 'Create high-throughput database audit log table with indexing', 'Immutable append-only ledger for all CRUD actions with JSON diff payloads', $alexId, 'completed', 4.85, '2026-10-04', $drJosephId, $drJosephId, Carbon::now()->subDays(10));
        $t3_8 = $createTask($m3_3, 'Implement WebSocket listener for unauthorized permission attempts', 'Live push notification stream for suspicious activity to Director & Coordinator', $rheaId, 'in_progress', null, Carbon::now()->addDays(15)->toDateString(), $drJosephId);
        $t3_9 = $createTask($m3_3, 'Security alert banner and urgent drawer component', 'Dynamic notification drawer highlighting critical security logs', $meeraId, 'rework', 3.80, Carbon::now()->addDays(8)->toDateString(), $drJosephId);

        // Student Work Logs
        $createWorkLog($ps3_alex, $t3_1, 18.00, 'Designed SVG metric cards with responsive breakpoint scaling', 'approved', $drJosephId, 4.90, '2026-09-07');
        $createWorkLog($ps3_rhea, $t3_2, 16.00, 'Integrated Chart.js datasets with reactive Vue state', 'approved', $drJosephId, 4.80, '2026-09-13');
        $createWorkLog($ps3_meera, $t3_3, 14.00, 'Configured DomPDF styling rules for tabular data exports', 'approved', $drJosephId, 4.70, '2026-09-19');
        $createWorkLog($ps3_alex, $t3_4, 20.00, 'Defined role permission matrix with fallback guards in AuthServiceProvider', 'approved', $drJosephId, 5.00, '2026-09-27');
        $createWorkLog($ps3_alex, $t3_7, 12.00, 'Added composite indexes on audit_logs(user_id, created_at, action)', 'approved', $drJosephId, 4.85, '2026-10-03');

        // Invoices for P3
        $inv3_1 = $createInvoice($pf3Id, 'INV-2026-008', '2026-09-01', '2026-09-15', 55000.00, 18.00, 'Milestone 1: Executive KPI Panel & Real-time Charting Suite', [
            ['description' => 'Executive KPI Dashboard Architecture & Multi-device Layout', 'rate' => 30000.00, 'quantity' => 1, 'amount' => 30000.00],
            ['description' => 'Chart.js Analytics Pipeline & Export Document Engine', 'rate' => 25000.00, 'quantity' => 1, 'amount' => 25000.00],
        ]);
        $createClientPayment($inv3_1, 64900.00, '2026-09-14', 'bank_transfer', 'TXN-DIR-8812', 'Payment received from Central Accounts Office');

        // Overdue Invoice
        $createInvoice($pf3Id, 'INV-2026-009', '2026-09-28', '2026-10-12', 45000.00, 18.00, 'Milestone 2: Multi-Role Authorization & Audit Trail Stream', [
            ['description' => 'Role-Based Access Control Middleware & Token Revocation', 'rate' => 25000.00, 'quantity' => 1, 'amount' => 25000.00],
            ['description' => 'Immutable System Audit Logging & WebSocket Security Feeds', 'rate' => 20000.00, 'quantity' => 1, 'amount' => 20000.00],
        ]);

        // Student Payments
        // Alex (User #13): (18h + 20h + 12h) = 50h * 300 = ₹15,000. Paid: ₹10,000 (Partially Paid)
        $createStudentPayment($ps3_alex, 'nova', 50.00, $hourlyRate, 10000.00, '2026-09-30');
        // Rhea (User #14): 16h * 300 = ₹4,800. Paid: ₹4,800 (Paid in full)
        $createStudentPayment($ps3_rhea, 'orbit', 16.00, $hourlyRate, 4800.00, '2026-09-30');
        // Meera (User #16): 14h * 300 = ₹4,200. Paid: ₹3,000 (Partially Paid)
        $createStudentPayment($ps3_meera, 'spark', 14.00, $hourlyRate, 3000.00, '2026-09-30');

        // Faculty Payment
        $createFacultyPayment($pfac3, 10000.00, '2026-09-25', 'paid');

        // Hosting & SSL for P3
        $createHostingCharge($pf3Id, 'hosting', 14000.00, '2026-08-15', '2027-08-15', 'erp.rajagiri.edu', 'Azure Cloud VM B2ms Linux Production Server');
        $createHostingCharge($pf3Id, 'ssl', 3200.00, '2026-08-18', '2027-08-18', 'erp.rajagiri.edu', 'Sectigo PositiveSSL Wildcard Certificate');

        // =========================================================================
        // PROJECT 4: Automated Attendance System via Face Detection (ID: 4) [PROPOSED]
        // =========================================================================
        $p4Id = $projects['Automated Attendance System via Face Detection'] ?? 4;
        $getOrCreateProjectFinance($p4Id, 60000.00);

        $assignFaculty($p4Id, $drAliceId);
        $ps4_karan = $assignStudent($p4Id, $karanId, 'Computer Vision Specialist');
        $ps4_spark = $assignStudent($p4Id, $studentSparkId, 'Edge IoT Engineer');

        $m4_1 = $createModule($p4Id, 'Sprint 1: Model Benchmark & Dataset Pipeline', 50.00, 'not_started', 'Facial recognition model training and accuracy validation', $drAliceId);
        $m4_2 = $createModule($p4Id, 'Sprint 2: Classroom Edge Device Integration', 50.00, 'not_started', 'RTSP stream ingestion and edge hardware deployment', $drAliceId);

        $createTask($m4_1, 'Collect and annotate multi-angle classroom facial dataset', 'Gather 500+ diverse lighting photos across 3 batches with privacy consent', $karanId, 'todo', null, Carbon::now()->addDays(25)->toDateString(), $drAliceId);
        $createTask($m4_1, 'Benchmark InsightFace vs YOLO-Face inference latency on Jetson Nano', 'Profile FPS throughput and RAM usage under continuous RTSP video feed', $studentSparkId, 'todo', null, Carbon::now()->addDays(32)->toDateString(), $drAliceId);
        $createTask($m4_2, 'Design edge synchronization worker for intermittent WiFi connection', 'Local SQLite buffer to sync attendance records to main ERP when network restores', $karanId, 'todo', null, Carbon::now()->addDays(40)->toDateString(), $drAliceId);
        $createTask($m4_2, 'Automated absentees notification pipeline via WhatsApp & SMS API', 'Trigger instant webhook alert to parents if student is absent during Period 1', $studentSparkId, 'todo', null, Carbon::now()->addDays(45)->toDateString(), $drAliceId);

        // =========================================================================
        // PROJECT 5: Smart Lab Inventory & Equipment Tracker (ID: 5)
        // =========================================================================
        $p5Id = $projects['Smart Lab Inventory & Equipment Tracker'] ?? 5;
        $pf5Id = $getOrCreateProjectFinance($p5Id, 80000.00);

        $pfac5 = $assignFaculty($p5Id, $profBobId);
        $ps5_nova = $assignStudent($p5Id, $studentNovaId, 'Embedded Systems Engineer');
        $ps5_orbit = $assignStudent($p5Id, $studentOrbitId, 'Inventory Systems Dev');

        $m5_1 = $createModule($p5Id, 'Sprint 1: Hardware Barcode/RFID Reader Driver', 50.00, 'completed', 'Driver integration for handheld scanners and thermal printers', $profBobId);
        $m5_2 = $createModule($p5Id, 'Sprint 2: Stock Tracking & Automated Audit Ledger', 50.00, 'in_progress', 'Real-time stock balance, reorder points, and maintenance tracking', $profBobId);

        $t5_1 = $createTask($m5_1, 'Integrate Zebra 2D handheld barcode scanner via USB HID', 'Direct keystroke wedge listener with checksum validation for lab components', $studentNovaId, 'completed', 4.75, '2026-08-25', $profBobId, $profBobId, Carbon::now()->subDays(48));
        $t5_2 = $createTask($m5_1, 'Barcode generation & thermal label print spooler service', 'Generate Code128 barcodes and spool print jobs to Zebra thermal printer', $studentOrbitId, 'completed', 4.80, '2026-08-30', $profBobId, $profBobId, Carbon::now()->subDays(42));
        $t5_3 = $createTask($m5_2, 'Develop real-time inventory count reconciler and discrepancy log', 'Automated reconciliation between physical scans and ledger balances', $studentNovaId, 'completed', 4.90, '2026-09-18', $profBobId, $profBobId, Carbon::now()->subDays(26));
        $t5_4 = $createTask($m5_2, 'Implement automatic low-stock email alerts & reorder thresholds', 'Daily cron to evaluate minimum safety stock levels and email lab manager', $studentOrbitId, 'in_progress', null, Carbon::now()->addDays(14)->toDateString(), $profBobId);
        $t5_5 = $createTask($m5_2, 'Equipment calibration check scheduler with technician sign-off', 'Maintenance log tracking annual oscilloscope and multimeter calibration certificates', $studentNovaId, 'todo', null, Carbon::now()->addDays(28)->toDateString(), $profBobId);

        // Work Logs
        $createWorkLog($ps5_nova, $t5_1, 18.00, 'Tested Zebra scanner with serial and USB modes across 200 components', 'approved', $profBobId, 4.75, '2026-08-24');
        $createWorkLog($ps5_orbit, $t5_2, 20.00, 'Integrated ESC/POS commands and calibrated label paper dimensions', 'approved', $profBobId, 4.80, '2026-08-29');
        $createWorkLog($ps5_nova, $t5_3, 16.00, 'Implemented conflict resolution algorithm for duplicate concurrent scans', 'approved', $profBobId, 4.90, '2026-09-17');

        // Invoices for P5
        $inv5_1 = $createInvoice($pf5Id, 'INV-2026-010', '2026-08-15', '2026-08-30', 40000.00, 18.00, 'Phase 1: Hardware Barcode Scanner Driver & Label Printing Hub', [
            ['description' => 'USB HID Scanner Driver & Device Listener', 'rate' => 20000.00, 'quantity' => 1, 'amount' => 20000.00],
            ['description' => 'Thermal Print Spooler & Barcode Generation Suite', 'rate' => 20000.00, 'quantity' => 1, 'amount' => 20000.00],
        ]);
        $createClientPayment($inv5_1, 47200.00, '2026-08-28', 'bank_transfer', 'TXN-LAB-4401', 'Settlement from Hardware Maintenance Division');

        $inv5_2 = $createInvoice($pf5Id, 'INV-2026-011', '2026-10-05', '2026-10-25', 25000.00, 18.00, 'Phase 2: Stock Discrepancy Ledger & Reorder Engine', [
            ['description' => 'Real-time Stock Discrepancy Engine & Inventory Audit Log', 'rate' => 15000.00, 'quantity' => 1, 'amount' => 15000.00],
            ['description' => 'Automated Low-Stock Threshold Notification Service', 'rate' => 10000.00, 'quantity' => 1, 'amount' => 10000.00],
        ]);
        $createClientPayment($inv5_2, 15000.00, '2026-10-12', 'upi', 'UPI-LAB-774411', 'Advance payment for Phase 2');

        // Student Payments
        // Nova (User #6): (18h + 16h) = 34h * 300 = ₹10,200. Paid: ₹7,500 (Partially Paid)
        $createStudentPayment($ps5_nova, 'nova', 34.00, $hourlyRate, 7500.00, '2026-09-10');
        // Orbit (User #7): 20h * 300 = ₹6,000. Paid: ₹6,000 (Paid in full)
        $createStudentPayment($ps5_orbit, 'orbit', 20.00, $hourlyRate, 6000.00, '2026-09-10');

        // Faculty Payment
        $createFacultyPayment($pfac5, 8000.00, '2026-09-02', 'paid');

        // Hosting
        $createHostingCharge($pf5Id, 'hosting', 5500.00, '2026-08-01', '2027-08-01', 'labinventory.rajagiri.edu', 'DigitalOcean Managed Postgres Database Instance');

        // =========================================================================
        // PROJECT 6: Alumni Network & Career Mentorship Portal (ID: 6) [ACCEPTED]
        // =========================================================================
        $p6Id = $projects['Alumni Network & Career Mentorship Portal'] ?? 6;
        $pf6Id = $getOrCreateProjectFinance($p6Id, 95000.00);

        $pfac6 = $assignFaculty($p6Id, $profAnitaId);
        $ps6_rhea = $assignStudent($p6Id, $rheaId, 'Frontend Lead');
        $ps6_meera = $assignStudent($p6Id, $meeraId, 'Full Stack Dev');

        $m6_1 = $createModule($p6Id, 'Sprint 1: Alumni Verification & Social Profile Sync', 50.00, 'completed', 'Alumni verification onboarding and LinkedIn OAuth integration', $profAnitaId);
        $m6_2 = $createModule($p6Id, 'Sprint 2: Mentorship Scheduling & Career Job Board', 50.00, 'in_progress', '1-on-1 career mentorship booking and referral board', $profAnitaId);

        $t6_1 = $createTask($m6_1, 'Design Alumni self-service onboarding & degree verification form', 'Multi-step onboarding form validating register numbers against graduation archives', $rheaId, 'completed', 4.85, '2026-09-12', $profAnitaId, $profAnitaId, Carbon::now()->subDays(32));
        $t6_2 = $createTask($m6_1, 'Integrate LinkedIn OAuth2 and professional experience sync', 'Fetch current employer, designation, and skills directly into alumni profile', $meeraId, 'completed', 4.90, '2026-09-20', $profAnitaId, $profAnitaId, Carbon::now()->subDays(24));
        $t6_3 = $createTask($m6_2, 'Build 1-on-1 career mentorship booking engine with Google Meet link', 'Calendar slot picker with automated Google Meet video conference link injection', $rheaId, 'in_progress', null, Carbon::now()->addDays(18)->toDateString(), $profAnitaId);
        $t6_4 = $createTask($m6_2, 'Alumni job referral bulletin wall with resume parse filter', 'Interactive job referral board with candidate PDF resume extraction', $meeraId, 'todo', null, Carbon::now()->addDays(28)->toDateString(), $profAnitaId);

        // Work Logs
        $createWorkLog($ps6_rhea, $t6_1, 20.00, 'Implemented multi-step verification form with animated transitions', 'approved', $profAnitaId, 4.85, '2026-09-11');
        $createWorkLog($ps6_meera, $t6_2, 16.00, 'Configured LinkedIn v2 API scopes and access token auto-refresh', 'approved', $profAnitaId, 4.90, '2026-09-19');

        // Invoices for P6
        $inv6_1 = $createInvoice($pf6Id, 'INV-2026-012', '2026-09-05', '2026-09-20', 45000.00, 18.00, 'Phase 1: Alumni Verification Engine & LinkedIn Sync', [
            ['description' => 'Degree Verification Engine & Archive Matcher', 'rate' => 25000.00, 'quantity' => 1, 'amount' => 25000.00],
            ['description' => 'LinkedIn OAuth2 Integration & Profile Sync', 'rate' => 20000.00, 'quantity' => 1, 'amount' => 20000.00],
        ]);
        $createClientPayment($inv6_1, 53100.00, '2026-09-18', 'bank_transfer', 'TXN-ALUMNI-909', 'Alumni Council fund disbursement');

        // Pending Invoice
        $createInvoice($pf6Id, 'INV-2026-013', '2026-10-08', '2026-10-22', 30000.00, 18.00, 'Phase 2: Mentorship Calendar & Job Referral Wall', [
            ['description' => '1-on-1 Mentorship Booking & Calendar Automation', 'rate' => 15000.00, 'quantity' => 1, 'amount' => 15000.00],
            ['description' => 'Job Board & Resume Parser Integration', 'rate' => 15000.00, 'quantity' => 1, 'amount' => 15000.00],
        ]);

        // Student Payments
        // Rhea (User #14): 20h * 300 = ₹6,000. Paid: ₹5,000 (Partially Paid)
        $createStudentPayment($ps6_rhea, 'orbit', 20.00, $hourlyRate, 5000.00, '2026-09-30');
        // Meera (User #16): 16h * 300 = ₹4,800. Paid: ₹4,800 (Paid in full)
        $createStudentPayment($ps6_meera, 'spark', 16.00, $hourlyRate, 4800.00, '2026-09-30');

        // Faculty Payment
        $createFacultyPayment($pfac6, 8500.00, '2026-09-25', 'paid');

        // Hosting & SSL (Expiring in 20 days so it triggers the dashboard expiry badge!)
        $createHostingCharge($pf6Id, 'ssl', 2200.00, '2025-11-04', Carbon::now()->addDays(20)->toDateString(), 'alumni.rajagiri.edu', 'Comodo Essential SSL Certificate (Expiring Soon)');
        $createMaintenanceCharge($pf6Id, 3800.00, '2026-09-01', '2027-03-01', 'Transactional Email SMTP Delivery & Domain Whitelabeling Maintenance');

        // =========================================================================
        // PROJECT 7: Library RFID Automation & E-Resource Access Hub (ID: 7) [PROPOSED]
        // =========================================================================
        $p7Id = $projects['Library RFID Automation & E-Resource Access Hub'] ?? 7;
        $getOrCreateProjectFinance($p7Id, 110000.00);

        $assignFaculty($p7Id, $drJosephId);
        $ps7_alex = $assignStudent($p7Id, $alexId, 'Hardware Systems Architect');
        $ps7_karan = $assignStudent($p7Id, $karanId, 'Backend Integrator');

        $m7_1 = $createModule($p7Id, 'Sprint 1: RFID Gate Reader TCP/IP Protocol Layer', 50.00, 'not_started', 'Socket listeners and hardware controller firmware', $drJosephId);
        $m7_2 = $createModule($p7Id, 'Sprint 2: Federated E-Journal Search Indexing', 50.00, 'not_started', 'Aggregated academic search across IEEE, Springer, and local DSpace', $drJosephId);

        $createTask($m7_1, 'Setup TCP socket server to ingest RFID tag EPC packets', 'Multi-threaded socket server handling concurrent gate walk-through antenna bursts', $alexId, 'todo', null, Carbon::now()->addDays(30)->toDateString(), $drJosephId);
        $createTask($m7_1, 'Koha ILS SIP2 checkout and checkin command pipeline', 'Automated circulation check against Koha database over SIP2 standard protocol', $karanId, 'todo', null, Carbon::now()->addDays(38)->toDateString(), $drJosephId);
        $createTask($m7_2, 'Federated query proxy for IEEE Xplore, ScienceDirect, and Springer', 'Unified REST endpoint mapping DOI lookups and PDF download authorizations', $alexId, 'todo', null, Carbon::now()->addDays(48)->toDateString(), $drJosephId);
        $createTask($m7_2, 'Patron self-service touch screen kiosk and penalty fine calculator', 'Touchscreen UI with barcode student ID scanner and overdue fine calculator', $karanId, 'todo', null, Carbon::now()->addDays(55)->toDateString(), $drJosephId);

        // =========================================================================
        // PROJECT 8: Smart Campus IoT System (ID: 8)
        // =========================================================================
        $p8Id = $projects['Smart Campus IoT System'] ?? 8;
        $pf8Id = $getOrCreateProjectFinance($p8Id, 75000.00);

        // Assign additional student or tasks
        $ps8_alex = $assignStudent($p8Id, $alexId, 'IoT Firmware Specialist');
        $ps8_rhea = $assignStudent($p8Id, $rheaId, 'Cloud Gateway Integrator');

        $m8_3 = $createModule($p8Id, 'Sprint 3: Edge Gateway & MQTT Security Hardening', 25.00, 'in_progress', 'Mutual TLS certificates and sensor dropout watchdogs', $drJosephId);

        $t8_5 = $createTask($m8_3, 'Mutual TLS authentication on Mosquitto broker', 'Configure X.509 client certificates on ESP32 nodes and SSL termination', $alexId, 'completed', 4.90, '2026-10-02', $drJosephId, $drJosephId, Carbon::now()->subDays(12));
        $t8_6 = $createTask($m8_3, 'Automated sensor dropout alert bot on Telegram', 'Watchdog polling sensor heartbeat and alerting technician if node goes offline', $rheaId, 'in_progress', null, Carbon::now()->addDays(10)->toDateString(), $drJosephId);

        $createWorkLog($ps8_alex, $t8_5, 12.00, 'Generated root CA and signed individual device certificates for 15 nodes', 'approved', $drJosephId, 4.90, '2026-10-01');

        // Additional Invoice for P8
        $inv8_2 = $createInvoice($pf8Id, 'INV-2026-014', '2026-09-20', '2026-10-10', 35000.00, 18.00, 'Phase 2: Sensor Health Alerts & Mutual TLS Gateway', [
            ['description' => 'Mosquitto Broker Mutual TLS Security Architecture', 'rate' => 18000.00, 'quantity' => 1, 'amount' => 18000.00],
            ['description' => 'Real-time Telemetry Charts & Dropout Watchdog Bot', 'rate' => 17000.00, 'quantity' => 1, 'amount' => 17000.00],
        ]);
        $createClientPayment($inv8_2, 41300.00, '2026-10-08', 'bank_transfer', 'TXN-IOT-9922', 'Phase 2 milestone payment received');

        // Additional Student Payment for Alex on P8
        $createStudentPayment($ps8_alex, 'nova', 12.00, $hourlyRate, 3600.00, '2026-10-05');

        // Maintenance Charge
        $createMaintenanceCharge($pf8Id, 6000.00, '2026-07-01', '2027-01-01', 'IoT Sensor Hardware Calibration & Gateway Firmware Support');

        // =========================================================================
        // PROJECT 9: Campus ERP Mobile Application (ID: 9)
        // =========================================================================
        $p9Id = $projects['Campus ERP Mobile Application'] ?? 9;
        $pf9Id = $getOrCreateProjectFinance($p9Id, 95000.00);

        $pfac9 = $assignFaculty($p9Id, $profAnitaId);
        $ps9_karan = $assignStudent($p9Id, $karanId, 'Mobile Lead');
        $ps9_meera = $assignStudent($p9Id, $meeraId, 'Mobile UI/UX Dev');

        $m9_3 = $createModule($p9Id, 'Sprint 3: Offline SQLite Cache & Background Push Sync', 25.00, 'in_progress', 'Local offline database caching and push notification worker', $profAnitaId);

        $t9_5 = $createTask($m9_3, 'Local SQLite database synchronization engine', 'Bidirectional sync queue storing attendance and grades offline until network returns', $karanId, 'completed', 4.80, '2026-10-01', $profAnitaId, $profAnitaId, Carbon::now()->subDays(13));
        $t9_6 = $createTask($m9_3, 'Background push notifications via FCM for attendance updates', 'Silent FCM data messages updating student attendance status in app drawer', $meeraId, 'in_progress', null, Carbon::now()->addDays(14)->toDateString(), $profAnitaId);

        $createWorkLog($ps9_karan, $t9_5, 14.00, 'Implemented SQLite conflict resolution and background sync worker on Android', 'approved', $profAnitaId, 4.80, '2026-09-30');

        // Additional Invoice for P9 (Partially paid)
        $inv9_2 = $createInvoice($pf9Id, 'INV-2026-015', '2026-10-01', '2026-10-20', 35000.00, 18.00, 'Phase 2: Design Tokens, Settings Drawer & Offline SQLite Sync', [
            ['description' => 'Mobile Design Tokens & Notification Preference Drawer', 'rate' => 15000.00, 'quantity' => 1, 'amount' => 15000.00],
            ['description' => 'Offline SQLite Local Database & Sync Queue Engine', 'rate' => 20000.00, 'quantity' => 1, 'amount' => 20000.00],
        ]);
        $createClientPayment($inv9_2, 20000.00, '2026-10-10', 'bank_transfer', 'TXN-MOB-332', 'Part payment received for Phase 2');

        // Faculty Payment for P9
        $createFacultyPayment($pfac9, 7000.00, '2026-10-05', 'paid');

        // Additional Student Payment for Karan
        $createStudentPayment($ps9_karan, 'orbit', 14.00, $hourlyRate, 4200.00, '2026-10-12');

        // Operational Costs
        $createHostingCharge($pf9Id, 'hosting', 9800.00, '2026-06-01', '2027-06-01', 'app.mits.edu.in', 'Apple Developer Program & Google Play Console Enterprise Deployment');

        // =========================================================================
        // PROJECT 10: Automated Library Kiosk System (ID: 10) [CLOSED]
        // =========================================================================
        $p10Id = $projects['Automated Library Kiosk System'] ?? 10;
        $pf10Id = $getOrCreateProjectFinance($p10Id, 45000.00);

        // Hosting & Maintenance
        $createHostingCharge($pf10Id, 'hosting', 4500.00, '2026-01-15', '2027-01-15', 'librarykiosk.rajagiri.edu', 'Kiosk Database Sync & Central Cloud Relay Service');
        $createMaintenanceCharge($pf10Id, 4000.00, '2026-07-01', '2027-01-01', 'Post-Handover Hardware Support & Receipt Printer Servicing');

        // Re-evaluate SSL notifications to ensure urgent alert is created for the expiring SSL cert
        try {
            $financeService = app(\Modules\Finance\Services\FinanceService::class);
            $financeService->syncSslExpiryNotifications();
        } catch (\Throwable $e) {
            // Ignore if notification table has different requirements
        }

        echo "Successfully seeded dummy finance and task data across all existing projects!\n";
    }
}
