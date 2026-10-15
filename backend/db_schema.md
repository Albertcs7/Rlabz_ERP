# Database Schema

## Table: `audit_logs`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `user_id` | bigint unsigned | NO | MUL | NULL |  |
| `action` | varchar(100) | NO |  | NULL |  |
| `description` | text | YES |  | NULL |  |
| `created_at` | timestamp | NO |  | NULL |  |

**Foreign Keys:**
- `user_id` references `users`.`id` (Constraint: `audit_logs_user_id_foreign`)

---

## Table: `certificates`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | MUL | NULL |  |
| `module_id` | bigint unsigned | YES | MUL | NULL |  |
| `student_id` | bigint unsigned | NO | MUL | NULL |  |
| `certificate_number` | varchar(50) | NO | UNI | NULL |  |
| `description` | text | NO |  | NULL |  |
| `issue_date` | date | NO |  | NULL |  |
| `certificate_file` | varchar(500) | YES |  | NULL |  |
| `issued_by` | bigint unsigned | NO | MUL | NULL |  |

**Foreign Keys:**
- `issued_by` references `users`.`id` (Constraint: `certificates_issued_by_foreign`)
- `module_id` references `modules`.`id` (Constraint: `certificates_module_id_foreign`)
- `project_id` references `projects`.`id` (Constraint: `certificates_project_id_foreign`)
- `student_id` references `users`.`id` (Constraint: `certificates_student_id_foreign`)

---

## Table: `chat_messages`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `chat_id` | bigint unsigned | NO | MUL | NULL |  |
| `sender_id` | bigint unsigned | NO | MUL | NULL |  |
| `message` | text | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `chat_id` references `chats`.`id` (Constraint: `chat_messages_chat_id_foreign`)
- `sender_id` references `users`.`id` (Constraint: `chat_messages_sender_id_foreign`)

---

## Table: `chat_participants`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `chat_id` | bigint unsigned | NO | MUL | NULL |  |
| `user_id` | bigint unsigned | NO | MUL | NULL |  |
| `joined_at` | timestamp | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `chat_id` references `chats`.`id` (Constraint: `chat_participants_chat_id_foreign`)
- `user_id` references `users`.`id` (Constraint: `chat_participants_user_id_foreign`)

---

## Table: `chats`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | MUL | NULL |  |
| `title` | varchar(255) | YES |  | NULL |  |
| `created_by` | bigint unsigned | NO | MUL | NULL |  |
| `is_active` | tinyint(1) | NO |  | 1 |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `created_by` references `users`.`id` (Constraint: `chats_created_by_foreign`)
- `project_id` references `projects`.`id` (Constraint: `chats_project_id_foreign`)

---

## Table: `client_payments`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `invoice_id` | bigint unsigned | YES | MUL | NULL |  |
| `project_finance_id` | bigint unsigned | YES | MUL | NULL |  |
| `amount` | decimal(12,2) | NO |  | NULL |  |
| `payment_date` | date | YES |  | NULL |  |
| `payment_method` | varchar(50) | YES |  | NULL |  |
| `payment_type` | enum('advance','partial','full') | YES |  | NULL |  |
| `payment_reference` | varchar(255) | YES |  | NULL |  |
| `status` | enum('pending','received','failed') | YES |  | NULL |  |
| `remarks` | text | YES |  | NULL |  |
| `recorded_by` | bigint unsigned | NO | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `invoice_id` references `invoices`.`id` (Constraint: `client_payments_invoice_id_foreign`)
- `project_finance_id` references `project_finances`.`id` (Constraint: `client_payments_project_finance_id_foreign`)
- `recorded_by` references `users`.`id` (Constraint: `client_payments_recorded_by_foreign`)

---

