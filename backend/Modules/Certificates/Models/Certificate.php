<?php

namespace Modules\Certificates\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;
use Modules\Auth\Models\User;
use Modules\Project\Models\Project;
use Modules\Project\Models\Module;

class Certificate extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'project_id',
        'module_id',
        'student_id',
        'certificate_number',
        'description',
        'issue_date',
        'certificate_file',
        'issued_by',
    ];

    protected $casts = [
        'issue_date' => 'date',
    ];

    // Computed, not stored — always appended to JSON so every existing
    // response (index/show/myCertificates/studentCertificates) picks these
    // up automatically with no controller changes needed.
    protected $appends = ['team_members', 'developer_name'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function module()
    {
        return $this->belongsTo(Module::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function issuer()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    /**
     * The real project team this certificate's student worked under — every
     * student assigned to the project (project_student) plus, when this
     * certificate is tied to a specific module, every student assigned to
     * that module (module_student). This mirrors the exact "team" computation
     * StudentController already uses elsewhere in this app (project_student +
     * module_student, deduplicated) — there is no separate "team name" table
     * or column anywhere in the schema, so a named list of real teammates is
     * the actual, non-invented team data available.
     */
    public function getTeamMembersAttribute(): array
    {
        if (!$this->project_id) {
            return [];
        }

        $projectStudents = DB::table('project_student')
            ->join('users', 'users.id', '=', 'project_student.student_id')
            ->where('project_student.project_id', $this->project_id)
            ->select('users.id', 'users.name');

        $members = $projectStudents->get();

        if ($this->module_id) {
            $moduleStudents = DB::table('module_student')
                ->join('users', 'users.id', '=', 'module_student.student_id')
                ->where('module_student.module_id', $this->module_id)
                ->select('users.id', 'users.name')
                ->get();
            $members = $members->concat($moduleStudents);
        }

        return $members->unique('id')->pluck('name')->values()->all();
    }

    /**
     * The real person this app's own data identifies as "the Developer" on
     * this certificate's project — specifically, the certificate's own
     * recipient, but ONLY if project_student.role actually records them as
     * 'developer' on that project. There is no other developer-identity field
     * anywhere (module_student has no role column, and attributing a
     * different teammate's name to this student's own certificate would
     * misrepresent whose certificate it is). If the recipient's real recorded
     * role isn't 'developer' (or no project_student row exists for them),
     * this returns null rather than guessing — the template must show that
     * field as empty, not fabricate a name.
     */
    public function getDeveloperNameAttribute(): ?string
    {
        if (!$this->project_id || !$this->student_id) {
            return null;
        }

        $role = DB::table('project_student')
            ->where('project_id', $this->project_id)
            ->where('student_id', $this->student_id)
            ->value('role');

        if ($role !== 'developer') {
            return null;
        }

        return $this->student->name ?? null;
    }
}
