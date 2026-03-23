/**
 * EMPLOYEE ROUTES
 * Handles all employee CRUD operations, search, and management
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { db } = require("../config/database");
const { auth, admin, hr, manager } = require("../middleware/auth");
const {
  findEmployeeByUserId,
  filterEmployeeUpdateData,
  canViewEmployee,
  maskSensitiveData
} = require("../utils/helpers");

// Configure multer for profile image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/profile_images/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadProfileImage = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

/* ============ EMPLOYEE MASTER ============ */

// Get all employees with pagination & filters
router.get("/", auth, async (req, res) => {
  const c = await db();
  const [r] = await c.query(`
    SELECT 
        e.*, 
        d.name as department_name, 
        des.name as designation_name 
    FROM employees e
    LEFT JOIN departments d ON e.DepartmentId = d.id
    LEFT JOIN designations des ON e.DesignationId = des.id
    ORDER BY e.id DESC
  `);
  c.end();
  res.json(r);
});

// Get my team (reporting team if manager, co-team if employee)
router.get("/my-team/list", auth, async (req, res) => {
  console.log("=== GET /my-team/list called ===");
  console.log("User ID:", req.user?.id);
  console.log("User Role:", req.user?.role);

  try {
    const emp = await findEmployeeByUserId(req.user.id);
    console.log(
      "Employee found:",
      emp ? `${emp.FirstName} ${emp.LastName} (ID: ${emp.id})` : "NOT FOUND",
    );

    if (!emp) {
      console.log("Employee not found for user ID:", req.user.id);
      return res.status(404).json({ error: "Employee not found" });
    }

    const c = await db();

    // NEW: If user is HR or Admin, return ALL working employees
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    if (userRole === 'hr' || userRole === 'admin') {
      console.log(`User role is ${req.user.role}, fetching all working employees`);
      const [allEmployees] = await c.query(
        `SELECT 
                e.*,
                d.name as department_name,
                des.name as designation_name,
                l.name as location_name
             FROM employees e
             LEFT JOIN departments d ON e.DepartmentId = d.id
             LEFT JOIN designations des ON e.DesignationId = des.id
             LEFT JOIN locations l ON e.LocationId = l.id
             WHERE e.EmploymentStatus = 'Working'
             ORDER BY e.FirstName, e.LastName`
      );

      console.log("Total employees returned for HR/Admin:", allEmployees.length);
      c.end();
      return res.json({
        type: "all_employees",
        team: allEmployees,
        message: "All Employees (HR/Admin View)",
      });
    }

    // Check if user is a manager (has reporting team members) - only working employees
    console.log("Checking reporting team for employee ID:", emp.id);
    const [reportingTeam] = await c.query(
      `SELECT 
                e.*,
                d.name as department_name,
                des.name as designation_name,
                l.name as location_name
             FROM employees e
             LEFT JOIN departments d ON e.DepartmentId = d.id
             LEFT JOIN designations des ON e.DesignationId = des.id
             LEFT JOIN locations l ON e.LocationId = l.id
             WHERE e.reporting_manager_id = ? AND e.EmploymentStatus = 'Working'
             ORDER BY e.FirstName, e.LastName`,
      [emp.id],
    );

    console.log("Reporting team count:", reportingTeam.length);

    // If has reporting team, return them
    if (reportingTeam.length > 0) {
      c.end();
      console.log("Returning reporting team:", reportingTeam.length, "members");
      return res.json({
        type: "reporting_team",
        team: reportingTeam,
        message: "Your reporting team",
      });
    }

    // Otherwise, return co-team members (people with same reporting manager) - only working employees
    console.log("Employee reporting_manager_id:", emp.reporting_manager_id);
    if (emp.reporting_manager_id) {
      const [coTeam] = await c.query(
        `SELECT 
                    e.*,
                    d.name as department_name,
                    des.name as designation_name,
                    l.name as location_name
                 FROM employees e
                 LEFT JOIN departments d ON e.DepartmentId = d.id
                 LEFT JOIN designations des ON e.DesignationId = des.id
                 LEFT JOIN locations l ON e.LocationId = l.id
                 WHERE e.reporting_manager_id = ? AND e.id != ? AND e.EmploymentStatus = 'Working'
                 ORDER BY e.FirstName, e.LastName`,
        [emp.reporting_manager_id, emp.id],
      );

      console.log("Co-team count:", coTeam.length);
      c.end();
      return res.json({
        type: "co_team",
        team: coTeam,
        message: "Your team members",
      });
    }

    // No team found
    console.log("No team found");
    c.end();
    res.json({
      type: "none",
      team: [],
      message: "No team members found",
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ error: error.message || "Failed to fetch team" });
  }
});