## Table: `client_requirements`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | YES | MUL | NULL |  |
| `title` | varchar(191) | NO |  | NULL |  |
| `description` | text | NO |  | NULL |  |
| `status` | varchar(191) | NO |  | new |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_id` references `projects`.`id` (Constraint: `client_requirements_project_id_foreign`)

---

## Table: `design_assets`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `title` | varchar(191) | NO |  | NULL |  |
| `project_id` | bigint unsigned | YES | MUL | NULL |  |
| `campaign` | varchar(191) | YES |  | NULL |  |
| `brand_kit_name` | varchar(150) | YES |  | RLabZ Core Platform |  |
| `division` | varchar(100) | YES |  | NULL |  |
| `work_type` | varchar(50) | NO |  | NULL |  |
| `source_ticket_id` | bigint unsigned | YES | MUL | NULL |  |
| `designer_id` | bigint unsigned | YES | MUL | NULL |  |
| `preview_url` | varchar(191) | YES |  | NULL |  |
| `deliverable_url` | varchar(191) | YES |  | NULL |  |
| `source_file_url` | varchar(191) | YES |  | NULL |  |
| `packaged_formats` | json | YES |  | NULL |  |
| `tags` | json | YES |  | NULL |  |
| `usage_count` | int unsigned | NO |  | 0 |  |
| `metadata` | json | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `designer_id` references `users`.`id` (Constraint: `design_assets_designer_id_foreign`)
- `project_id` references `projects`.`id` (Constraint: `design_assets_project_id_foreign`)
- `source_ticket_id` references `design_tickets`.`id` (Constraint: `design_assets_source_ticket_id_foreign`)

---

## Table: `design_audit_logs`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `ticket_id` | bigint unsigned | YES | MUL | NULL |  |
| `user_id` | bigint unsigned | NO | MUL | NULL |  |
| `action` | varchar(100) | NO |  | NULL |  |
| `previous_value` | text | YES |  | NULL |  |
| `new_value` | text | YES |  | NULL |  |
| `reason` | text | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `ticket_id` references `design_tickets`.`id` (Constraint: `design_audit_logs_ticket_id_foreign`)
- `user_id` references `users`.`id` (Constraint: `design_audit_logs_user_id_foreign`)

---

## Table: `design_brand_kits`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `slug` | varchar(100) | NO | UNI | NULL |  |
| `name` | varchar(150) | NO |  | NULL |  |
| `description` | text | YES |  | NULL |  |
| `applicable_entity` | varchar(150) | YES |  | NULL |  |
| `institution_or_client` | varchar(150) | YES |  | NULL |  |
| `associated_projects` | json | YES |  | NULL |  |
| `branding_portal_url` | varchar(255) | YES |  | NULL |  |
| `logo_url` | varchar(255) | YES |  | NULL |  |
| `brand_colors` | json | YES |  | NULL |  |
| `typography` | json | YES |  | NULL |  |
| `guidelines` | json | YES |  | NULL |  |
| `downloadable_kits` | json | YES |  | NULL |  |
| `is_active` | tinyint(1) | NO |  | 1 |  |
| `created_by` | bigint unsigned | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

---

## Table: `design_comments`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `ticket_id` | bigint unsigned | NO | MUL | NULL |  |
| `version_id` | bigint unsigned | YES | MUL | NULL |  |
| `user_id` | bigint unsigned | NO | MUL | NULL |  |
| `parent_id` | bigint unsigned | YES |  | NULL |  |
| `comment` | text | NO |  | NULL |  |
| `status` | enum('open','resolved') | NO |  | open |  |
| `resolved_by` | bigint unsigned | YES |  | NULL |  |
| `resolved_at` | datetime | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `ticket_id` references `design_tickets`.`id` (Constraint: `design_comments_ticket_id_foreign`)
- `user_id` references `users`.`id` (Constraint: `design_comments_user_id_foreign`)
- `version_id` references `design_versions`.`id` (Constraint: `design_comments_version_id_foreign`)

---

## Table: `design_notifications`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `ticket_id` | bigint unsigned | YES | MUL | NULL |  |
| `user_id` | bigint unsigned | NO | MUL | NULL |  |
| `event` | varchar(100) | NO |  | NULL |  |
| `title` | varchar(191) | NO |  | NULL |  |
| `message` | text | NO |  | NULL |  |
| `channel` | varchar(50) | NO |  | in-app |  |
| `is_read` | tinyint(1) | NO |  | 0 |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `ticket_id` references `design_tickets`.`id` (Constraint: `design_notifications_ticket_id_foreign`)
- `user_id` references `users`.`id` (Constraint: `design_notifications_user_id_foreign`)

---

## Table: `design_tickets`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `ticket_number` | varchar(50) | NO | UNI | NULL |  |
| `work_type` | varchar(50) | NO |  | NULL |  |
| `project_id` | bigint unsigned | YES | MUL | NULL |  |
| `title` | varchar(191) | NO |  | NULL |  |
| `purpose` | text | YES |  | NULL |  |
| `requester_id` | bigint unsigned | NO | MUL | NULL |  |
| `requesting_division` | varchar(100) | NO |  | NULL |  |
| `target_audience` | varchar(191) | YES |  | NULL |  |
| `publishing_channel` | varchar(191) | YES |  | NULL |  |
| `required_by` | datetime | NO |  | NULL |  |
| `committed_delivery_date` | datetime | YES |  | NULL |  |
| `priority` | enum('normal','high','urgent') | NO |  | normal |  |
| `final_copy` | longtext | YES |  | NULL |  |
| `reference_links` | text | YES |  | NULL |  |
| `attachments` | json | YES |  | NULL |  |
| `brand_constraints` | text | YES |  | NULL |  |
| `brand_kit_name` | varchar(150) | YES |  | RLabZ Core Platform |  |
| `type_specific_fields` | json | YES |  | NULL |  |
| `status` | varchar(30) | NO |  | New |  |
| `ball_is_with` | varchar(50) | NO |  | Design Lead |  |
| `assigned_to` | bigint unsigned | YES | MUL | NULL |  |
| `collaborators` | json | YES |  | NULL |  |
| `estimated_hours` | decimal(6,2) | NO |  | 0.00 |  |
| `actual_hours_logged` | decimal(6,2) | NO |  | 0.00 |  |
| `on_hold_reason` | text | YES |  | NULL |  |
| `cancellation_reason` | text | YES |  | NULL |  |
| `revision_count` | int unsigned | NO |  | 0 |  |
| `current_version_id` | bigint unsigned | YES |  | NULL |  |
| `approved_by` | bigint unsigned | YES |  | NULL |  |
| `approved_at` | datetime | YES |  | NULL |  |
| `second_level_approved_by` | bigint unsigned | YES |  | NULL |  |
| `second_level_approved_at` | datetime | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `assigned_to` references `users`.`id` (Constraint: `design_tickets_assigned_to_foreign`)
- `project_id` references `projects`.`id` (Constraint: `design_tickets_project_id_foreign`)
- `requester_id` references `users`.`id` (Constraint: `design_tickets_requester_id_foreign`)

---

## Table: `design_user_profiles`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `user_id` | bigint unsigned | NO | UNI | NULL |  |
| `division` | varchar(100) | NO |  | Design |  |
| `skill_tags` | json | YES |  | NULL |  |
| `weekly_capacity_hours` | int unsigned | NO |  | 20 |  |
| `is_active` | tinyint(1) | NO |  | 1 |  |
| `notification_preferences` | json | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `user_id` references `users`.`id` (Constraint: `design_user_profiles_user_id_foreign`)

---

## Table: `design_versions`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `ticket_id` | bigint unsigned | NO | MUL | NULL |  |
| `version_number` | int unsigned | NO |  | NULL |  |
| `uploader_id` | bigint unsigned | NO | MUL | NULL |  |
| `file_url` | varchar(191) | NO |  | NULL |  |
| `file_name` | varchar(191) | YES |  | NULL |  |
| `file_type` | varchar(50) | NO |  | image |  |
| `file_size_kb` | bigint unsigned | NO |  | 0 |  |
| `change_notes` | text | YES |  | NULL |  |
| `is_current` | tinyint(1) | NO |  | 1 |  |
| `is_approved` | tinyint(1) | NO |  | 0 |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `ticket_id` references `design_tickets`.`id` (Constraint: `design_versions_ticket_id_foreign`)
- `uploader_id` references `users`.`id` (Constraint: `design_versions_uploader_id_foreign`)

---

## Table: `development_allocations`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_finance_id` | bigint unsigned | NO | MUL | NULL |  |
| `category` | enum('student','faculty','rlabz') | YES |  | NULL |  |
| `recipient_type` | enum('student','faculty','rlabz') | YES |  | NULL |  |
| `recipient_id` | bigint unsigned | YES | MUL | NULL |  |
| `amount` | decimal(12,2) | NO |  | NULL |  |
| `remarks` | text | YES |  | NULL |  |
| `created_by` | bigint unsigned | YES | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_finance_id` references `project_finances`.`id` (Constraint: `development_allocations_project_finance_id_foreign`)

---

## Table: `faculty_payments`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_faculty_id` | bigint unsigned | NO | MUL | NULL |  |
| `project_finance_id` | bigint unsigned | YES | MUL | NULL |  |
| `faculty_id` | bigint unsigned | YES | MUL | NULL |  |
| `amount` | decimal(12,2) | NO |  | NULL |  |
| `status` | enum('calculated','approved','processing','paid','failed') | YES |  | paid |  |
| `payment_date` | date | YES |  | NULL |  |
| `payment_method` | varchar(50) | YES |  | NULL |  |
| `payment_reference` | varchar(255) | YES |  | NULL |  |
| `remarks` | text | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_faculty_id` references `project_faculty`.`id` (Constraint: `faculty_payments_project_faculty_id_foreign`)

---

## Table: `faculty_profiles`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `faculty_id` | bigint unsigned | NO | UNI | NULL |  |
| `department` | varchar(150) | NO |  | NULL |  |
| `designation` | varchar(100) | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `faculty_id` references `users`.`id` (Constraint: `faculty_profiles_faculty_id_foreign`)

---

## Table: `feedback`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | MUL | NULL |  |
| `faculty_id` | bigint unsigned | NO | MUL | NULL |  |
| `student_id` | bigint unsigned | NO | MUL | NULL |  |
| `comments` | text | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `faculty_id` references `users`.`id` (Constraint: `feedback_faculty_id_foreign`)
- `project_id` references `projects`.`id` (Constraint: `feedback_project_id_foreign`)
- `student_id` references `users`.`id` (Constraint: `feedback_student_id_foreign`)

---

## Table: `final_project_documents`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | UNI | NULL |  |
| `final_report` | varchar(500) | YES |  | NULL |  |
| `code_handover` | varchar(500) | YES |  | NULL |  |
| `closure_notes` | text | YES |  | NULL |  |
| `uploaded_on` | datetime | NO |  | NULL |  |

**Foreign Keys:**
- `project_id` references `projects`.`id` (Constraint: `final_project_documents_project_id_foreign`)

---

## Table: `finance_settings`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `student_hourly_rate` | decimal(10,2) | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

---

## Table: `github_repositories`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | MUL | NULL |  |
| `student_id` | bigint unsigned | YES | MUL | NULL |  |
| `link_type` | enum('main','branch') | NO |  | main |  |
| `repository_name` | varchar(255) | NO |  | NULL |  |
| `branch_name` | varchar(255) | YES |  | NULL |  |
| `repository_url` | varchar(500) | NO |  | NULL |  |
| `branch_url` | varchar(500) | YES |  | NULL |  |
| `submitted_date` | date | NO |  | NULL |  |
| `is_verified` | tinyint(1) | NO |  | 0 |  |
| `verified_by` | bigint unsigned | YES | MUL | NULL |  |
| `verified_at` | timestamp | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_id` references `projects`.`id` (Constraint: `github_repositories_project_id_foreign`)
- `student_id` references `users`.`id` (Constraint: `github_repositories_student_id_foreign`)
- `verified_by` references `users`.`id` (Constraint: `github_repositories_verified_by_foreign`)

