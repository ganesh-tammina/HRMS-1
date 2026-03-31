/**
 * CANDIDATES & PRE-ONBOARDING ROUTES
 * Manages candidate journey from offer to employee conversion
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { db } = require("../config/database");
const { auth, admin, hr } = require("../middleware/auth");

const upload = multer({ dest: "uploads/candidate_docs/" });

/* ============ CANDIDATE MANAGEMENT ============ */

// Create new candidate (after interview rounds)
router.post("/", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const candidateData = {
            candidate_id: req.body.candidate_id || `CAN${Date.now()}`,
            first_name: req.body.first_name,
            middle_name: req.body.middle_name,
            last_name: req.body.last_name,
            full_name: req.body.full_name || `${req.body.first_name} ${req.body.last_name || ''}`.trim(),
            email: req.body.email,
            phone: req.body.phone,
            alternate_phone: req.body.alternate_phone,
            date_of_birth: req.body.date_of_birth,
            gender: req.body.gender,
            position: req.body.position,
            designation_id: req.body.designation_id,
            department_id: req.body.department_id,
            location_id: req.body.location_id,
            offered_ctc: req.body.offered_ctc,
            joining_date: req.body.joining_date,
            reporting_manager_id: req.body.reporting_manager_id,
            hr_coordinator_id: req.body.hr_coordinator_id || req.user.employee_id,
            recruiter_name: req.body.recruiter_name,
            recruitment_source: req.body.recruitment_source,
            created_by: req.user.id,
            status: 'offered'
        };

        const [result] = await c.query("INSERT INTO candidates SET ?", candidateData);
        c.end();

        res.json({
            success: true,
            candidate_id: result.insertId,
            message: "Candidate created successfully. Ready for pre-onboarding."
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Get all candidates with filters
router.get("/", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const { status, joining_date_from, joining_date_to, department_id } = req.query;

        let query = `
            SELECT c.*, 
                   d.name as department_name, 
                   des.name as designation_name,
                   l.name as location_name,
                   CONCAT(m.FirstName, ' ', m.LastName) as manager_name,
                   (SELECT COUNT(*) FROM candidate_task_progress WHERE candidate_id = c.id) as total_tasks,
                   (SELECT COUNT(*) FROM candidate_task_progress WHERE candidate_id = c.id AND status = 'completed') as completed_tasks
            FROM candidates c
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN designations des ON c.designation_id = des.id
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN employees m ON c.reporting_manager_id = m.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += " AND c.status = ?";
            params.push(status);
        }
        if (joining_date_from) {
            query += " AND c.joining_date >= ?";
            params.push(joining_date_from);
        }
        if (joining_date_to) {
            query += " AND c.joining_date <= ?";
            params.push(joining_date_to);
        }
        if (department_id) {
            query += " AND c.department_id = ?";
            params.push(department_id);
        }

        query += " ORDER BY c.created_at DESC";

        const [candidates] = await c.query(query, params);
        c.end();

        res.json(candidates);
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Get candidate by ID
router.get("/:id", auth, async (req, res) => {
    const c = await db();
    try {
        const [candidates] = await c.query(`
            SELECT c.*, 
                   d.name as department_name, 
                   des.name as designation_name,
                   l.name as location_name,
                   CONCAT(m.FirstName, ' ', m.LastName) as manager_name,
                   CONCAT(hr.FirstName, ' ', hr.LastName) as hr_coordinator_name
            FROM candidates c
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN designations des ON c.designation_id = des.id
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN employees m ON c.reporting_manager_id = m.id
            LEFT JOIN employees hr ON c.hr_coordinator_id = hr.id
            WHERE c.id = ?
        `, [req.params.id]);

        if (candidates.length === 0) {
            c.end();
            return res.status(404).json({ error: "Candidate not found" });
        }

        // Get documents
        const [documents] = await c.query(
            "SELECT * FROM candidate_documents WHERE candidate_id = ?",
            [req.params.id]
        );

        // Get task progress
        const [tasks] = await c.query(`
            SELECT ctp.*, pt.task_name, pt.description, pt.task_category, pt.is_mandatory
            FROM candidate_task_progress ctp
            JOIN preonboarding_tasks pt ON ctp.task_id = pt.id
            WHERE ctp.candidate_id = ?
            ORDER BY pt.task_order
        `, [req.params.id]);

        c.end();

        res.json({
            candidate: candidates[0],
            documents,
            tasks,
            completion_percentage: tasks.length > 0
                ? (tasks.filter(t => t.status === 'completed').length / tasks.length * 100).toFixed(2)
                : 0
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Update candidate
router.put("/:id", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const updates = { ...req.body };
        delete updates.id;
        delete updates.created_at;
        delete updates.created_by;

        await c.query("UPDATE candidates SET ? WHERE id = ?", [updates, req.params.id]);
        c.end();

        res.json({ success: true, message: "Candidate updated successfully" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Send offer letter
router.post("/:id/send-offer", auth, hr, async (req, res) => {
    const c = await db();
    try {
        await c.query(`
            UPDATE candidates SET 
                offer_letter_sent = 1,
                offer_letter_sent_date = CURDATE(),
                status = 'offered'
            WHERE id = ?
        `, [req.params.id]);

        c.end();
        res.json({ success: true, message: "Offer letter sent" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Accept offer
router.post("/:id/accept-offer", async (req, res) => {
    const c = await db();
    try {
        await c.query(`
            UPDATE candidates SET 
                offer_accepted = 1,
                offer_accepted_date = CURDATE(),
                status = 'offer_accepted'
            WHERE id = ?
        `, [req.params.id]);

        // Auto-assign pre-onboarding tasks
        const [tasks] = await c.query(
            "SELECT id FROM preonboarding_tasks WHERE auto_assign = 1 ORDER BY task_order"
        );

        for (const task of tasks) {
            await c.query(`
                INSERT INTO candidate_task_progress (candidate_id, task_id, status, assigned_date)
                VALUES (?, ?, 'not_started', CURDATE())
            `, [req.params.id, task.id]);
        }

        c.end();
        res.json({ success: true, message: "Offer accepted, pre-onboarding tasks assigned" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Decline offer
router.post("/:id/decline-offer", async (req, res) => {
    const c = await db();
    try {
        await c.query(`
            UPDATE candidates SET 
                offer_declined = 1,
                offer_declined_date = CURDATE(),
                decline_reason = ?,
                status = 'offer_declined'
            WHERE id = ?
        `, [req.body.reason, req.params.id]);

        c.end();
        res.json({ success: true, message: "Offer declined" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ DOCUMENT MANAGEMENT ============ */

// Upload document
router.post("/:id/documents", upload.single("file"), async (req, res) => {
    const c = await db();
    try {
        const docData = {
            candidate_id: req.params.id,
            document_type: req.body.document_type,
            document_name: req.file.originalname,
            file_path: req.file.path,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            required: req.body.required || 1
        };

        await c.query("INSERT INTO candidate_documents SET ?", docData);

        // Update candidate documents status
        await c.query(`
            UPDATE candidates SET 
                documents_submitted = 1,
                status = CASE 
                    WHEN status = 'offer_accepted' THEN 'documents_pending'
                    ELSE status
                END
            WHERE id = ?
        `, [req.params.id]);

        c.end();
        res.json({ success: true, message: "Document uploaded successfully" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Verify document
router.put("/documents/:docId/verify", auth, hr, async (req, res) => {
    const c = await db();
    try {
        await c.query(`
            UPDATE candidate_documents SET 
                verified = 1,
                verified_by = ?,
                verified_date = CURDATE(),
                verification_remarks = ?
            WHERE id = ?
        `, [req.user.id, req.body.remarks, req.params.docId]);

        c.end();
        res.json({ success: true, message: "Document verified" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ BGV MANAGEMENT ============ */

// Initiate BGV
router.post("/:id/bgv/initiate", auth, hr, async (req, res) => {
    const c = await db();
    try {
        await c.query(`
            UPDATE candidates SET 
                bgv_status = 'initiated',
                bgv_initiated_date = CURDATE(),
                status = 'bgv_initiated'
            WHERE id = ?
        `, [req.params.id]);

        c.end();
        res.json({ success: true, message: "BGV initiated" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Update BGV status
router.put("/:id/bgv/status", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const updates = {
            bgv_status: req.body.bgv_status,
            bgv_remarks: req.body.remarks
        };

        if (req.body.bgv_status === 'completed') {
            updates.bgv_completed_date = new Date();
            updates.status = 'bgv_completed';
        }

        await c.query("UPDATE candidates SET ? WHERE id = ?", [updates, req.params.id]);
        c.end();

        res.json({ success: true, message: "BGV status updated" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ TASK MANAGEMENT ============ */

// Update task progress
router.put("/tasks/:taskProgressId", async (req, res) => {
    const c = await db();
    try {
        const updates = {
            status: req.body.status,
            remarks: req.body.remarks
        };

        if (req.body.status === 'completed') {
            updates.completed_date = new Date();
            updates.completed_by = req.user?.id;
        }

        await c.query("UPDATE candidate_task_progress SET ? WHERE id = ?",
            [updates, req.params.taskProgressId]);

        c.end();
        res.json({ success: true, message: "Task updated" });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ CONVERT TO EMPLOYEE ============ */

router.post("/:id/convert-to-employee", auth, hr, async (req, res) => {
    const c = await db();
    try {
        // Get candidate details
        const [candidates] = await c.query("SELECT * FROM candidates WHERE id = ?", [req.params.id]);

        if (candidates.length === 0) {
            c.end();
            return res.status(404).json({ error: "Candidate not found" });
        }

        const candidate = candidates[0];

        // Create employee
        const empData = {
            EmployeeNumber: req.body.employee_number || `EMP${Date.now()}`,
            FirstName: candidate.first_name,
            MiddleName: candidate.middle_name,
            LastName: candidate.last_name,
            FullName: candidate.full_name,
            WorkEmail: candidate.email,
            PersonalEmail: candidate.email,
            Gender: candidate.gender,
            DateOfBirth: candidate.date_of_birth,
            DateJoined: candidate.joining_date || new Date(),
            LocationId: candidate.location_id,
            DepartmentId: candidate.department_id,
            DesignationId: candidate.designation_id,
            reporting_manager_id: candidate.reporting_manager_id,
            EmploymentStatus: 'Active',
            lpa: candidate.offered_ctc
        };

        const [empResult] = await c.query("INSERT INTO employees SET ?", empData);

        // Update candidate
        await c.query(`
            UPDATE candidates SET 
                converted_to_employee = 1,
                employee_id = ?,
                conversion_date = CURDATE(),
                status = 'joined'
            WHERE id = ?
        `, [empResult.insertId, req.params.id]);

        // Create user account
        const userData = {
            username: candidate.email.split('@')[0],
            role: 'employee',
            full_name: candidate.full_name,
            employee_id: empResult.insertId
        };

        await c.query("INSERT INTO users SET ?", userData);

        c.end();

        res.json({
            success: true,
            employee_id: empResult.insertId,
            message: "Candidate converted to employee successfully"
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ PRE-ONBOARDING WORKFLOW ============ */

// Start pre-onboarding for selected candidate
router.post("/:id/start-preonboarding", auth, hr, async (req, res) => {
    const c = await db();
    try {
        // Get candidate details
        const [candidate] = await c.query(`
            SELECT c.*, 
                   d.name as department_name, 
                   des.name as designation_name,
                   l.name as location_name
            FROM candidates c
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN designations des ON c.designation_id = des.id
            LEFT JOIN locations l ON c.location_id = l.id
            WHERE c.id = ?
        `, [req.params.id]);

        if (candidate.length === 0) {
            c.end();
            return res.status(404).json({ error: "Candidate not found" });
        }

        // Update status to documents_pending
        await c.query(
            "UPDATE candidates SET status = 'documents_pending' WHERE id = ?",
            [req.params.id]
        );

        c.end();
        res.json({
            success: true,
            message: "Pre-onboarding started",
            candidate: candidate[0]
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Create/Update offer with 4 workflows: Job Details, Compensation, Offer Details, Preview
router.post("/:id/create-offer", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const {
            // Job Details
            position,
            designation_id,
            department_id,
            location_id,
            reporting_manager_id,
            joining_date,

            // Compensation
            offered_ctc,
            annual_salary,
            salary_breakup,

            // Offer Details
            offer_validity_date,
            probation_period,
            notice_period,
            work_mode,

            // Additional
            special_terms,
            benefits
        } = req.body;

        // ✅ FIX: Detect whether param is a numeric id or a string candidate_id (e.g. 'CAN1772533410481')
        const candidateParam = req.params.id;
        const isNumericId = /^\d+$/.test(String(candidateParam));
        const whereField = isNumericId ? 'id' : 'candidate_id';

        // Update candidate with offer details
        await c.query(`
            UPDATE candidates SET 
                position = ?,
                designation_id = ?,
                department_id = ?,
                location_id = ?,
                reporting_manager_id = ?,
                joining_date = ?,
                offered_ctc = ?,
                status = 'offered'
            WHERE ${whereField} = ?
        `, [position, designation_id, department_id, location_id,
            reporting_manager_id, joining_date, offered_ctc, candidateParam]);

        // ✅ Resolve the numeric id for the FK in candidate_communications
        let numericId = candidateParam;
        if (!isNumericId) {
            const [rows] = await c.query(
                'SELECT id FROM candidates WHERE candidate_id = ? LIMIT 1',
                [candidateParam]
            );
            if (rows.length === 0) {
                c.end();
                return res.status(404).json({ error: `Candidate '${candidateParam}' not found` });
            }
            numericId = rows[0].id;
        }

        // Store additional offer details in communications log
        await c.query(`
            INSERT INTO candidate_communications 
            (candidate_id, communication_type, subject, message, communicated_by)
            VALUES (?, 'email', 'Offer Letter Details', ?, ?)
        `, [numericId, JSON.stringify({
            annual_salary,
            salary_breakup,
            offer_validity_date,
            probation_period,
            notice_period,
            work_mode,
            special_terms,
            benefits
        }), req.user.id]);

        c.end();
        res.json({
            success: true,
            message: "Offer details saved. Ready to preview and send."
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Preview and send offer letter
router.post("/:id/preview-send-offer", auth, hr, async (req, res) => {
    const c = await db();
    try {
        // ✅ FIX: Handle both numeric id and string candidate_id (e.g. 'CAN...')
        const candidateParam = req.params.id;
        const isNumericId = /^\d+$/.test(String(candidateParam));
        const whereField = isNumericId ? 'c.id' : 'c.candidate_id';

        // Get complete candidate and offer details
        const [candidate] = await c.query(`
            SELECT c.*, 
                   d.name as department_name, 
                   des.name as designation_name,
                   l.name as location_name,
                   CONCAT(m.FirstName, ' ', m.LastName) as manager_name
            FROM candidates c
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN designations des ON c.designation_id = des.id
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN employees m ON c.reporting_manager_id = m.id
            WHERE ${whereField} = ?
        `, [candidateParam]);

        if (candidate.length === 0) {
            c.end();
            return res.status(404).json({ error: "Candidate not found" });
        }

        // Resolve numeric id for FK queries
        const numericId = candidate[0].id;

        // Get offer details from communications
        const [offerDetails] = await c.query(`
            SELECT message FROM candidate_communications 
            WHERE candidate_id = ? AND subject = 'Offer Letter Details'
            ORDER BY communication_date DESC LIMIT 1
        `, [numericId]);

        // Send offer letter via email (mock)
        await c.query(`
            UPDATE candidates SET 
                offer_letter_sent = 1,
                offer_letter_sent_date = CURDATE(),
                status = 'offered'
            WHERE id = ?
        `, [numericId]);

        // Log email sent
        await c.query(`
            INSERT INTO candidate_communications 
            (candidate_id, communication_type, subject, message, communicated_by)
            VALUES (?, 'email', 'Offer Letter Sent', 'Offer letter sent to candidate email', ?)
        `, [numericId, req.user.id]);

        c.end();
        res.json({
            success: true,
            message: "Offer letter sent to candidate email",
            preview: {
                candidate: candidate[0],
                offer_details: offerDetails.length > 0 ? JSON.parse(offerDetails[0].message) : null
            }
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ CANDIDATE PORTAL - PUBLIC ACCESS ============ */

// Candidate views offer (no auth required - use token in URL)
router.get("/:id/view-offer/:token", async (req, res) => {
    const c = await db();
    try {
        const [candidate] = await c.query(`
            SELECT c.*, 
                   d.name as department_name, 
                   des.name as designation_name,
                   l.name as location_name
            FROM candidates c
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN designations des ON c.designation_id = des.id
            LEFT JOIN locations l ON c.location_id = l.id
            WHERE c.id = ? AND c.candidate_id = ?
        `, [req.params.id, req.params.token]);

        if (candidate.length === 0) {
            c.end();
            return res.status(404).json({ error: "Invalid offer link" });
        }

        // Get offer details
        const [offerDetails] = await c.query(`
            SELECT message FROM candidate_communications 
            WHERE candidate_id = ? AND subject = 'Offer Letter Details'
            ORDER BY communication_date DESC LIMIT 1
        `, [req.params.id]);

        c.end();
        res.json({
            candidate: candidate[0],
            offer_details: offerDetails.length > 0 ? JSON.parse(offerDetails[0].message) : null,
            status: candidate[0].status
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Candidate approves offer (no auth required)
router.post("/:id/approve-offer/:token", async (req, res) => {
    const c = await db();
    try {
        // Verify token matches candidate_id
        const [candidate] = await c.query(
            "SELECT id FROM candidates WHERE id = ? AND candidate_id = ?",
            [req.params.id, req.params.token]
        );

        if (candidate.length === 0) {
            c.end();
            return res.status(404).json({ error: "Invalid link" });
        }

        // Update to approved
        await c.query(`
            UPDATE candidates SET 
                offer_accepted = 1,
                offer_accepted_date = CURDATE(),
                status = 'offer_accepted'
            WHERE id = ?
        `, [req.params.id]);

        // Auto-assign pre-onboarding tasks
        const [tasks] = await c.query(
            "SELECT id FROM preonboarding_tasks WHERE auto_assign = 1 ORDER BY task_order"
        );

        for (const task of tasks) {
            await c.query(`
                INSERT IGNORE INTO candidate_task_progress 
                (candidate_id, task_id, status, assigned_date)
                VALUES (?, ?, 'not_started', CURDATE())
            `, [req.params.id, task.id]);
        }

        c.end();
        res.json({
            success: true,
            message: "Offer approved successfully! Pre-onboarding tasks assigned.",
            status: "Approved"
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Candidate rejects offer (no auth required)
router.post("/:id/reject-offer/:token", async (req, res) => {
    const c = await db();
    try {
        // Verify token
        const [candidate] = await c.query(
            "SELECT id FROM candidates WHERE id = ? AND candidate_id = ?",
            [req.params.id, req.params.token]
        );

        if (candidate.length === 0) {
            c.end();
            return res.status(404).json({ error: "Invalid link" });
        }

        // Update to rejected
        await c.query(`
            UPDATE candidates SET 
                offer_declined = 1,
                offer_declined_date = CURDATE(),
                decline_reason = ?,
                status = 'offer_declined'
            WHERE id = ?
        `, [req.body.reason || 'No reason provided', req.params.id]);

        c.end();
        res.json({
            success: true,
            message: "Offer rejected. Thank you for your time.",
            status: "Rejected"
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ STATUS MANAGEMENT ============ */

// Update candidate status (Pending, Approved, Rejected, Hold, Hire as Employee)
router.post("/:id/update-status", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const { status, remarks } = req.body;

        // Validate status
        const validStatuses = [
            'offered', 'offer_accepted', 'offer_declined',
            'documents_pending', 'bgv_initiated', 'bgv_completed',
            'ready_to_join', 'joined', 'dropped_out'
        ];

        if (!validStatuses.includes(status)) {
            c.end();
            return res.status(400).json({ error: "Invalid status" });
        }

        await c.query(
            "UPDATE candidates SET status = ? WHERE id = ?",
            [status, req.params.id]
        );

        // Log status change
        if (remarks) {
            await c.query(`
                INSERT INTO candidate_communications 
                (candidate_id, communication_type, subject, message, communicated_by)
                VALUES (?, 'other', 'Status Update', ?, ?)
            `, [req.params.id, `Status changed to: ${status}. ${remarks}`, req.user.id]);
        }

        c.end();
        res.json({
            success: true,
            message: `Candidate status updated to ${status}`,
            status
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Mark candidate as "Hire as Employee" - triggers onboarding
router.post("/:id/hire-as-employee", auth, hr, async (req, res) => {
    const c = await db();
    try {
        // Check if all mandatory documents are verified
        const [pendingDocs] = await c.query(`
            SELECT COUNT(*) as pending FROM candidate_documents 
            WHERE candidate_id = ? AND required = 1 AND verified = 0
        `, [req.params.id]);

        if (pendingDocs[0].pending > 0) {
            c.end();
            return res.status(400).json({
                error: "Cannot hire: Pending document verification",
                pending_documents: pendingDocs[0].pending
            });
        }

        // Update status to ready_to_join
        await c.query(
            "UPDATE candidates SET status = 'ready_to_join' WHERE id = ?",
            [req.params.id]
        );

        c.end();
        res.json({
            success: true,
            message: "Candidate marked as 'Ready to Join'. Onboarding can now be initiated.",
            next_step: "Convert to employee on joining date"
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

// Put candidate on hold
router.post("/:id/put-on-hold", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const { reason } = req.body;

        await c.query(`
            INSERT INTO candidate_communications 
            (candidate_id, communication_type, subject, message, communicated_by)
            VALUES (?, 'other', 'Candidate On Hold', ?, ?)
        `, [req.params.id, reason || 'Candidate put on hold', req.user.id]);

        // Keep current status but flag as on hold
        c.end();
        res.json({
            success: true,
            message: "Candidate put on hold",
            action: "Manual follow-up required"
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

/* ============ DASHBOARD & STATS ============ */

router.get("/stats/dashboard", auth, hr, async (req, res) => {
    const c = await db();
    try {
        const [stats] = await c.query(`
            SELECT 
                COUNT(*) as total_candidates,
                SUM(CASE WHEN status = 'offered' THEN 1 ELSE 0 END) as offered,
                SUM(CASE WHEN status = 'offer_accepted' THEN 1 ELSE 0 END) as offer_accepted,
                SUM(CASE WHEN status = 'bgv_initiated' OR status = 'bgv_completed' THEN 1 ELSE 0 END) as in_bgv,
                SUM(CASE WHEN status = 'ready_to_join' THEN 1 ELSE 0 END) as ready_to_join,
                SUM(CASE WHEN status = 'joined' THEN 1 ELSE 0 END) as joined,
                SUM(CASE WHEN status = 'offer_declined' OR status = 'dropped_out' THEN 1 ELSE 0 END) as declined_dropped
            FROM candidates
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `);

        c.end();
        res.json(stats[0]);
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
