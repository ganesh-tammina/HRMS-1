const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../config/database");
const { JWT_SECRET } = require("../config/constants");
const { auth, hr } = require("../middleware/auth");

// LOGIN
router.post("/login", async (req, res) => {
  let c = null;
  try {
    c = await db();
    const [u] = await c.query("SELECT * FROM users WHERE username=?", [
      req.body.username,
    ]);
    
    if (!u.length)
      return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(req.body.password, u[0].password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: u[0].id, role: u[0].role }, JWT_SECRET, {
      expiresIn: "8h",
    });

    res.json({
      token,
      user: { id: u[0].id, username: u[0].username, role: u[0].role },
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed", message: error.message });
  } finally {
    if (c) await c.end();
  }
});

// Logout
router.post("/logout", auth, async (req, res) => {
  let c = null;
  try {
    c = await db();

    // Log logout activity for audit trail
    await c
      .query(
        `INSERT INTO notifications (user_id, message, created_at) 
             VALUES (?, 'User logged out successfully', NOW())`,
        [req.user.id]
      )
      .catch((err) =>
        console.log("Failed to log logout activity:", err.message)
      );

    console.log(
      `User ${req.user.id} (${
        req.user.role
      }) logged out at ${new Date().toISOString()}`
    );

    // Note: Since we're using JWT (stateless), the token can't be invalidated server-side
    // without implementing a token blacklist. The client MUST discard the token.
    // For enhanced security, consider implementing Redis-based token blacklisting.

    res.json({
      message: "Logged out successfully. Please discard token client-side.",
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed", message: error.message });
  } finally {
    if (c) await c.end();
  }
});

// Refresh token
router.post("/refresh-token", auth, (req, res) => {
  const newToken = jwt.sign(
    { id: req.user.id, role: req.user.role },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({ token: newToken });
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  res.json({
    message: "Password reset link sent (email mock)",
    token: "RESET-TOKEN-MOCK",
  });
});

// Request password reset
router.post("/password/reset/request", async (req, res) => {
  const { username } = req.body;
  let c = null;
  try {
    c = await db();
    const [u] = await c.query("SELECT id FROM users WHERE username = ?", [
      username,
    ]);
    if (!u.length) return res.status(404).json({ error: "User not found" });
    const token = jwt.sign({ userId: u[0].id, type: "reset" }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ message: "Reset link sent (mock email)", token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (c) await c.end();
  }
});

// Confirm password reset
router.post("/password/reset/confirm", async (req, res) => {
  const { token, password } = req.body;
  let c = null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const hash = await bcrypt.hash(password, 10);
    c = await db();
    await c.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      hash,
      decoded.userId,
    ]);
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(400).json({ error: "Invalid or expired token" });
  } finally {
    if (c) await c.end();
  }
});

// Send password setup link
router.post("/password/setup/send/:empId", auth, async (req, res) => {
  let c = null;
  try {
    c = await db();
    const [emp] = await c.query(
      "SELECT id, WorkEmail FROM employees WHERE id = ?",
      [req.params.empId]
    );
    if (!emp.length) return res.status(404).json({ error: "Employee not found" });
    const token = jwt.sign(
      { empId: req.params.empId, type: "setup" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ message: "Setup link sent to email (mock)", token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (c) await c.end();
  }
});

// Validate password setup token
router.get("/password/setup/validate", async (req, res) => {
  try {
    const decoded = jwt.verify(req.query.token, JWT_SECRET);
    res.json({ valid: true, empId: decoded.empId });
  } catch {
    res.status(400).json({ error: "Invalid or expired token" });
  }
});

// Create password for new employee
router.post("/password/create", async (req, res) => {
  const { employee_id, password } = req.body;
  if (!employee_id || !password)
    return res.status(400).json({ error: "Employee ID and password required" });

  let c = null;
  try {
    c = await db();
    let emp;
    if (/^\d+$/.test(String(employee_id))) {
      const [rows] = await c.query(
        "SELECT WorkEmail, FullName FROM employees WHERE id = ?",
        [employee_id]
      );
      emp = rows;
    } else {
      const [rows] = await c.query(
        "SELECT WorkEmail, FullName FROM employees WHERE WorkEmail = ?",
        [employee_id]
      );
      emp = rows;
    }
    if (!emp || !emp.length) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const hash = await bcrypt.hash(password, 10);
    const username = emp[0].WorkEmail;
    const fullName = emp[0].FullName || "Employee";
    const role = "employee";

    await c.query(
      "INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), full_name = VALUES(full_name)",
      [username, hash, role, fullName]
    );

    res.json({ message: "Password set successfully" });
  } catch (err) {
    console.error("password create error", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (c) await c.end();
  }
});

// Check employee by email
router.get("/employee/check", async (req, res) => {
  const { email } = req.query;
  if (!email)
    return res.status(400).json({ error: "Email parameter required" });

  let c = null;
  try {
    c = await db();
    const [emp] = await c.query(
      "SELECT e.id, e.EmployeeNumber, e.FullName, e.WorkEmail, d.name as Designation, dept.name as Department, l.name as Location, e.EmploymentStatus FROM employees e LEFT JOIN designations d ON e.DesignationId = d.id LEFT JOIN departments dept ON e.DepartmentId = dept.id LEFT JOIN locations l ON e.LocationId = l.id WHERE e.WorkEmail = ?",
      [email]
    );

    if (!emp.length) {
      return res.status(404).json({
        found: false,
        message: "Employee not found with this email",
      });
    }

    // Check if user account exists
    const [user] = await c.query(
      "SELECT id, username, role FROM users WHERE username = ?",
      [email]
    );

    res.json({
      found: true,
      employee: emp[0],
      hasUserAccount: user.length > 0,
      userInfo: user.length > 0 ? user[0] : null,
    });
  } catch (err) {
    console.error("employee check error", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (c) await c.end();
  }
});

// Helper function to check manager role
async function checkManagerRole(email) {
  const c = await db();

  // Get employee details
  const [emp] = await c.query(
    `SELECT 
            e.id, 
            e.EmployeeNumber, 
            e.FullName, 
            e.WorkEmail,
            e.DesignationId,
            e.DepartmentId,
            e.LocationId,
            e.EmploymentStatus,
            d.name as Designation,
            dept.name as Department,
            l.name as Location
         FROM employees e
         LEFT JOIN designations d ON e.DesignationId = d.id
         LEFT JOIN departments dept ON e.DepartmentId = dept.id
         LEFT JOIN locations l ON e.LocationId = l.id
         WHERE e.WorkEmail = ?`,
    [email]
  );

  if (!emp.length) {
    c.end();
    return { found: false, message: "Employee not found with this email" };
  }

  const employeeId = emp[0].id;

  // Check if this employee controls any other employees (is a manager)
  const [controlledEmployees] = await c.query(
    `SELECT 
            e.id,
            e.EmployeeNumber,
            e.FullName,
            e.WorkEmail,
            d.name as Designation,
            dept.name as Department
         FROM employees e
         LEFT JOIN designations d ON e.DesignationId = d.id
         LEFT JOIN departments dept ON e.DepartmentId = dept.id
         WHERE e.reporting_manager_id = ?
         AND e.EmploymentStatus = 'Active'`,
    [employeeId]
  );

  const isManager = controlledEmployees.length > 0;
  const suggestedRole = isManager ? "manager" : "employee";

  // Check if user account already exists
  const [user] = await c.query(
    "SELECT id, username, role, full_name FROM users WHERE username = ?",
    [email]
  );

  c.end();

  return {
    success: true,
    employee: {
      id: emp[0].id,
      employeeNumber: emp[0].EmployeeNumber,
      fullName: emp[0].FullName,
      email: emp[0].WorkEmail,
      designation: emp[0].Designation,
      department: emp[0].Department,
      location: emp[0].Location,
      employmentStatus: emp[0].EmploymentStatus,
    },
    managerInfo: {
      isManager: isManager,
      controlledEmployeesCount: controlledEmployees.length,
      controlledEmployees: controlledEmployees.map((ce) => ({
        id: ce.id,
        employeeNumber: ce.EmployeeNumber,
        fullName: ce.FullName,
        email: ce.WorkEmail,
        designation: ce.Designation,
        department: ce.Department,
      })),
    },
    suggestedRole: suggestedRole,
    currentUserAccount:
      user.length > 0
        ? {
            exists: true,
            username: user[0].username,
            role: user[0].role,
            fullName: user[0].full_name,
            roleMatch: user[0].role === suggestedRole,
          }
        : {
            exists: false,
          },
  };
}

// Debug: Check reporting manager setup
router.get("/user/check-reporting/:email", async (req, res) => {
  const { email } = req.params;
  const c = await db();

  try {
    // Get employee details
    const [emp] = await c.query(
      `SELECT e.id, e.EmployeeNumber, e.FullName, e.WorkEmail, e.reporting_manager_id,
                    rm.FullName as ReportingManagerName, rm.WorkEmail as ReportingManagerEmail
             FROM employees e
             LEFT JOIN employees rm ON e.reporting_manager_id = rm.id
             WHERE e.WorkEmail = ?`,
      [email]
    );

    if (!emp.length) {
      c.end();
      return res.status(404).json({ error: "Employee not found" });
    }

    // Check who reports to this employee
    const [reportingEmployees] = await c.query(
      `SELECT id, EmployeeNumber, FullName, WorkEmail
             FROM employees
             WHERE reporting_manager_id = ?
             AND EmploymentStatus = 'Working'`,
      [emp[0].id]
    );

    c.end();

    res.json({
      employee: emp[0],
      reportsToThisEmployee: reportingEmployees,
      count: reportingEmployees.length,
      isManager: reportingEmployees.length > 0,
    });
  } catch (err) {
    c.end();
    res.status(500).json({ error: err.message });
  }
});

// Preview user role for authenticated user
router.get("/user/preview-role", auth, async (req, res) => {
  try {
    // Get email from authenticated user
    const c = await db();
    const [user] = await c.query("SELECT username FROM users WHERE id = ?", [
      req.user.id,
    ]);
    c.end();

    if (!user.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const email = user[0].username;
    const result = await checkManagerRole(email);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error("preview role error:", err.message);
    res.status(500).json({
      error: "Failed to preview user role",
      message: err.message,
    });
  }
});

// Preview user role by email
router.get("/user/preview-role/:email", async (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({ error: "Email parameter required" });
  }

  try {
    const result = await checkManagerRole(email);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error("preview role error:", err.message);
    res.status(500).json({
      error: "Failed to preview user role",
      message: err.message,
    });
  }
});

// Set password and create user account
router.post("/user/create", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const c = await db();
  try {
    // Check if employee exists
    const [emp] = await c.query(
      "SELECT id, EmployeeNumber, FullName, WorkEmail FROM employees WHERE WorkEmail = ?",
      [email]
    );

    if (!emp.length) {
      c.end();
      return res
        .status(404)
        .json({ error: "Employee not found with this email" });
    }

    // Check if user already exists
    const [existingUser] = await c.query(
      "SELECT id FROM users WHERE username = ?",
      [email]
    );
    if (existingUser.length > 0) {
      c.end();
      return res
        .status(409)
        .json({ error: "User account already exists for this email" });
    }

    // Create user account
    const hash = await bcrypt.hash(password, 10);
    const userRole = role || "employee";
    const fullName = emp[0].FullName || "Employee";

    await c.query(
      "INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
      [email, hash, userRole, fullName]
    );

    c.end();
    res.json({
      message: "User account created successfully",
      employee: {
        id: emp[0].id,
        employeeNumber: emp[0].EmployeeNumber,
        fullName: emp[0].FullName,
        email: emp[0].WorkEmail,
      },
      user: {
        username: email,
        role: userRole,
      },
    });
  } catch (err) {
    c.end();
    console.error("user create error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create user with automatic role assignment based on department and report count
// Public endpoint for self-registration
router.post("/user/create-auto", async (req, res) => {
  const { employee_id, password } = req.body;
  if (!employee_id || !password) {
    return res
      .status(400)
      .json({ error: "Employee ID/Number and password are required" });
  }

  const c = await db();
  try {
    // Get employee details with department - support ID, EmployeeNumber, or WorkEmail
    let query = `SELECT 
                e.id,
                e.EmployeeNumber,
                e.FullName,
                e.WorkEmail,
                dept.name as Department
             FROM employees e
             LEFT JOIN departments dept ON e.DepartmentId = dept.id
             WHERE `;

    let param = String(employee_id);

    // Determine identifier type
    if (/^\d+$/.test(param) && param.length < 10) {
      // Numeric and short - employee ID
      query += `e.id = ?`;
    } else if (param.includes("@")) {
      // Contains @ - work email
      query += `e.WorkEmail = ?`;
    } else {
      // Otherwise - employee number
      query += `e.EmployeeNumber = ?`;
    }

    const [emp] = await c.query(query, [param]);

    if (!emp.length) {
      c.end();
      return res.status(404).json({
        error: "Employee not found",
        message: "No employee found with this ID or Employee Number",
      });
    }

    const employee = emp[0];

    if (!employee.WorkEmail) {
      c.end();
      return res
        .status(400)
        .json({ error: "Employee does not have a work email" });
    }

    // Check if user already exists
    const [existingUser] = await c.query(
      "SELECT id FROM users WHERE username = ?",
      [employee.WorkEmail]
    );
    if (existingUser.length > 0) {
      c.end();
      return res
        .status(409)
        .json({ error: "User account already exists for this employee" });
    }

    // Determine role based on logic:
    // 1. If department is "Human Resource" -> HR
    // 2. Else if employee has > 4 direct reports -> Manager
    // 3. Else -> Employee
    let assignedRole = "employee";

    // Priority 1: Check if department is Human Resource
    if (
      employee.Department &&
      employee.Department.toLowerCase() === "human resource"
    ) {
      assignedRole = "hr";
    } else {
      // Priority 2: Check if employee has more than 4 direct reports
      const [reportCount] = await c.query(
        `SELECT COUNT(*) as count 
                 FROM employees 
                 WHERE reporting_manager_id = ?`,
        [employee.id]
      );

      if (reportCount[0].count > 4) {
        assignedRole = "manager";
      }
    }

    // Create user account
    const hash = await bcrypt.hash(password, 10);
    await c.query(
      "INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
      [employee.WorkEmail, hash, assignedRole, employee.FullName]
    );

    c.end();

    res.json({
      message: "User account created successfully with auto-assigned role",
      employee: {
        id: employee.id,
        employeeNumber: employee.EmployeeNumber,
        fullName: employee.FullName,
        email: employee.WorkEmail,
        department: employee.Department,
      },
      user: {
        username: employee.WorkEmail,
        role: assignedRole,
      },
      roleAssignmentReason:
        assignedRole === "hr"
          ? "Department is Human Resource"
          : assignedRole === "manager"
          ? "Has more than 4 direct reports"
          : "Default role (less than 5 direct reports and not HR department)",
    });
  } catch (err) {
    c.end();
    console.error("auto user create error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Preview role assignment for an employee (without creating user)
// Public endpoint for registration page
router.get("/user/preview-role/:employee_id", async (req, res) => {
  const c = await db();
  try {
    const { employee_id } = req.params;

    // Support employee ID, employee number, or work email
    let query = `SELECT 
                e.id,
                e.EmployeeNumber,
                e.FullName,
                e.WorkEmail,
                dept.name as Department,
                (SELECT COUNT(*) FROM employees WHERE reporting_manager_id = e.id) as report_count
             FROM employees e
             LEFT JOIN departments dept ON e.DepartmentId = dept.id
             WHERE `;

    let param = employee_id;

    // Check what type of identifier was provided
    if (/^\d+$/.test(employee_id) && employee_id.length < 10) {
      // Numeric and short - likely employee ID
      query += `e.id = ?`;
    } else if (employee_id.includes("@")) {
      // Contains @ - work email
      query += `e.WorkEmail = ?`;
    } else {
      // Otherwise - employee number
      query += `e.EmployeeNumber = ?`;
    }

    const [emp] = await c.query(query, [param]);

    if (!emp.length) {
      c.end();
      return res.status(404).json({
        error: "Employee not found",
        message:
          "No employee found with this ID or Employee Number. Please verify and try again.",
      });
    }

    const employee = emp[0];

    if (!employee.WorkEmail) {
      c.end();
      return res.status(400).json({
        error: "No work email",
        message:
          "This employee does not have a work email configured. Please contact HR.",
      });
    }

    // Determine role based on logic
    let assignedRole = "employee";
    let reason = "";

    if (
      employee.Department &&
      employee.Department.toLowerCase() === "human resource"
    ) {
      assignedRole = "hr";
      reason = "Department is Human Resource";
    } else if (employee.report_count > 4) {
      assignedRole = "manager";
      reason = `Has ${employee.report_count} direct reports (more than 4)`;
    } else {
      assignedRole = "employee";
      reason =
        employee.report_count > 0
          ? `Has ${employee.report_count} direct reports (4 or fewer)`
          : "No direct reports";
    }

    // Check if user already exists
    const [existingUser] = await c.query(
      "SELECT id, role FROM users WHERE username = ?",
      [employee.WorkEmail]
    );

    c.end();

    res.json({
      employee: {
        id: employee.id,
        employeeNumber: employee.EmployeeNumber,
        fullName: employee.FullName,
        email: employee.WorkEmail,
        department: employee.Department,
      },
      reportCount: employee.report_count,
      suggestedRole: assignedRole,
      roleAssignmentReason: reason,
      userExists: existingUser.length > 0,
      currentRole: existingUser.length > 0 ? existingUser[0].role : null,
    });
  } catch (err) {
    c.end();
    console.error("preview role error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Bulk create users with auto role assignment
// Admin/HR only endpoint
router.post("/user/create-bulk", auth, async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "hr") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin or HR role required." });
  }

  const { employee_ids, default_password } = req.body;

  if (
    !employee_ids ||
    !Array.isArray(employee_ids) ||
    employee_ids.length === 0
  ) {
    return res.status(400).json({ error: "employee_ids array is required" });
  }

  if (!default_password) {
    return res.status(400).json({ error: "default_password is required" });
  }

  const c = await db();
  const results = {
    success: [],
    failed: [],
    skipped: [],
  };

  try {
    const hash = await bcrypt.hash(default_password, 10);

    for (const employee_id of employee_ids) {
      try {
        // Get employee details
        const [emp] = await c.query(
          `SELECT 
                        e.id,
                        e.EmployeeNumber,
                        e.FullName,
                        e.WorkEmail,
                        dept.name as Department
                     FROM employees e
                     LEFT JOIN departments dept ON e.DepartmentId = dept.id
                     WHERE e.id = ?`,
          [employee_id]
        );

        if (!emp.length) {
          results.failed.push({
            employee_id,
            reason: "Employee not found",
          });
          continue;
        }

        const employee = emp[0];

        if (!employee.WorkEmail) {
          results.failed.push({
            employee_id,
            employee_number: employee.EmployeeNumber,
            reason: "No work email",
          });
          continue;
        }

        // Check if user already exists
        const [existingUser] = await c.query(
          "SELECT id FROM users WHERE username = ?",
          [employee.WorkEmail]
        );

        if (existingUser.length > 0) {
          results.skipped.push({
            employee_id,
            employee_number: employee.EmployeeNumber,
            email: employee.WorkEmail,
            reason: "User already exists",
          });
          continue;
        }

        // Determine role
        let assignedRole = "employee";
        let reason = "";

        if (
          employee.Department &&
          employee.Department.toLowerCase() === "human resource"
        ) {
          assignedRole = "hr";
          reason = "HR Department";
        } else {
          const [reportCount] = await c.query(
            `SELECT COUNT(*) as count FROM employees WHERE reporting_manager_id = ?`,
            [employee_id]
          );

          if (reportCount[0].count > 4) {
            assignedRole = "manager";
            reason = `${reportCount[0].count} reports`;
          } else {
            reason = `${reportCount[0].count} reports`;
          }
        }

        // Create user
        await c.query(
          "INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
          [employee.WorkEmail, hash, assignedRole, employee.FullName]
        );

        results.success.push({
          employee_id,
          employee_number: employee.EmployeeNumber,
          full_name: employee.FullName,
          email: employee.WorkEmail,
          role: assignedRole,
          reason: reason,
        });
      } catch (err) {
        results.failed.push({
          employee_id,
          reason: err.message,
        });
      }
    }

    c.end();

    res.json({
      message: "Bulk user creation completed",
      summary: {
        total: employee_ids.length,
        success: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      },
      results,
    });
  } catch (err) {
    c.end();
    console.error("bulk user create error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all users (for admin)
router.get("/users", auth, async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "hr") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin or HR role required." });
  }

  const c = await db();
  try {
    const [users] = await c.query(
      "SELECT u.id, u.username, u.role, u.full_name, u.created_at, e.id as employee_id, e.EmployeeNumber, e.EmploymentStatus FROM users u LEFT JOIN employees e ON u.username = e.WorkEmail ORDER BY u.created_at DESC"
    );
    c.end();
    res.json({ users });
  } catch (err) {
    c.end();
    console.error("get users error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get("/users/:id", auth, async (req, res) => {
  if (
    req.user.role !== "admin" &&
    req.user.role !== "hr" &&
    req.user.id !== parseInt(req.params.id)
  ) {
    return res.status(403).json({ error: "Access denied" });
  }

  const c = await db();
  try {
    const [users] = await c.query(
      "SELECT u.id, u.username, u.role, u.full_name, u.created_at, u.updated_at, e.id as employee_id, e.EmployeeNumber, e.FullName as emp_full_name, e.EmploymentStatus FROM users u LEFT JOIN employees e ON u.username = e.WorkEmail WHERE u.id = ?",
      [req.params.id]
    );
    c.end();

    if (!users.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: users[0] });
  } catch (err) {
    c.end();
    console.error("get user error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update user role
router.put("/users/:id/role", auth, hr, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin role required." });
  }

  const { role } = req.body;
  if (!role || !["admin", "employee", "hr", "manager"].includes(role)) {
    return res
      .status(400)
      .json({ error: "Valid role required (admin, employee, hr, manager)" });
  }

  const c = await db();
  try {
    await c.query("UPDATE users SET role = ? WHERE id = ?", [
      role,
      req.params.id,
    ]);
    c.end();
    res.json({ message: "User role updated successfully" });
  } catch (err) {
    c.end();
    console.error("update user role error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete("/users/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin role required." });
  }

  const c = await db();
  try {
    await c.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    c.end();
    console.error("delete user error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Make user HR
router.post("/users/:id/make-hr", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin role required." });
  }

  const c = await db();
  try {
    const [user] = await c.query(
      "SELECT id, username, role FROM users WHERE id = ?",
      [req.params.id]
    );
    if (!user.length) {
      c.end();
      return res.status(404).json({ error: "User not found" });
    }

    await c.query("UPDATE users SET role = 'hr' WHERE id = ?", [req.params.id]);
    c.end();
    res.json({
      message: "User promoted to HR successfully",
      user: {
        id: user[0].id,
        username: user[0].username,
        previousRole: user[0].role,
        newRole: "hr",
      },
    });
  } catch (err) {
    c.end();
    console.error("make hr error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Make user Manager
router.post("/users/:id/make-manager", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin role required." });
  }

  const c = await db();
  try {
    const [user] = await c.query(
      "SELECT id, username, role FROM users WHERE id = ?",
      [req.params.id]
    );
    if (!user.length) {
      c.end();
      return res.status(404).json({ error: "User not found" });
    }

    await c.query("UPDATE users SET role = 'manager' WHERE id = ?", [
      req.params.id,
    ]);
    c.end();
    res.json({
      message: "User promoted to Manager successfully",
      user: {
        id: user[0].id,
        username: user[0].username,
        previousRole: user[0].role,
        newRole: "manager",
      },
    });
  } catch (err) {
    c.end();
    console.error("make manager error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Make user Admin
router.post("/users/:id/make-admin", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin role required." });
  }

  const c = await db();
  try {
    const [user] = await c.query(
      "SELECT id, username, role FROM users WHERE id = ?",
      [req.params.id]
    );
    if (!user.length) {
      c.end();
      return res.status(404).json({ error: "User not found" });
    }

    await c.query("UPDATE users SET role = 'admin' WHERE id = ?", [
      req.params.id,
    ]);
    c.end();
    res.json({
      message: "User promoted to Admin successfully",
      user: {
        id: user[0].id,
        username: user[0].username,
        previousRole: user[0].role,
        newRole: "admin",
      },
    });
  } catch (err) {
    c.end();
    console.error("make admin error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Demote user to Employee
router.post("/users/:id/make-employee", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin role required." });
  }

  const c = await db();
  try {
    const [user] = await c.query(
      "SELECT id, username, role FROM users WHERE id = ?",
      [req.params.id]
    );
    if (!user.length) {
      c.end();
      return res.status(404).json({ error: "User not found" });
    }

    await c.query("UPDATE users SET role = 'employee' WHERE id = ?", [
      req.params.id,
    ]);
    c.end();
    res.json({
      message: "User role changed to Employee",
      user: {
        id: user[0].id,
        username: user[0].username,
        previousRole: user[0].role,
        newRole: "employee",
      },
    });
  } catch (err) {
    c.end();
    console.error("make employee error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Bulk role update
router.post("/users/bulk-role-update", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin role required." });
  }

  const { updates } = req.body;
  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return res
      .status(400)
      .json({
        error:
          "Updates array required with format: [{userId: 1, role: 'hr'}, ...]",
      });
  }

  const c = await db();
  try {
    const results = [];
    for (const update of updates) {
      const { userId, role } = update;
      if (
        !userId ||
        !role ||
        !["admin", "hr", "manager", "employee"].includes(role)
      ) {
        results.push({
          userId,
          success: false,
          error: "Invalid userId or role",
        });
        continue;
      }

      try {
        await c.query("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
        results.push({ userId, success: true, role });
      } catch (err) {
        results.push({ userId, success: false, error: err.message });
      }
    }

    c.end();
    const successCount = results.filter((r) => r.success).length;
    res.json({
      message: `${successCount} of ${updates.length} users updated successfully`,
      results,
    });
  } catch (err) {
    c.end();
    console.error("bulk role update error", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Auto-assign role based on employee data
router.post("/auto-assign-role", auth, async (req, res) => {
  const c = await db();
  try {
    const userId = req.user.id;
    console.log(`🔍 Auto-assign role request for user ID: ${userId}`);

    // Get current user info
    const [user] = await c.query(
      "SELECT id, username, role FROM users WHERE id = ?",
      [userId]
    );

    if (!user.length) {
      c.end();
      console.error(`❌ User not found: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`📋 Current user: ${user[0].username}, role: ${user[0].role}`);

    // If already has a specific role (admin, hr, manager), don't change it
    if (user[0].role !== "employee") {
      c.end();
      console.log(
        `ℹ️ User already has role: ${user[0].role}, skipping auto-assign`
      );
      return res.json({
        message: "User already has assigned role",
        role: user[0].role,
        changed: false,
      });
    }

    // Find employee by email/username
    const [employee] = await c.query(
      `SELECT e.id, e.WorkEmail, d.name as DepartmentName FROM employees e
       LEFT JOIN departments d ON e.DepartmentId = d.id
       WHERE e.WorkEmail = ?`,
      [user[0].username]
    );

    if (!employee.length) {
      c.end();
      console.log(`⚠️ No employee record found for: ${user[0].username}`);
      return res.json({
        message: "No employee record found",
        role: "employee",
        changed: false,
      });
    }

    const empId = employee[0].id;
    const dept = employee[0].DepartmentName || "N/A";
    console.log(`👤 Employee found: ID=${empId}, Department=${dept}`);

    let newRole = "employee";
    let reason = "Default employee role";

    // Check if employee is HR (based on department)
    const deptLower = dept.toLowerCase();
    if (deptLower.includes("hr") || deptLower.includes("human resource")) {
      newRole = "hr";
      reason = "HR Department";
      console.log(`✅ Detected HR department: ${dept}`);
    } else {
      // Check if employee has reporting members (is a manager)
      const [reportingMembers] = await c.query(
        "SELECT COUNT(*) as count FROM employees WHERE reporting_manager_id = ?",
        [empId]
      );

      const teamCount = reportingMembers[0].count;
      console.log(`👥 Reporting members count: ${teamCount}`);

      if (teamCount > 0) {
        newRole = "manager";
        reason = `Has ${teamCount} reporting members`;
        console.log(`✅ Detected manager role with ${teamCount} team members`);
      }
    }

    // Update user role if it changed
    if (newRole !== user[0].role) {
      await c.query("UPDATE users SET role = ? WHERE id = ?", [
        newRole,
        userId,
      ]);

      console.log(
        `✅ Role updated: ${user[0].role} → ${newRole} for user ${userId} (${user[0].username})`
      );

      c.end();
      return res.json({
        message: `Role automatically assigned to ${newRole}`,
        previousRole: user[0].role,
        newRole: newRole,
        changed: true,
        reason: reason,
      });
    }

    c.end();
    console.log(`ℹ️ Role unchanged: ${newRole}`);
    res.json({
      message: "Role unchanged",
      role: newRole,
      changed: false,
    });
  } catch (err) {
    c.end();
    console.error("❌ auto-assign role error:", err.message);
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