---

## Table: `hosting_charges`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_finance_id` | bigint unsigned | NO | MUL | NULL |  |
| `charge_type` | enum('ssl','domain','api','hosting') | NO |  | NULL |  |
| `amount` | decimal(12,2) | NO |  | NULL |  |
| `purchase_date` | date | YES |  | NULL |  |
| `expiry_date` | date | YES |  | NULL |  |
| `domain_name` | varchar(191) | YES |  | NULL |  |
| `reference_details` | text | YES |  | NULL |  |
| `name_or_reference` | varchar(255) | YES |  | NULL |  |
| `description` | text | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_finance_id` references `project_finances`.`id` (Constraint: `hosting_charges_project_finance_id_foreign`)

---

## Table: `invoice_items`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `invoice_id` | bigint unsigned | NO | MUL | NULL |  |
| `description` | varchar(191) | NO |  | NULL |  |
| `rate` | decimal(12,2) | NO |  | NULL |  |
| `quantity` | int | NO |  | 1 |  |
| `amount` | decimal(12,2) | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `invoice_id` references `invoices`.`id` (Constraint: `invoice_items_invoice_id_foreign`)

---

## Table: `invoices`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_finance_id` | bigint unsigned | NO | MUL | NULL |  |
| `invoice_number` | varchar(191) | NO | UNI | NULL |  |
| `invoice_date` | date | NO |  | NULL |  |
| `due_date` | date | YES |  | NULL |  |
| `amount_before_gst` | decimal(12,2) | NO |  | NULL |  |
| `gst_percentage` | decimal(5,2) | NO |  | 18.00 |  |
| `description` | text | YES |  | NULL |  |
| `created_by` | bigint unsigned | NO | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `created_by` references `users`.`id` (Constraint: `invoices_created_by_foreign`)
- `project_finance_id` references `project_finances`.`id` (Constraint: `invoices_project_finance_id_foreign`)