// Create new employee
router.post("/", auth, admin, async (req, res) => {
  const c = await db();
  const data = { ...req.body, created_at: new Date() };
  const [result] = await c.query("INSERT INTO employees SET ?", data);
  c.end();
  res.json({ id: result.insertId, ...data });
});

// Get single employee
router.get("/:id", auth, async (req, res) => {
  const c = await db();
  const [r] = await c.query("SELECT * FROM employees WHERE id = ?", [
    req.params.id,
  ]);
  c.end();
  res.json(r[0] || null);
});

// Get detailed employee information with all relationships
router.get("/:id/details", auth, async (req, res) => {
  let c = null;

  try {
    // SECURITY: Check if user is authorized to view this employee
    const requestedEmployeeId = parseInt(req.params.id);
    const canView = await canViewEmployee(req.user.id, requestedEmployeeId, req.user.role);

    if (!canView) {
      return res.status(403).json({
        error: "Unauthorized to view this employee's details"
      });
    }

    c = await db();

    // Get employee with all master data
    const [employee] = await c.query(
      `SELECT 
              e.*,
              l.name as location_name,
              d.name as department_name,
              sd.name as sub_department_name,
              des.name as designation_name,
              des2.name as secondary_designation_name,
              bu.name as business_unit_name,
              le.name as legal_entity_name,
              b.name as band_name,
              pg.name as pay_grade_name,
              cc.code as cost_center_code,
              mgr.FirstName as manager_first_name,
              mgr.LastName as manager_last_name,
              mgr.EmployeeNumber as manager_employee_number,
              lp.name as leave_plan_name,
              sp.name as shift_policy_name,
              wop.name as weekly_off_policy_name,
              ap.name as attendance_policy_name,
              acs.name as attendance_capture_scheme_name,
              hl.name as holiday_list_name,
              ep.name as expense_policy_name
           FROM employees e
           LEFT JOIN locations l ON e.LocationId = l.id
           LEFT JOIN departments d ON e.DepartmentId = d.id
           LEFT JOIN sub_departments sd ON e.SubDepartmentId = sd.id
           LEFT JOIN designations des ON e.DesignationId = des.id
           LEFT JOIN designations des2 ON e.SecondaryDesignationId = des2.id
           LEFT JOIN business_units bu ON e.BusinessUnitId = bu.id
           LEFT JOIN legal_entities le ON e.LegalEntityId = le.id
           LEFT JOIN bands b ON e.BandId = b.id
           LEFT JOIN pay_grades pg ON e.PayGradeId = pg.id
           LEFT JOIN cost_centers cc ON e.CostCenterId = cc.id
           LEFT JOIN employees mgr ON e.reporting_manager_id = mgr.id
           LEFT JOIN leave_plans lp ON e.leave_plan_id = lp.id
           LEFT JOIN shift_policies sp ON e.shift_policy_id = sp.id
           LEFT JOIN weekly_off_policies wop ON e.weekly_off_policy_id = wop.id
           LEFT JOIN attendance_policies ap ON e.attendance_policy_id = ap.id
           LEFT JOIN attendance_capture_schemes acs ON e.attendance_capture_scheme_id = acs.id
           LEFT JOIN holiday_lists hl ON e.holiday_list_id = hl.id
           LEFT JOIN expense_policies ep ON e.expense_policy_id = ep.id
           WHERE e.id = ?`,
      [requestedEmployeeId],
    );

    if (employee.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Get recent attendance (last 30 days)
    const [attendance] = await c.query(
      `SELECT attendance_date, first_check_in, last_check_out, total_work_hours as total_hours, work_mode, status 
           FROM attendance 
           WHERE employee_id = ? AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         ORDER BY attendance_date DESC`,
      [requestedEmployeeId],
    );

    // Get leave balance
    const [leaves] = await c.query(
      `SELECT leave_type, COUNT(*) as used 
           FROM leaves 
           WHERE employee_id = ? AND status = 'approved' AND YEAR(start_date) = YEAR(CURDATE())
           GROUP BY leave_type`,
      [requestedEmployeeId],
    );

    // Get pending requests
    const [pending] = await c.query(
      `SELECT id, leave_type, start_date, end_date, status, applied_at 
           FROM leaves 
           WHERE employee_id = ? AND status = 'pending'
           ORDER BY applied_at DESC`,
      [requestedEmployeeId],
    );

    // SECURITY: Mask sensitive data based on user role and relationship
    const isSelf = employee[0].id === requestedEmployeeId;
    const maskedEmployee = maskSensitiveData(employee[0], req.user.role, isSelf);

    res.json({
      employee: maskedEmployee,
      attendance_summary: {
        recent_records: attendance,
        total_present_days: attendance.filter((a) => a.status === "present")
          .length,
        wfh_days: attendance.filter((a) => a.work_mode === "WFH").length,
        remote_days: attendance.filter((a) => a.work_mode === "Remote").length,
      },
      leave_summary: leaves,
      pending_requests: pending,
    });
  } catch (error) {
    console.error("Error fetching employee details:", error);
    res.status(500).json({ error: "Failed to fetch employee details" });
  } finally {
    if (c) await c.end();
  }
});

// Update employee
router.put("/:id", auth, hr, async (req, res) => {
  // Only allow valid columns to be updated
  const allowedFields = [
    "reporting_manager_id",
    "leave_plan_id",
    "shift_policy_id",
    "attendance_policy_id",
    "weekly_off_policy_id",
    "PayGradeId",
    "DepartmentId",
    "lpa",
  ];
  const updateData = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
    }
  }

  console.log(`[PUT /employees/${req.params.id}] Body received:`, JSON.stringify(req.body));
  console.log(`[PUT /employees/${req.params.id}] Filtered updateData:`, JSON.stringify(updateData));

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const c = await db();
    const [result] = await c.query("UPDATE employees SET ? WHERE id = ?", [
      updateData,
      req.params.id,
    ]);
    c.end();
    console.log(`[PUT /employees/${req.params.id}] Rows affected: ${result.affectedRows}`);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ success: true, updated: updateData });
  } catch (err) {
    console.error(`[PUT /employees/${req.params.id}] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete employee
router.delete("/:id", auth, admin, async (req, res) => {
  const c = await db();
  await c.query("DELETE FROM employees WHERE id = ?", [req.params.id]);
  c.end();
  res.json({ success: true });
});

// Deactivate employee
router.put("/:id/deactivate", auth, hr, async (req, res) => {
  const c = await db();
  await c.query("UPDATE employees SET status = 'inactive' WHERE id = ?", [
    req.params.id,
  ]);
  c.end();
  res.json({ success: true });
});

// Get reporting manager's team
router.get("/reporting/:managerId", auth, async (req, res) => {
  const c = await db();
  const [r] = await c.query(
    "SELECT * FROM employees WHERE reporting_manager_id = ?",
    [req.params.managerId],
  );
  c.end();
  res.json(r);
});

// Employee search
router.get("/search/query", auth, async (req, res) => {
  const q = req.query.q || "";
  const c = await db();
  const [r] = await c.query(
    "SELECT * FROM employees WHERE FirstName LIKE ? OR LastName LIKE ? OR WorkEmail LIKE ? LIMIT 20",
    [`%${q}%`, `%${q}%`, `%${q}%`],
  );
  c.end();
  res.json(r);
});

/* ============ EMPLOYEE PROFILE ============ */

// Get my profile
router.get("/profile/me", auth, async (req, res) => {
  const emp = await findEmployeeByUserId(req.user.id);
  if (!emp) return res.status(404).json({ error: "Employee not found" });

  const c = await db();
  const [rows] = await c.query(
    `SELECT 
            e.*,
            l.name as location_name,
            d.name as department_name,
            sd.name as sub_department_name,
            des.name as designation_name,
            des2.name as secondary_designation_name,
            bu.name as business_unit_name,
            le.name as legal_entity_name,
            b.name as band_name,
            pg.name as pay_grade_name,
            mgr.FirstName as manager_first_name,
            mgr.LastName as manager_last_name
         FROM employees e
         LEFT JOIN locations l ON e.LocationId = l.id
         LEFT JOIN departments d ON e.DepartmentId = d.id
         LEFT JOIN sub_departments sd ON e.SubDepartmentId = sd.id
         LEFT JOIN designations des ON e.DesignationId = des.id
         LEFT JOIN designations des2 ON e.SecondaryDesignationId = des2.id
         LEFT JOIN business_units bu ON e.BusinessUnitId = bu.id
         LEFT JOIN legal_entities le ON e.LegalEntityId = le.id
         LEFT JOIN bands b ON e.BandId = b.id
         LEFT JOIN pay_grades pg ON e.PayGradeId = pg.id
         LEFT JOIN employees mgr ON e.reporting_manager_id = mgr.id
         WHERE e.id = ?`,
    [emp.id],
  );
  c.end();

  if (rows.length === 0)
    return res.status(404).json({ error: "Profile not found" });
  res.json(rows[0]);
});

// Update my profile
router.put("/profile/me", auth, async (req, res) => {
  let c = null;

  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    // SECURITY: Filter update data to only allow safe fields for self-update
    const updateData = filterEmployeeUpdateData(req.body, req.user.role, true);

    // If no valid fields to update, return error
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "No valid fields to update",
        hint: "You can only update: PhoneNumber, PersonalEmail, current_address fields, MaritalStatus, BloodGroup"
      });
    }

    c = await db();
    await c.query("UPDATE employees SET ? WHERE id = ?", [updateData, emp.id]);

    res.json({
      success: true,
      message: "Profile updated successfully",
      updatedFields: Object.keys(updateData)
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res
      .status(500)
      .json({ error: "Failed to update profile" });
  } finally {
    if (c) await c.end();
  }
});

// Upload profile image
router.post(
  "/profile/image",
  auth,
  uploadProfileImage.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded" });
      }

      const emp = await findEmployeeByUserId(req.user.id);
      if (!emp) return res.status(404).json({ error: "Employee not found" });

      // Save the image path (relative to server root)
      const imagePath = `/uploads/profile_images/${req.file.filename}`;

      const c = await db();
      await c.query("UPDATE employees SET profile_image = ? WHERE id = ?", [
        imagePath,
        emp.id,
      ]);
      c.end();

      res.json({
        success: true,
        message: "Profile image uploaded successfully",
        imagePath: imagePath,
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to upload profile image" });
    }
  },
);

// Get profile image
router.get("/profile/image/:employeeId", auth, async (req, res) => {
  try {
    const c = await db();
    const [rows] = await c.query(
      "SELECT profile_image FROM employees WHERE id = ?",
      [req.params.employeeId],
    );
    c.end();

    if (rows.length === 0 || !rows[0].profile_image) {
      return res.status(404).json({ error: "Profile image not found" });
    }

    res.json({ imagePath: rows[0].profile_image });
  } catch (error) {
    console.error("Error fetching profile image:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch profile image" });
  }
});

// Get reporting team (employees who report to the logged-in user)
router.get("/my-team/reporting", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    const c = await db();
    const [reportingTeam] = await c.query(
      `SELECT 
                e.*, d.name as department_name, des.name as designation_name, l.name as location_name
             FROM employees e
             LEFT JOIN departments d ON e.DepartmentId = d.id
             LEFT JOIN designations des ON e.DesignationId = des.id
             LEFT JOIN locations l ON e.LocationId = l.id
             WHERE e.reporting_manager_id = ? AND e.EmploymentStatus = 'Working'
             ORDER BY e.FirstName, e.LastName`,
      [emp.id],
    );
    c.end();
    res.json({ team: reportingTeam, message: "Your reporting team" });
  } catch (error) {
    console.error("Error fetching reporting team:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch reporting team" });
  }
});

// Get co-team (employees who share the same reporting manager as the logged-in user)
router.get("/my-team/co-team", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    if (!emp.reporting_manager_id)
      return res.json({ team: [], message: "No co-team members found" });
    const c = await db();
    const [coTeam] = await c.query(
      `SELECT 
                e.*, d.name as department_name, des.name as designation_name, l.name as location_name
             FROM employees e
             LEFT JOIN departments d ON e.DepartmentId = d.id
             LEFT JOIN designations des ON e.DesignationId = des.id
             LEFT JOIN locations l ON e.LocationId = l.id
             WHERE e.reporting_manager_id = ? AND e.id != ? AND e.EmploymentStatus = 'Working'
             ORDER BY e.FirstName, e.LastName`,
      [emp.reporting_manager_id, emp.id],
    );
    c.end();
    res.json({ team: coTeam, message: "Your co-team members" });
  } catch (error) {
    console.error("Error fetching co-team:", error);
    res.status(500).json({ error: error.message || "Failed to fetch co-team" });
  }
});

// Get reporting team (employees who report to the given employee ID)
router.get("/my-team/reporting/:employeeId", auth, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const c = await db();
    const [reportingTeam] = await c.query(
      `SELECT 
                e.*, d.name as department_name, des.name as designation_name, l.name as location_name
             FROM employees e
             LEFT JOIN departments d ON e.DepartmentId = d.id
             LEFT JOIN designations des ON e.DesignationId = des.id
             LEFT JOIN locations l ON e.LocationId = l.id
             WHERE e.reporting_manager_id = ? AND e.EmploymentStatus = 'Working'
             ORDER BY e.FirstName, e.LastName`,
      [employeeId],
    );
    c.end();
    res.json({
      team: reportingTeam,
      message: "Reporting team for employee " + employeeId,
    });
  } catch (error) {
    console.error("Error fetching reporting team by employeeId:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch reporting team" });
  }
});

// Get co-team (employees who share the same reporting manager as the given employee ID)
router.get("/my-team/co-team/:employeeId", auth, async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const c = await db();
    // Get the reporting manager id for the given employee
    const [empRows] = await c.query(
      "SELECT reporting_manager_id FROM employees WHERE id = ?",
      [employeeId],
    );
    if (!empRows.length || !empRows[0].reporting_manager_id) {
      c.end();
      return res.json({ team: [], message: "No co-team members found" });
    }
    const reportingManagerId = empRows[0].reporting_manager_id;
    const [coTeam] = await c.query(
      `SELECT 
                e.*, d.name as department_name, des.name as designation_name, l.name as location_name
             FROM employees e
             LEFT JOIN departments d ON e.DepartmentId = d.id
             LEFT JOIN designations des ON e.DesignationId = des.id
             LEFT JOIN locations l ON e.LocationId = l.id
             WHERE e.reporting_manager_id = ? AND e.id != ? AND e.EmploymentStatus = 'Working'
             ORDER BY e.FirstName, e.LastName`,
      [reportingManagerId, employeeId],
    );
    c.end();
    res.json({
      team: coTeam,
      message: "Co-team members for employee " + employeeId,
    });
  } catch (error) {
    console.error("Error fetching co-team by employeeId:", error);
    res.status(500).json({ error: error.message || "Failed to fetch co-team" });
  }
});

module.exports = router;
