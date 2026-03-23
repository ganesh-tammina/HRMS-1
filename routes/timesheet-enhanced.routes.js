/**
 * ENHANCED TIMESHEET ROUTES
 * Handles both regular and project-based timesheets with client timesheet validation
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, hr, admin } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");
const multer = require("multer");
const path = require("path");

// File upload configuration for client timesheets
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/client_timesheets/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "client-timesheet-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log("File upload validation:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase(),
    });

    const allowedExtensions = /xlsx|xls|pdf|jpg|jpeg|png/;
    const allowedMimetypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    const extname = allowedExtensions.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedMimetypes.includes(file.mimetype);

    if (mimetype && extname) {
      console.log("✅ File validation passed");
      return cb(null, true);
    } else {
      console.log("❌ File validation failed:", { extname, mimetype });
      cb(new Error("Only Excel, PDF, and Image files are allowed!"));
    }
  },
});

/* ============ CHECK EMPLOYEE PROJECT ASSIGNMENT ============ */

// Get employee's project assignment status
router.get("/assignment-status", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const c = await db();

    // Check if employee has active project assignments
    const [assignments] = await c.query(
      `
            SELECT 
                pa.id,
                pa.project_id,
                p.project_code,
                p.project_name,
                p.client_name,
                ps.shift_name,
                ps.start_time,
                ps.end_time,
                pa.assignment_start_date as start_date,
                pa.assignment_end_date as end_date
            FROM project_assignments pa
            JOIN projects p ON pa.project_id = p.id
            LEFT JOIN project_shifts ps ON pa.shift_id = ps.id
            WHERE pa.employee_id = ? 
            AND pa.status = 'active'
            AND (pa.assignment_end_date IS NULL OR pa.assignment_end_date >= CURDATE())
            ORDER BY pa.assignment_start_date DESC
        `,
      [emp.id]
    );

    c.end();

    res.json({
      has_project: assignments.length > 0,
      assignments: assignments,
      timesheet_type: assignments.length > 0 ? "project_based" : "regular",
    });
  } catch (error) {
    console.error("Error checking assignment status:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============ REGULAR TIMESHEET (Non-Project Employees) ============ */

// Submit regular timesheet (hourly based on shift)
router.post("/regular/submit", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const { date, hours_breakdown, total_hours, notes } = req.body;

    const c = await db();

    // Verify employee has no active projects
    const [projects] = await c.query(
      `
            SELECT id FROM project_assignments 
            WHERE employee_id = ? AND status = 'active'
            AND (assignment_end_date IS NULL OR assignment_end_date >= ?)
        `,
      [emp.id, date]
    );

    if (projects.length > 0) {
      c.end();
      return res.status(400).json({
        error:
          "You are assigned to a project. Please use project-based timesheet.",
      });
    }

    // Check if timesheet already exists for this date
    const [existing] = await c.query(
      `
            SELECT id FROM timesheets 
            WHERE employee_id = ? AND date = ? AND timesheet_type = 'regular'
        `,
      [emp.id, date]
    );

    if (existing.length > 0) {
      // Update existing
      await c.query(
        `
                UPDATE timesheets 
                SET hours_breakdown = ?, total_hours = ?, notes = ?, 
                    submission_date = NOW(), status = 'submitted'
                WHERE id = ?
            `,
        [JSON.stringify(hours_breakdown), total_hours, notes, existing[0].id]
      );

      c.end();
      return res.json({
        success: true,
        message: "Regular timesheet updated successfully",
        timesheet_id: existing[0].id,
      });
    }

    // Insert new timesheet
    const [result] = await c.query(
      `
            INSERT INTO timesheets 
            (employee_id, date, timesheet_type, hours_breakdown, total_hours, notes, status, submission_date)
            VALUES (?, ?, 'regular', ?, ?, ?, 'submitted', NOW())
        `,
      [emp.id, date, JSON.stringify(hours_breakdown), total_hours, notes]
    );

    c.end();

    res.json({
      success: true,
      message: "Regular timesheet submitted successfully",
      timesheet_id: result.insertId,
    });
  } catch (error) {
    console.error("Error submitting regular timesheet:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get my regular timesheets
router.get("/regular/my-timesheets", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const { start_date, end_date, month, year } = req.query;
    const c = await db();

    let query = `
            SELECT 
                id, date, total_hours, hours_breakdown, notes, 
                status, submission_date, verified_by, verified_at
            FROM timesheets
            WHERE employee_id = ? AND timesheet_type = 'regular'
        `;
    const params = [emp.id];

    if (start_date && end_date) {
      query += " AND date BETWEEN ? AND ?";
      params.push(start_date, end_date);
    } else if (month && year) {
      query += " AND MONTH(date) = ? AND YEAR(date) = ?";
      params.push(month, year);
    }

    query += " ORDER BY date DESC";

    const [timesheets] = await c.query(query, params);
    c.end();

    res.json(timesheets);
  } catch (error) {
    console.error("Error fetching regular timesheets:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============ PROJECT-BASED TIMESHEET ============ */

// Submit project-based timesheet (hourly based on project shift)
router.post("/project/submit", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const {
      date,
      project_id,
      hours_breakdown,
      total_hours,
      work_description,
      notes,
    } = req.body;

    const c = await db();

    // Verify employee is assigned to this project
    const [assignment] = await c.query(
      `
            SELECT pa.id, pa.allocation_percentage,
                   ps.shift_name, ps.start_time, ps.end_time,
                   TIMESTAMPDIFF(HOUR, 
                       CONCAT('2000-01-01 ', ps.start_time), 
                       CONCAT(CASE WHEN ps.end_time < ps.start_time THEN '2000-01-02' ELSE '2000-01-01' END, ' ', ps.end_time)
                   ) as daily_hours
            FROM project_assignments pa
            LEFT JOIN project_shifts ps ON pa.shift_id = ps.id
            WHERE pa.employee_id = ? AND pa.project_id = ? 
            AND pa.status = 'active'
            AND pa.assignment_start_date <= ?
            AND (pa.assignment_end_date IS NULL OR pa.assignment_end_date >= ?)
        `,
      [emp.id, project_id, date, date]
    );

    if (assignment.length === 0) {
      c.end();
      return res.status(400).json({
        error:
          "You are not assigned to this project or assignment is not active for this date.",
      });
    }

    // Check if timesheet already exists for this date and project
    const [existing] = await c.query(
      `
            SELECT id FROM timesheets 
            WHERE employee_id = ? AND date = ? AND project_id = ? AND timesheet_type = 'project'
        `,
      [emp.id, date, project_id]
    );

    if (existing.length > 0) {
      // Update existing
      await c.query(
        `
                UPDATE timesheets 
                SET hours_breakdown = ?, total_hours = ?, work_description = ?, 
                    notes = ?, submission_date = NOW(), status = 'submitted'
                WHERE id = ?
            `,
        [
          JSON.stringify(hours_breakdown),
          total_hours,
          work_description,
          notes,
          existing[0].id,
        ]
      );

      c.end();
      return res.json({
        success: true,
        message: "Project timesheet updated successfully",
        timesheet_id: existing[0].id,
      });
    }

    // Insert new timesheet
    const [result] = await c.query(
      `
            INSERT INTO timesheets 
            (employee_id, project_id, date, timesheet_type, hours_breakdown, total_hours, 
             work_description, notes, status, submission_date)
            VALUES (?, ?, ?, 'project', ?, ?, ?, ?, 'submitted', NOW())
        `,
      [
        emp.id,
        project_id,
        date,
        JSON.stringify(hours_breakdown),
        total_hours,
        work_description,
        notes,
      ]
    );

    c.end();

    res.json({
      success: true,
      message: "Project timesheet submitted successfully",
      timesheet_id: result.insertId,
    });
  } catch (error) {
    console.error("Error submitting project timesheet:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get my project timesheets
router.get("/project/my-timesheets", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const { start_date, end_date, month, year, project_id } = req.query;
    const c = await db();

    let query = `
            SELECT 
                t.id, t.date, t.project_id, p.project_name, p.client_name,
                t.total_hours, t.hours_breakdown, t.work_description, t.notes, 
                t.status, t.submission_date, t.verified_by, t.verified_at,
                t.client_timesheet_file, t.client_timesheet_upload_date
            FROM timesheets t
            JOIN projects p ON t.project_id = p.id
            WHERE t.employee_id = ? AND t.timesheet_type = 'project'
        `;
    const params = [emp.id];

    if (project_id) {
      query += " AND t.project_id = ?";
      params.push(project_id);
    }

    if (start_date && end_date) {
      query += " AND t.date BETWEEN ? AND ?";
      params.push(start_date, end_date);
    } else if (month && year) {
      query += " AND MONTH(t.date) = ? AND YEAR(t.date) = ?";
      params.push(month, year);
    }

    query += " ORDER BY t.date DESC";

    const [timesheets] = await c.query(query, params);
    c.end();

    res.json(timesheets);
  } catch (error) {
    console.error("Error fetching project timesheets:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============ CLIENT TIMESHEET UPLOAD (End of Month) ============ */

// Upload client timesheet for a month
router.post(
  "/client-timesheet/upload",
  auth,
  upload.single("file"),
  async (req, res) => {
    console.log("=== POST /api/timesheets/client-timesheet/upload called ===");
    console.log("req.user:", req.user);
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    try {
      console.log("[UPLOAD] Start client timesheet upload");
      const emp = await findEmployeeByUserId(req.user.id);
      if (!emp) {
        console.log("❌ Employee not found for user ID:", req.user.id);
        return res.status(404).json({ error: "Employee not found" });
      }

      console.log("Employee found:", {
        id: emp.id,
        name: emp.FirstName + " " + emp.LastName,
      });

      if (!req.file) {
        console.log("❌ No file uploaded");
        return res.status(400).json({ error: "Please upload a file" });
      }

      const { month, year, project_id } = req.body;
      console.log("Upload params:", {
        month,
        year,
        project_id,
        employeeId: emp.id,
      });

      const c = await db();

      // Get all timesheets for this month and project
      let timesheets;
      try {
        [timesheets] = await c.query(
          `
            SELECT id, date FROM timesheets 
            WHERE employee_id = ? AND project_id = ? 
            AND MONTH(date) = ? AND YEAR(date) = ?
            AND timesheet_type = 'project'
          `,
          [emp.id, project_id, month, year]
        );
        console.log("Found timesheets:", timesheets.length);
      } catch (err) {
        console.error("[UPLOAD] Error fetching timesheets:", err);
        c.end();
        return res.status(500).json({ error: "DB error fetching timesheets: " + err.message });
      }

      if (timesheets.length === 0) {
        c.end();
        console.log("❌ No internal project-based timesheets found for this employee, project, and month/year");
        return res.status(400).json({
          error: "You must submit at least one project-based timesheet for this project and month before uploading a client timesheet.",
          details: {
            employee_id: emp.id,
            project_id,
            month,
            year,
            requirement: "Submit at least one project-based timesheet for this project and month."
          }
        });
      }

      // Update all timesheets with client timesheet file
      try {
        await c.query(
          `
            UPDATE timesheets 
            SET client_timesheet_file = ?, 
                client_timesheet_upload_date = NOW(),
                client_timesheet_status = 'pending_validation'
            WHERE employee_id = ? AND project_id = ? 
            AND MONTH(date) = ? AND YEAR(date) = ?
            AND timesheet_type = 'project'
          `,
          [req.file.path, emp.id, project_id, month, year]
        );
        console.log("✅ Updated timesheets table with client file reference");
      } catch (err) {
        console.error("[UPLOAD] Error updating timesheets:", err);
        c.end();
        return res.status(500).json({ error: "DB error updating timesheets: " + err.message });
      }

      // Also insert/update record into client_timesheets table for verification queue
      // Use the middle date of the month for timesheet_date
      const midDate = `${year}-${String(month).padStart(2, "0")}-15`;

      // Get work_update_id if exists
      let workUpdates;
      try {
        [workUpdates] = await c.query(
          `
            SELECT id FROM work_updates 
            WHERE employee_id = ? AND project_id = ? 
            AND MONTH(update_date) = ? AND YEAR(update_date) = ?
            ORDER BY update_date DESC LIMIT 1
          `,
          [emp.id, project_id, month, year]
        );
      } catch (err) {
        console.error("[UPLOAD] Error fetching work_updates:", err);
        c.end();
        return res.status(500).json({ error: "DB error fetching work_updates: " + err.message });
      }

      const workUpdateId = workUpdates.length > 0 ? workUpdates[0].id : null;
      console.log("Work update ID:", workUpdateId || "NULL (no work updates for this month)");

      // Check if client_timesheet already exists for this month/project
      let existing;
      try {
        [existing] = await c.query(
          `
            SELECT id FROM client_timesheets
            WHERE employee_id = ? AND project_id = ?
            AND MONTH(timesheet_date) = ? AND YEAR(timesheet_date) = ?
          `,
          [emp.id, project_id, month, year]
        );
      } catch (err) {
        console.error("[UPLOAD] Error checking client_timesheets existence:", err);
        c.end();
        return res.status(500).json({ error: "DB error checking client_timesheets: " + err.message });
      }

      try {
        if (existing.length > 0) {
          // Update existing record
          const existingId = existing[0].id;
          await c.query(
            `
                    UPDATE client_timesheets
                    SET work_update_id = ?, file_name = ?, file_path = ?, 
                        file_type = ?, file_size = ?, uploaded_at = CURRENT_TIMESTAMP,
                        is_verified = 0
                    WHERE id = ?
                `,
            [
              workUpdateId,
              req.file.originalname,
              req.file.path,
              req.file.mimetype,
              req.file.size,
              existingId,
            ]
          );
          console.log("✅ Updated existing client_timesheets record, ID:", existingId);
        } else {
          // Insert new record
          const [insertResult] = await c.query(
            `
                    INSERT INTO client_timesheets (
                        work_update_id, employee_id, project_id, timesheet_date,
                        file_name, file_path, file_type, file_size
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
            [
              workUpdateId,
              emp.id,
              project_id,
              midDate,
              req.file.originalname,
              req.file.path,
              req.file.mimetype,
              req.file.size,
            ]
          );
          console.log("✅ Inserted into client_timesheets table, ID:", insertResult.insertId);
        }
      } catch (insertError) {
        console.error("❌ Failed to insert/update client_timesheets:", insertError.message, insertError.stack);
        c.end();
        return res.status(500).json({ error: "DB error insert/update client_timesheets: " + insertError.message });
      }

      c.end();
      console.log("✅ Client timesheet upload complete");
      res.json({
        success: true,
        message: "Client timesheet uploaded successfully",
        file_path: req.file.path,
        timesheets_updated: timesheets.length,
      });
    } catch (error) {
      console.error("❌ Error uploading client timesheet:", error, error.stack);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get client timesheet status
router.get("/client-timesheet/status", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const { month, year } = req.query;
    const c = await db();

    const [status] = await c.query(
      `
            SELECT 
                t.project_id,
                p.project_name,
                p.client_name,
                COUNT(t.id) as total_days,
                SUM(t.total_hours) as total_hours,
                MAX(t.client_timesheet_file) as client_file,
                MAX(t.client_timesheet_upload_date) as upload_date,
                MAX(t.client_timesheet_status) as validation_status
            FROM timesheets t
            JOIN projects p ON t.project_id = p.id
            WHERE t.employee_id = ? 
            AND MONTH(t.date) = ? AND YEAR(t.date) = ?
            AND t.timesheet_type = 'project'
            GROUP BY t.project_id, p.project_name, p.client_name
        `,
      [emp.id, month, year]
    );

    c.end();

    res.json(status);
  } catch (error) {
    console.error("Error fetching client timesheet status:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============ ADMIN VALIDATION ============ */

// Get timesheets pending validation
router.get("/admin/pending-validation", auth, admin, async (req, res) => {
  try {
    const { month, year, project_id } = req.query;
    const c = await db();

    let query = `
            SELECT 
                e.id as employee_id,
                e.EmployeeNumber,
                e.FirstName,
                e.LastName,
                t.project_id,
                p.project_name,
                p.client_name,
                COUNT(t.id) as total_days,
                SUM(t.total_hours) as internal_total_hours,
                MAX(t.client_timesheet_file) as client_file,
                MAX(t.client_timesheet_upload_date) as upload_date,
                MAX(t.client_timesheet_status) as validation_status
            FROM timesheets t
            JOIN employees e ON t.employee_id = e.id
            JOIN projects p ON t.project_id = p.id
            WHERE t.timesheet_type = 'project'
            AND t.client_timesheet_file IS NOT NULL
            AND t.client_timesheet_status = 'pending_validation'
        `;
    const params = [];

    if (month && year) {
      query += " AND MONTH(t.date) = ? AND YEAR(t.date) = ?";
      params.push(month, year);
    }

    if (project_id) {
      query += " AND t.project_id = ?";
      params.push(project_id);
    }

    query += " GROUP BY e.id, t.project_id ORDER BY upload_date DESC";

    const [pending] = await c.query(query, params);
    c.end();

    res.json(pending);
  } catch (error) {
    console.error("Error fetching pending validation:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed comparison for validation
router.get(
  "/admin/validation-details/:employeeId/:projectId/:month/:year",
  auth,
  admin,
  async (req, res) => {
    try {
      const { employeeId, projectId, month, year } = req.params;
      const c = await db();

      // Get all internal timesheets
      const [internal] = await c.query(
        `
            SELECT 
                t.id,
                t.date,
                t.total_hours,
                t.hours_breakdown,
                t.work_description,
                t.status,
                t.submission_date
            FROM timesheets t
            WHERE t.employee_id = ? AND t.project_id = ?
            AND MONTH(t.date) = ? AND YEAR(t.date) = ?
            AND t.timesheet_type = 'project'
            ORDER BY t.date
        `,
        [employeeId, projectId, month, year]
      );

      // Get client timesheet info
      const [client] = await c.query(
        `
            SELECT 
                client_timesheet_file,
                client_timesheet_upload_date,
                client_timesheet_status
            FROM timesheets
            WHERE employee_id = ? AND project_id = ?
            AND MONTH(date) = ? AND YEAR(date) = ?
            AND client_timesheet_file IS NOT NULL
            LIMIT 1
        `,
        [employeeId, projectId, month, year]
      );

      // Get employee and project info
      const [empInfo] = await c.query(
        `
            SELECT 
                e.EmployeeNumber, e.FirstName, e.LastName, e.Email,
                p.project_name, p.client_name, p.project_code
            FROM employees e, projects p
            WHERE e.id = ? AND p.id = ?
        `,
        [employeeId, projectId]
      );

      c.end();

      res.json({
        employee: empInfo[0] || null,
        internal_timesheets: internal,
        internal_summary: {
          total_days: internal.length,
          total_hours: internal.reduce(
            (sum, t) => sum + parseFloat(t.total_hours || 0),
            0
          ),
        },
        client_timesheet: client[0] || null,
      });
    } catch (error) {
      console.error("Error fetching validation details:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Validate and approve timesheets
router.post("/admin/validate", auth, admin, async (req, res) => {
  try {
    const {
      employee_id,
      project_id,
      month,
      year,
      validation_status,
      remarks,
      client_hours,
    } = req.body;

    const c = await db();

    // Update all timesheets for this employee/project/month
    await c.query(
      `
            UPDATE timesheets 
            SET client_timesheet_status = ?,
                validation_remarks = ?,
                client_reported_hours = ?,
                validated_by = ?,
                validated_at = NOW()
            WHERE employee_id = ? AND project_id = ?
            AND MONTH(date) = ? AND YEAR(date) = ?
            AND timesheet_type = 'project'
        `,
      [
        validation_status,
        remarks,
        client_hours,
        req.user.id,
        employee_id,
        project_id,
        month,
        year,
      ]
    );

    c.end();

    res.json({
      success: true,
      message: `Timesheets ${
        validation_status === "validated" ? "validated" : "rejected"
      } successfully`,
    });
  } catch (error) {
    console.error("Error validating timesheets:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get validation statistics
router.get("/admin/validation-stats", auth, admin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const c = await db();

    const [stats] = await c.query(
      `
            SELECT 
                COUNT(DISTINCT CONCAT(employee_id, '-', project_id, '-', MONTH(date), '-', YEAR(date))) as total_submissions,
                COUNT(DISTINCT CASE WHEN client_timesheet_status = 'pending_validation' 
                    THEN CONCAT(employee_id, '-', project_id, '-', MONTH(date), '-', YEAR(date)) END) as pending,
                COUNT(DISTINCT CASE WHEN client_timesheet_status = 'validated' 
                    THEN CONCAT(employee_id, '-', project_id, '-', MONTH(date), '-', YEAR(date)) END) as validated,
                COUNT(DISTINCT CASE WHEN client_timesheet_status = 'rejected' 
                    THEN CONCAT(employee_id, '-', project_id, '-', MONTH(date), '-', YEAR(date)) END) as rejected
            FROM timesheets
            WHERE timesheet_type = 'project'
            AND client_timesheet_file IS NOT NULL
            ${month && year ? "AND MONTH(date) = ? AND YEAR(date) = ?" : ""}
        `,
      month && year ? [month, year] : []
    );

    c.end();

    res.json(
      stats[0] || {
        total_submissions: 0,
        pending: 0,
        validated: 0,
        rejected: 0,
      }
    );
  } catch (error) {
    console.error("Error fetching validation stats:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============ MANAGER TIMESHEET APPROVAL ============ */

// Get team statistics for manager
router.get("/manager/team-statistics", auth, async (req, res) => {
  try {
    const manager = await findEmployeeByUserId(req.user.id);
    if (!manager) return res.status(404).json({ error: "Manager not found" });

    console.log(
      "📊 Team Statistics Request - Manager ID:",
      manager.id,
      "Manager Name:",
      manager.FirstName,
      manager.LastName
    );

    const { start_date, end_date } = req.query;
    console.log("📅 Date Range:", { start_date, end_date });

    const c = await db();

    // Get total team size (employees reporting to this manager)
    const [teamCount] = await c.query(
      `
            SELECT COUNT(*) as team_size
            FROM employees
            WHERE reporting_manager_id = ?
            AND EmploymentStatus = 'Working'
        `,
      [manager.id]
    );

    console.log("👥 Team Size Query Result:", teamCount[0]);

    // Determine date range for timesheet statistics
    let dateCondition = "";
    let dateParams = [];

    if (start_date && end_date) {
      dateCondition = "AND t.date BETWEEN ? AND ?";
      dateParams = [start_date, end_date];
    } else {
      // Default to current month if no date range provided
      dateCondition =
        "AND MONTH(t.date) = MONTH(CURDATE()) AND YEAR(t.date) = YEAR(CURDATE())";
    }

    // Get employees who have submitted at least one timesheet in the date range
    const submittedQuery = `
            SELECT COUNT(DISTINCT t.employee_id) as submitted_count
            FROM timesheets t
            INNER JOIN employees e ON t.employee_id = e.id
            WHERE e.reporting_manager_id = ?
            AND e.EmploymentStatus = 'Working'
            AND t.status IN ('submitted', 'verified')
            ${dateCondition}
        `;

    console.log("📝 Submitted Query:", submittedQuery);
    console.log("📝 Submitted Params:", [manager.id, ...dateParams]);

    const [submittedCount] = await c.query(submittedQuery, [
      manager.id,
      ...dateParams,
    ]);
    console.log("✅ Submitted Count Result:", submittedCount[0]);

    // Get pending approval count (only submitted, not yet verified)
    const pendingQuery = `
            SELECT COUNT(*) as pending_count
            FROM timesheets t
            INNER JOIN employees e ON t.employee_id = e.id
            WHERE e.reporting_manager_id = ?
            AND e.EmploymentStatus = 'Working'
            AND t.status = 'submitted'
            ${dateCondition}
        `;

    console.log("⏳ Pending Query:", pendingQuery);
    console.log("⏳ Pending Params:", [manager.id, ...dateParams]);

    const [pendingCount] = await c.query(pendingQuery, [
      manager.id,
      ...dateParams,
    ]);
    console.log("⏳ Pending Count Result:", pendingCount[0]);

    const teamSize = teamCount[0]?.team_size || 0;
    const submitted = submittedCount[0]?.submitted_count || 0;
    const notSubmitted = teamSize - submitted;

    // Debug: Get team members list for verification
    const [teamMembers] = await c.query(
      `
            SELECT id, EmployeeNumber, FirstName, LastName, reporting_manager_id, EmploymentStatus
            FROM employees
            WHERE reporting_manager_id = ?
            AND EmploymentStatus = 'Working'
        `,
      [manager.id]
    );

    console.log(
      "👥 Team Members List:",
      teamMembers.map((m) => ({
        id: m.id,
        name: `${m.FirstName} ${m.LastName}`,
        emp_no: m.EmployeeNumber,
      }))
    );

    // Debug: Check if there are any timesheets at all for the team
    const [allTimesheets] = await c.query(
      `
            SELECT 
                t.employee_id,
                e.FirstName,
                e.LastName,
                COUNT(*) as timesheet_count,
                t.status,
                MIN(t.date) as earliest_date,
                MAX(t.date) as latest_date
            FROM timesheets t
            INNER JOIN employees e ON t.employee_id = e.id
            WHERE e.reporting_manager_id = ?
            GROUP BY t.employee_id, t.status, e.FirstName, e.LastName
        `,
      [manager.id]
    );

    console.log("📋 All Timesheets Summary:", allTimesheets);

    c.end();

    const response = {
      team_size: teamSize,
      submitted_count: submitted,
      not_submitted_count: notSubmitted,
      pending_approvals: pendingCount[0]?.pending_count || 0,
      date_range:
        start_date && end_date ? { start_date, end_date } : "current_month",
      manager_id: manager.id,
      manager_name: `${manager.FirstName} ${manager.LastName}`,
    };

    console.log("📤 Response:", response);

    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching team statistics:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending timesheets for manager's team
router.get("/manager/pending-timesheets", auth, async (req, res) => {
  try {
    const manager = await findEmployeeByUserId(req.user.id);
    if (!manager) return res.status(404).json({ error: "Manager not found" });

    const { start_date, end_date, timesheet_type } = req.query;
    const c = await db();

    // Get timesheets from employees reporting to this manager
    let query = `
            SELECT 
                t.*,
                e.EmployeeNumber,
                e.FirstName,
                e.LastName,
                e.WorkEmail,
                p.project_name,
                p.project_code,
                p.client_name
            FROM timesheets t
            INNER JOIN employees e ON t.employee_id = e.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE e.reporting_manager_id = ?
            AND t.status = 'submitted'
        `;
    const params = [manager.id];

    if (timesheet_type) {
      query += " AND t.timesheet_type = ?";
      params.push(timesheet_type);
    }

    if (start_date && end_date) {
      query += " AND t.date BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }

    query += " ORDER BY t.submission_date DESC, e.FirstName ASC";

    const [timesheets] = await c.query(query, params);
    c.end();

    res.json(timesheets);
  } catch (error) {
    console.error("Error fetching pending timesheets:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get team member's timesheets (for manager review)
router.get("/manager/team-timesheets/:employeeId", auth, async (req, res) => {
  try {
    const manager = await findEmployeeByUserId(req.user.id);
    if (!manager) return res.status(404).json({ error: "Manager not found" });

    const { start_date, end_date, month, year } = req.query;
    const c = await db();

    // Verify the employee reports to this manager
    const [emp] = await c.query(
      "SELECT id FROM employees WHERE id = ? AND reporting_manager_id = ?",
      [req.params.employeeId, manager.id]
    );

    if (emp.length === 0) {
      c.end();
      return res
        .status(403)
        .json({
          error: "You can only view timesheets for your direct reports",
        });
    }

    let query = `
            SELECT 
                t.*,
                p.project_name,
                p.project_code,
                p.client_name
            FROM timesheets t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.employee_id = ?
        `;
    const params = [req.params.employeeId];

    if (start_date && end_date) {
      query += " AND t.date BETWEEN ? AND ?";
      params.push(start_date, end_date);
    } else if (month && year) {
      query += " AND MONTH(t.date) = ? AND YEAR(t.date) = ?";
      params.push(month, year);
    }

    query += " ORDER BY t.date DESC";

    const [timesheets] = await c.query(query, params);
    c.end();

    res.json(timesheets);
  } catch (error) {
    console.error("Error fetching team timesheets:", error);
    res.status(500).json({ error: error.message });
  }
});

// Approve timesheet (Manager)
router.put("/manager/approve/:timesheetId", auth, async (req, res) => {
  try {
    const manager = await findEmployeeByUserId(req.user.id);
    if (!manager) return res.status(404).json({ error: "Manager not found" });

    const c = await db();

    // Get timesheet with employee info
    const [timesheets] = await c.query(
      `SELECT t.*, e.reporting_manager_id 
             FROM timesheets t
             JOIN employees e ON t.employee_id = e.id
             WHERE t.id = ?`,
      [req.params.timesheetId]
    );

    if (timesheets.length === 0) {
      c.end();
      return res.status(404).json({ error: "Timesheet not found" });
    }

    const timesheet = timesheets[0];

    // Check authorization: HR/Admin can approve any, Manager can only approve their team's timesheets
    const isHR = ["admin", "hr"].includes(req.user.role);
    const isReportingManager = timesheet.reporting_manager_id === manager.id;

    if (!isHR && !isReportingManager) {
      c.end();
      return res
        .status(403)
        .json({
          error: "You can only approve timesheets for your direct reports",
        });
    }

    // Update timesheet status
    await c.query(
      `UPDATE timesheets 
             SET status = 'verified', verified_by = ?, verified_at = NOW()
             WHERE id = ?`,
      [req.user.id, req.params.timesheetId]
    );

    c.end();
    res.json({ success: true, message: "Timesheet verified successfully" });
  } catch (error) {
    console.error("Error approving timesheet:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reject timesheet (Manager)
router.put("/manager/reject/:timesheetId", auth, async (req, res) => {
  try {
    const manager = await findEmployeeByUserId(req.user.id);
    if (!manager) return res.status(404).json({ error: "Manager not found" });

    const { rejection_reason } = req.body;
    const c = await db();

    // Get timesheet with employee info
    const [timesheets] = await c.query(
      `SELECT t.*, e.reporting_manager_id 
             FROM timesheets t
             JOIN employees e ON t.employee_id = e.id
             WHERE t.id = ?`,
      [req.params.timesheetId]
    );

    if (timesheets.length === 0) {
      c.end();
      return res.status(404).json({ error: "Timesheet not found" });
    }

    const timesheet = timesheets[0];

    // Check authorization: HR/Admin can reject any, Manager can only reject their team's timesheets
    const isHR = ["admin", "hr"].includes(req.user.role);
    const isReportingManager = timesheet.reporting_manager_id === manager.id;

    if (!isHR && !isReportingManager) {
      c.end();
      return res
        .status(403)
        .json({
          error: "You can only reject timesheets for your direct reports",
        });
    }

    // Update timesheet status
    await c.query(
      `UPDATE timesheets 
             SET status = 'rejected', verified_by = ?, verified_at = NOW(), validation_remarks = ?
             WHERE id = ?`,
      [req.user.id, rejection_reason, req.params.timesheetId]
    );

    c.end();
    res.json({ success: true, message: "Timesheet rejected successfully" });
  } catch (error) {
    console.error("Error rejecting timesheet:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Team Timesheet Report (HR/Manager) - Regular & Project
 */
router.get("/team-report", auth, async (req, res) => {
  try {
    const currentEmp = await findEmployeeByUserId(req.user.id);
    if (!currentEmp) return res.status(404).json({ error: "Employee not found" });

    const { startDate, endDate, status } = req.query;
    const c = await db();

    // HR/Admin see all, Managers see only their team
    const isHR = ["admin", "hr"].includes(req.user.role);
    
    let query = `
            SELECT 
                t.*,
                p.project_name,
                p.project_code,
                e.EmployeeNumber,
                e.FirstName,
                e.LastName,
                e.FullName,
                e.WorkEmail,
                e.profile_image
            FROM timesheets t
            INNER JOIN employees e ON t.employee_id = e.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE 1=1`;

    const params = [];

    if (!isHR) {
      query += ` AND e.reporting_manager_id = ?`;
      params.push(currentEmp.id);
    }

    if (startDate && endDate) {
      query += ` AND t.date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status.toLowerCase());
    }

    query += ` ORDER BY t.date DESC, e.FirstName ASC`;

    const [timesheets] = await c.query(query, params);

    c.end();
    res.json(timesheets);
  } catch (error) {
    console.error("Error fetching team timesheet report:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Client Timesheet Report (HR/Manager)
 */
router.get("/client-timesheet-report", auth, async (req, res) => {
  try {
    const currentEmp = await findEmployeeByUserId(req.user.id);
    if (!currentEmp)
      return res.status(404).json({ error: "Employee not found" });

    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: "Month and Year are required" });
    }

    const c = await db();

    // HR/Admin see all, Managers see only their team
    const isHR = ["admin", "hr"].includes(req.user.role);

    let query = `
            SELECT 
                e.id as employee_id,
                e.EmployeeNumber,
                e.FirstName,
                e.LastName,
                e.FullName,
                t.project_id,
                p.project_name,
                p.project_code,
                p.client_name,
                COUNT(t.id) as total_days,
                SUM(t.total_hours) as internal_total_hours,
                MAX(t.client_timesheet_file) as client_file,
                MAX(t.client_timesheet_upload_date) as upload_date,
                MAX(t.client_timesheet_status) as validation_status
            FROM timesheets t
            INNER JOIN employees e ON t.employee_id = e.id
            INNER JOIN projects p ON t.project_id = p.id
            WHERE t.timesheet_type = 'project'
            AND MONTH(t.date) = ? AND YEAR(t.date) = ?
    `;

    const params = [parseInt(month), parseInt(year)];

    if (!isHR) {
      query += ` AND e.reporting_manager_id = ?`;
      params.push(currentEmp.id);
    }

    query += `
      GROUP BY 
        e.id, e.EmployeeNumber, e.FirstName, e.LastName, e.FullName, 
        t.project_id, p.project_name, p.project_code, p.client_name 
      ORDER BY e.FirstName ASC, p.project_name ASC`;

    const [report] = await c.query(query, params);
    c.end();

    res.json(report);
  } catch (error) {
    console.error("Error fetching client timesheet report:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