---

## Table: `maintenance_support_charges`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_finance_id` | bigint unsigned | NO | MUL | NULL |  |
| `amount` | decimal(12,2) | NO |  | NULL |  |
| `start_date` | date | YES |  | NULL |  |
| `end_date` | date | YES |  | NULL |  |
| `description` | text | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_finance_id` references `project_finances`.`id` (Constraint: `maintenance_support_charges_project_finance_id_foreign`)

---

## Table: `marketing_expenses`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_finance_id` | bigint unsigned | NO | MUL | NULL |  |
| `title` | varchar(191) | NO |  | NULL |  |
| `category` | varchar(191) | NO |  | other |  |
| `amount` | decimal(12,2) | NO |  | NULL |  |
| `expense_date` | date | NO |  | NULL |  |
| `vendor` | varchar(191) | YES |  | NULL |  |
| `recorded_by` | bigint unsigned | YES | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_finance_id` references `project_finances`.`id` (Constraint: `marketing_expenses_project_finance_id_foreign`)
- `recorded_by` references `users`.`id` (Constraint: `marketing_expenses_recorded_by_foreign`)

---

## Table: `meeting_notes`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `meeting_id` | bigint unsigned | NO | MUL | NULL |  |
| `minutes` | text | NO |  | NULL |  |
| `important_decisions` | text | NO |  | NULL |  |
| `uploaded_by` | bigint unsigned | NO | MUL | NULL |  |
| `uploaded_on` | datetime | NO |  | NULL |  |

**Foreign Keys:**
- `meeting_id` references `meetings`.`id` (Constraint: `meeting_notes_meeting_id_foreign`)
- `uploaded_by` references `users`.`id` (Constraint: `meeting_notes_uploaded_by_foreign`)

---

## Table: `meeting_participants`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `meeting_id` | bigint unsigned | NO | MUL | NULL |  |
| `user_id` | bigint unsigned | NO | MUL | NULL |  |
| `attendance_status` | enum('invited','attended','absent') | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `meeting_id` references `meetings`.`id` (Constraint: `meeting_participants_meeting_id_foreign`)
- `user_id` references `users`.`id` (Constraint: `meeting_participants_user_id_foreign`)

---

## Table: `meetings`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | YES | MUL | NULL |  |
| `title` | varchar(255) | NO |  | NULL |  |
| `meeting_type` | varchar(50) | YES |  | NULL |  |
| `scheduled_at` | datetime | NO |  | NULL |  |
| `location` | varchar(255) | YES |  | NULL |  |
| `mode` | varchar(20) | YES |  | NULL |  |
| `meeting_link` | varchar(500) | YES |  | NULL |  |
| `agenda` | text | YES |  | NULL |  |
| `status` | enum('scheduled','completed','cancelled') | NO |  | NULL |  |
| `created_by` | bigint unsigned | NO | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `created_by` references `users`.`id` (Constraint: `meetings_created_by_foreign`)
- `project_id` references `projects`.`id` (Constraint: `meetings_project_id_foreign`)

---

## Table: `module_student`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `module_id` | bigint unsigned | NO | MUL | NULL |  |
| `student_id` | bigint unsigned | NO | MUL | NULL |  |
| `assigned_date` | date | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `module_id` references `modules`.`id` (Constraint: `module_student_module_id_foreign`)
- `student_id` references `users`.`id` (Constraint: `module_student_student_id_foreign`)

---

## Table: `modules`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | MUL | NULL |  |
| `weight_percentage` | decimal(5,2) | YES |  | NULL |  |
| `module_name` | varchar(150) | NO |  | NULL |  |
| `description` | text | YES |  | NULL |  |
| `status` | enum('not_started','in_progress','completed') | NO |  | NULL |  |
| `created_by` | bigint unsigned | NO | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `created_by` references `users`.`id` (Constraint: `modules_created_by_foreign`)
- `project_id` references `projects`.`id` (Constraint: `modules_project_id_foreign`)

---

## Table: `notifications`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `user_id` | bigint unsigned | NO | MUL | NULL |  |
| `project_id` | bigint unsigned | YES | MUL | NULL |  |
| `type` | varchar(100) | NO |  | NULL |  |
| `urgency` | varchar(20) | YES |  | NULL |  |
| `message` | text | NO |  | NULL |  |
| `is_read` | tinyint(1) | NO |  | 0 |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_id` references `projects`.`id` (Constraint: `notifications_project_id_foreign`)
- `user_id` references `users`.`id` (Constraint: `notifications_user_id_foreign`)

---

## Table: `project_closures`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | UNI | NULL |  |
| `closed_by` | bigint unsigned | NO | MUL | NULL |  |
| `closure_date` | datetime | NO |  | NULL |  |
| `final_status` | varchar(50) | NO |  | NULL |  |
| `remarks` | text | YES |  | NULL |  |

**Foreign Keys:**
- `closed_by` references `users`.`id` (Constraint: `project_closures_closed_by_foreign`)
- `project_id` references `projects`.`id` (Constraint: `project_closures_project_id_foreign`)

---

## Table: `project_faculty`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | MUL | NULL |  |
| `faculty_id` | bigint unsigned | NO | MUL | NULL |  |
| `assigned_date` | date | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `faculty_id` references `users`.`id` (Constraint: `project_faculty_faculty_id_foreign`)
- `project_id` references `projects`.`id` (Constraint: `project_faculty_project_id_foreign`)

---

## Table: `project_finances`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | UNI | NULL |  |
| `total_development_amount` | decimal(12,2) | YES |  | NULL |  |
| `marketing_budget` | decimal(12,2) | YES |  | 0.00 |  |
| `overhead_budget` | decimal(12,2) | YES |  | 0.00 |  |
| `estimated_cost` | decimal(12,2) | NO |  | NULL |  |
| `subtotal` | decimal(12,2) | NO |  | NULL |  |
| `gst_amount` | decimal(12,2) | YES |  | NULL |  |
| `total_amount` | decimal(12,2) | NO |  | NULL |  |
| `created_by` | bigint unsigned | NO | MUL | NULL |  |
| `approved_by` | bigint unsigned | YES | MUL | NULL |  |
| `approved_at` | timestamp | YES |  | NULL |  |
| `status` | enum('draft','pending_approval','approved','rejected') | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `approved_by` references `users`.`id` (Constraint: `project_finances_approved_by_foreign`)
- `created_by` references `users`.`id` (Constraint: `project_finances_created_by_foreign`)
- `project_id` references `projects`.`id` (Constraint: `project_finances_project_id_foreign`)

---

## Table: `project_reports`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | MUL | NULL |  |
| `report_title` | varchar(200) | NO |  | NULL |  |
| `report_file` | varchar(500) | NO |  | NULL |  |
| `uploaded_by` | bigint unsigned | NO | MUL | NULL |  |
| `upload_date` | datetime | NO |  | NULL |  |

**Foreign Keys:**
- `project_id` references `projects`.`id` (Constraint: `project_reports_project_id_foreign`)
- `uploaded_by` references `users`.`id` (Constraint: `project_reports_uploaded_by_foreign`)

---

## Table: `project_student`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | MUL | NULL |  |
| `student_id` | bigint unsigned | NO | MUL | NULL |  |
| `role` | enum('project_lead','developer','designer','tester','other','nova','orbit','spark') | NO |  | NULL |  |
| `assigned_date` | date | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_id` references `projects`.`id` (Constraint: `project_student_project_id_foreign`)
- `student_id` references `users`.`id` (Constraint: `project_student_student_id_foreign`)

---

## Table: `projects`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `title` | varchar(255) | NO |  | NULL |  |
| `project_type` | varchar(100) | YES |  | NULL |  |
| `source_type` | enum('faculty','student','alumni','institution','external','other') | YES |  | NULL |  |
| `brought_by` | varchar(150) | YES |  | NULL |  |
| `client_name` | varchar(150) | YES |  | NULL |  |
| `contact_email` | varchar(255) | YES |  | NULL |  |
| `contact_phone` | varchar(30) | YES |  | NULL |  |
| `requirements` | text | YES |  | NULL |  |
| `deliverables` | text | YES |  | NULL |  |
| `expected_timeline` | date | YES |  | NULL |  |
| `budget` | decimal(12,2) | YES |  | NULL |  |
| `priority` | enum('normal','urgent') | NO |  | normal |  |
| `status` | enum('proposed','accepted','rejected','in_progress','closed') | NO |  | NULL |  |
| `created_by` | bigint unsigned | NO | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `created_by` references `users`.`id` (Constraint: `projects_created_by_foreign`)

---

## Table: `requirement_changes`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `client_requirement_id` | bigint unsigned | NO | MUL | NULL |  |
| `project_id` | bigint unsigned | YES | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |
| `previous_value` | text | YES |  | NULL |  |
| `updated_value` | text | YES |  | NULL |  |
| `changed_by` | bigint unsigned | NO | MUL | NULL |  |

**Foreign Keys:**
- `changed_by` references `users`.`id` (Constraint: `requirement_changes_changed_by_foreign`)
- `client_requirement_id` references `client_requirements`.`id` (Constraint: `requirement_changes_client_requirement_id_foreign`)
- `project_id` references `projects`.`id` (Constraint: `requirement_changes_project_id_foreign`)

---

## Table: `ssl_renewal_history`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `hosting_charge_id` | bigint unsigned | NO | MUL | NULL |  |
| `renewal_date` | date | NO |  | NULL |  |
| `previous_expiry_date` | date | YES |  | NULL |  |
| `new_expiry_date` | date | NO |  | NULL |  |
| `renewal_amount` | decimal(12,2) | NO |  | NULL |  |
| `payment_reference` | varchar(191) | YES |  | NULL |  |
| `remarks` | text | YES |  | NULL |  |
| `renewed_by` | bigint unsigned | NO | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `hosting_charge_id` references `hosting_charges`.`id` (Constraint: `ssl_renewal_history_hosting_charge_id_foreign`)
- `renewed_by` references `users`.`id` (Constraint: `ssl_renewal_history_renewed_by_foreign`)

---

## Table: `student_hourly_rate_history`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `old_rate` | decimal(10,2) | NO |  | NULL |  |
| `new_rate` | decimal(10,2) | NO |  | NULL |  |
| `updated_by` | bigint unsigned | NO | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `updated_by` references `users`.`id` (Constraint: `student_hourly_rate_history_updated_by_foreign`)

---

## Table: `student_payments`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_student_id` | bigint unsigned | NO | MUL | NULL |  |
| `task_id` | bigint unsigned | YES | MUL | NULL |  |
| `project_finance_id` | bigint unsigned | YES | MUL | NULL |  |
| `designation` | enum('nova','orbit','spark') | NO |  | NULL |  |
| `approved_hours` | decimal(7,2) | YES |  | NULL |  |
| `hourly_rate` | decimal(10,2) | YES |  | NULL |  |
| `amount` | decimal(12,2) | NO |  | NULL |  |
| `payment_period_start` | date | YES |  | NULL |  |
| `payment_period_end` | date | YES |  | NULL |  |
| `status` | enum('calculated','approved','processing','paid','failed') | YES |  | paid |  |
| `payment_date` | date | YES |  | NULL |  |
| `payment_method` | varchar(50) | YES |  | NULL |  |
| `payment_reference` | varchar(255) | YES |  | NULL |  |
| `remarks` | text | YES |  | NULL |  |
| `created_by` | bigint unsigned | YES | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_student_id` references `project_student`.`id` (Constraint: `student_payments_project_student_id_foreign`)
- `task_id` references `tasks`.`id` (Constraint: `student_payments_task_id_foreign`)

---

## Table: `student_profiles`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `student_id` | bigint unsigned | NO | UNI | NULL |  |
| `course` | varchar(100) | NO |  | NULL |  |
| `batch` | varchar(50) | NO |  | NULL |  |
| `semester` | tinyint | NO |  | NULL |  |
| `designation` | enum('nova','orbit','spark') | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `student_id` references `users`.`id` (Constraint: `student_profiles_student_id_foreign`)

---

## Table: `student_reports`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_id` | bigint unsigned | NO | MUL | NULL |  |
| `student_id` | bigint unsigned | NO | MUL | NULL |  |
| `task_id` | bigint unsigned | YES | MUL | NULL |  |
| `report_type` | enum('daily','weekly') | NO |  | NULL |  |
| `report_date` | date | NO |  | NULL |  |
| `week_start` | date | YES |  | NULL |  |
| `week_end` | date | YES |  | NULL |  |
| `weekly_key` | varchar(120) | YES | UNI | NULL |  |
| `work_done` | text | NO |  | NULL |  |
| `tasks_completed` | text | YES |  | NULL |  |
| `hours_worked` | decimal(5,2) | YES |  | NULL |  |
| `report_file` | varchar(255) | YES |  | NULL |  |
| `approval_status` | enum('pending','approved','rejected') | NO |  | pending |  |
| `feedback` | text | YES |  | NULL |  |
| `challenges` | text | YES |  | NULL |  |
| `remarks` | text | YES |  | NULL |  |
| `next_plan` | text | YES |  | NULL |  |
| `submitted_at` | timestamp | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `project_id` references `projects`.`id` (Constraint: `student_reports_project_id_foreign`)
- `student_id` references `users`.`id` (Constraint: `student_reports_student_id_foreign`)
- `task_id` references `tasks`.`id` (Constraint: `student_reports_task_id_foreign`)

---

## Table: `student_roles`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `student_id` | bigint unsigned | NO | UNI | NULL |  |
| `role` | enum('project_lead','developer','designer','tester','other','nova','orbit','spark') | NO |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `student_id` references `users`.`id` (Constraint: `student_roles_student_id_foreign`)

---

## Table: `student_work_logs`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `project_student_id` | bigint unsigned | NO | MUL | NULL |  |
| `task_id` | bigint unsigned | NO | MUL | NULL |  |
| `work_date` | date | NO |  | NULL |  |
| `hours_worked` | decimal(5,2) | NO |  | NULL |  |
| `description` | text | YES |  | NULL |  |
| `rating` | tinyint unsigned | YES |  | NULL |  |
| `approval_status` | enum('pending','approved','rejected') | NO |  | pending |  |
| `approved_by` | bigint unsigned | YES | MUL | NULL |  |
| `approved_at` | timestamp | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `approved_by` references `users`.`id` (Constraint: `student_work_logs_approved_by_foreign`)
- `project_student_id` references `project_student`.`id` (Constraint: `student_work_logs_project_student_id_foreign`)
- `task_id` references `tasks`.`id` (Constraint: `student_work_logs_task_id_foreign`)

---

## Table: `tasks`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `module_id` | bigint unsigned | NO | MUL | NULL |  |
| `title` | varchar(255) | NO |  | NULL |  |
| `description` | text | YES |  | NULL |  |
| `weight` | int | NO |  | 1 |  |
| `assigned_to` | bigint unsigned | YES | MUL | NULL |  |
| `github_repository_id` | bigint unsigned | YES | MUL | NULL |  |
| `github_pr_url` | varchar(500) | YES |  | NULL |  |
| `status` | enum('todo','in_progress','completed','blocked','rework') | NO |  | todo |  |
| `rating` | decimal(3,2) unsigned | YES |  | NULL |  |
| `due_date` | date | YES |  | NULL |  |
| `reviewed_by` | bigint unsigned | YES | MUL | NULL |  |
| `reviewed_at` | timestamp | YES |  | NULL |  |
| `created_by` | bigint unsigned | NO | MUL | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

**Foreign Keys:**
- `assigned_to` references `users`.`id` (Constraint: `tasks_assigned_to_foreign`)
- `created_by` references `users`.`id` (Constraint: `tasks_created_by_foreign`)
- `github_repository_id` references `github_repositories`.`id` (Constraint: `tasks_github_repository_id_foreign`)
- `module_id` references `modules`.`id` (Constraint: `tasks_module_id_foreign`)
- `reviewed_by` references `users`.`id` (Constraint: `tasks_reviewed_by_foreign`)

---

## Table: `users`
| Field | Type | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | bigint unsigned | NO | PRI | NULL | auto_increment |
| `name` | varchar(150) | NO |  | NULL |  |
| `email` | varchar(255) | NO | UNI | NULL |  |
| `password` | varchar(255) | NO |  | NULL |  |
| `phone` | varchar(20) | YES |  | NULL |  |
| `profile_photo_path` | varchar(255) | YES |  | NULL |  |
| `bio` | text | YES |  | NULL |  |
| `location` | varchar(150) | YES |  | Kochi, India |  |
| `avatar` | varchar(500) | YES |  | NULL |  |
| `department` | varchar(150) | YES |  | NULL |  |
| `role` | enum('director','coordinator','finance','faculty','student','developer','design_head') | NO |  | NULL |  |
| `permissions` | json | YES |  | NULL |  |
| `created_at` | timestamp | YES |  | NULL |  |
| `updated_at` | timestamp | YES |  | NULL |  |

---

