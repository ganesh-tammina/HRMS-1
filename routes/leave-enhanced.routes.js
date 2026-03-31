/**
 * ENHANCED LEAVE ROUTES
 * Complete leave management with plans, allocations, and balances
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin, hr, manager } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");

/* ============================================
   LEAVE PLANS MANAGEMENT (HR/Admin Only)
   ============================================ */

// Create Leave Plan
router.post("/plans", auth, hr, async (req, res) => {
  try {
    const {
      name,
      description,
      leave_year_start_month,
      leave_year_start_day,
      allocations,
    } = req.body;

    const c = await db();
    await c.beginTransaction();

    // Create leave plan
    const [planResult] = await c.query(
      `INSERT INTO leave_plans (name, description, leave_year_start_month, leave_year_start_day, is_active)
             VALUES (?, ?, ?, ?, 1)`,
      [
        name,
        description,
        leave_year_start_month || 1,
        leave_year_start_day || 1,
      ],
    );

    const planId = planResult.insertId;

    // Add allocations if provided
    if (allocations && allocations.length > 0) {
      for (const allocation of allocations) {
        await c.query(
          `INSERT INTO leave_plan_allocations (leave_plan_id, leave_type_id, days_allocated, prorate_on_joining)
                     VALUES (?, ?, ?, ?)`,
          [
            planId,
            allocation.leave_type_id,
            allocation.days_allocated,
            allocation.prorate_on_joining !== false ? 1 : 0,
          ],
        );
      }
    }

    await c.commit();
    c.end();

    res.json({
      success: true,
      planId,
      message: "Leave plan created successfully",
    });
  } catch (error) {
    console.error("Error creating leave plan:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Leave Plans
router.get("/plans", auth, async (req, res) => {
  try {
    const c = await db();

    const [plans] = await c.query(`
            SELECT 
                lp.*,
                COUNT(DISTINCT lpa.id) as leave_types_count,
                COUNT(DISTINCT e.id) as employees_count
            FROM leave_plans lp
            LEFT JOIN leave_plan_allocations lpa ON lp.id = lpa.leave_plan_id
            LEFT JOIN employees e ON e.leave_plan_id = lp.id
            GROUP BY lp.id
            ORDER BY lp.is_active DESC, lp.name ASC
        `);

    c.end();
    res.json(plans);
  } catch (error) {
    console.error("Error fetching leave plans:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Leave Plan Details with Allocations
router.get("/plans/:id", auth, async (req, res) => {
  try {
    const c = await db();

    const [plans] = await c.query(`SELECT * FROM leave_plans WHERE id = ?`, [
      req.params.id,
    ]);

    if (plans.length === 0) {
      c.end();
      return res.status(404).json({ error: "Leave plan not found" });
    }

    const [allocations] = await c.query(
      `
            SELECT 
                lpa.*,
                lt.type_name,
                lt.type_code,
                lt.is_paid,
                lt.can_carry_forward,
                lt.max_carry_forward_days
            FROM leave_plan_allocations lpa
            INNER JOIN leave_types lt ON lpa.leave_type_id = lt.id
            WHERE lpa.leave_plan_id = ?
            ORDER BY lt.type_name
        `,
      [req.params.id],
    );

    c.end();

    res.json({
      ...plans[0],
      allocations,
    });
  } catch (error) {
    console.error("Error fetching leave plan details:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update Leave Plan
router.put("/plans/:id", auth, hr, async (req, res) => {
  try {
    const {
      name,
      description,
      leave_year_start_month,
      leave_year_start_day,
      is_active,
      allocations,
    } = req.body;

    const c = await db();
    await c.beginTransaction();

    // Fetch existing plan to preserve values missing in partial updates (e.g. from simpler allocation UI)
    const [existingPlan] = await c.query(
      "SELECT * FROM leave_plans WHERE id = ?",
      [req.params.id],
    );
    if (existingPlan.length === 0) {
      await c.rollback();
      c.end();
      return res.status(404).json({ error: "Leave plan not found" });
    }

    const plan = existingPlan[0];

    // Update plan - Use provided values or keep existing
    await c.query(
      `UPDATE leave_plans 
             SET name = ?, description = ?, leave_year_start_month = ?, 
                 leave_year_start_day = ?, is_active = ?
             WHERE id = ?`,

      [
        name || plan.name,
        description !== undefined ? description : plan.description,
        leave_year_start_month || plan.leave_year_start_month || 1,
        leave_year_start_day || plan.leave_year_start_day || 1,
        is_active !== undefined ? is_active : plan.is_active,
        req.params.id,
      ],
    );

    // Update allocations if provided
    if (allocations) {
      // Delete existing allocations
      await c.query(
        `DELETE FROM leave_plan_allocations WHERE leave_plan_id = ?`,
        [req.params.id],
      );

      // Insert new allocations
      for (const allocation of allocations) {
        await c.query(
          `INSERT INTO leave_plan_allocations (leave_plan_id, leave_type_id, days_allocated, prorate_on_joining)
                     VALUES (?, ?, ?, ?)`,
          [
            req.params.id,
            allocation.leave_type_id,
            allocation.days_allocated,
            allocation.prorate_on_joining !== false ? 1 : 0,
          ],
        );
      }

      // AUTOMATIC SYNC: Apply plan changes to all assigned employees immediately
      // Only updates existing balances or deletes removed types.
      // New types require manual "Leave Initialization".
      const currentYear = new Date().getFullYear();
      const yearsToSync = [currentYear, currentYear + 1];

      const [assignedEmployees] = await c.query(
        `SELECT id FROM employees WHERE leave_plan_id = ?`,
        [req.params.id],
      );

      if (assignedEmployees.length > 0) {
        const empIds = assignedEmployees.map((e) => e.id);
        const empIdChunks = [];
        for (let i = 0; i < empIds.length; i += 200) {
          empIdChunks.push(empIds.slice(i, i + 200));
        }

        const activeTypeIds = allocations.map((a) => a.leave_type_id);

        for (const year of yearsToSync) {
          // 1. DELETE balances for leave types removed from the plan
          if (activeTypeIds.length > 0) {
            for (const chunk of empIdChunks) {
              await c.query(
                `DELETE FROM employee_leave_balances 
                 WHERE leave_year = ? AND employee_id IN (?) AND leave_type_id NOT IN (?)`,
                [year, chunk, activeTypeIds],
              );
            }
          } else {
            for (const chunk of empIdChunks) {
              await c.query(
                `DELETE FROM employee_leave_balances 
                 WHERE leave_year = ? AND employee_id IN (?)`,
                [year, chunk],
              );
            }
          }

          // 2. UPDATE existing balances only
          for (const alloc of allocations) {
            const daysAllocated = Number(alloc.days_allocated) || 0;
            const typeId = alloc.leave_type_id;

            for (const chunk of empIdChunks) {
              await c.query(
                `UPDATE employee_leave_balances 
                 SET 
                   available_days = ? + COALESCE(carry_forward_days, 0) - COALESCE(used_days, 0),
                   allocated_days = ?
                 WHERE leave_year = ? AND leave_type_id = ? AND employee_id IN (?)`,
                [daysAllocated, daysAllocated, year, typeId, chunk],
              );
            }
          }
        }
        console.log(
          `[LEAVE SYNC] Plan ${req.params.id} auto-synced for ${assignedEmployees.length} employees`,
        );
      }
    }

    await c.commit();
    c.end();

    res.json({ success: true, message: "Leave plan updated successfully" });
  } catch (error) {
    console.error("Error updating leave plan:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============================================
   LEAVE TYPES MANAGEMENT (HR/Admin Only)
   ============================================ */

// Create Leave Type
router.post("/types", auth, hr, async (req, res) => {
  try {
    const {
      type_name,
      type_code,
      description,
      is_paid,
      requires_approval,
      can_carry_forward,
      max_carry_forward_days,
    } = req.body;

    const c = await db();
    const [result] = await c.query(
      `INSERT INTO leave_types 
             (type_name, type_code, description, is_paid, requires_approval, can_carry_forward, max_carry_forward_days)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        type_name,
        type_code,
        description,
        is_paid !== false ? 1 : 0,
        requires_approval !== false ? 1 : 0,
        can_carry_forward || 0,
        max_carry_forward_days || 0,
      ],
    );
    c.end();

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error("Error creating leave type:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Leave Types
router.get("/types", auth, async (req, res) => {
  try {
    const c = await db();
    const [types] = await c.query(`
            SELECT * FROM leave_types 
            WHERE is_active = 1 
            ORDER BY type_name
        `);
    c.end();
    res.json(types);
  } catch (error) {
    console.error("Error fetching leave types:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update Leave Type
router.put("/types/:id", auth, hr, async (req, res) => {
  try {
    const c = await db();

    // Sanitize input data - convert empty strings to appropriate values
    const updateData = { ...req.body };

    // Convert empty strings to 0 for integer fields
    if (
      updateData.max_carry_forward_days === "" ||
      updateData.max_carry_forward_days === null
    ) {
      updateData.max_carry_forward_days = 0;
    }

    // Convert empty strings to 1/0 for boolean fields
    if (updateData.is_paid === "") updateData.is_paid = 1;
    if (updateData.requires_approval === "") updateData.requires_approval = 1;
    if (updateData.can_carry_forward === "") updateData.can_carry_forward = 0;
    if (updateData.is_active === "") updateData.is_active = 1;

    await c.query(`UPDATE leave_types SET ? WHERE id = ?`, [
      updateData,
      req.params.id,
    ]);
    c.end();
    res.json({ success: true, message: "Leave type updated successfully" });
  } catch (error) {
    console.error("Error updating leave type:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============================================
   EMPLOYEE LEAVE BALANCE MANAGEMENT
   ============================================ */

// Initialize Leave Balances for Employee
router.post("/initialize-balance/:employeeId", auth, hr, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { leave_year } = req.body;

    const c = await db();
    await c.beginTransaction();

    // Get employee's leave plan
    const [employees] = await c.query(
      `SELECT leave_plan_id, DateJoined FROM employees WHERE id = ?`,
      [employeeId],
    );

    if (employees.length === 0) {
      c.end();
      return res.status(404).json({ error: "Employee not found" });
    }

    const employee = employees[0];

    if (!employee.leave_plan_id) {
      c.end();
      return res
        .status(400)
        .json({ error: "Employee has no leave plan assigned" });
    }

    // Get leave plan allocations
    const [allocations] = await c.query(
      `
            SELECT lpa.*, lt.can_carry_forward, lt.max_carry_forward_days
            FROM leave_plan_allocations lpa
            INNER JOIN leave_types lt ON lpa.leave_type_id = lt.id
            WHERE lpa.leave_plan_id = ?
        `,
      [employee.leave_plan_id],
    );

    const currentYear = leave_year || new Date().getFullYear();

    // Calculate proration if joining mid-year
    const joiningDate = new Date(employee.DateJoined);
    const yearStartDate = new Date(currentYear, 0, 1);
    const yearEndDate = new Date(currentYear, 11, 31);

    for (const allocation of allocations) {
      let allocatedDays = allocation.days_allocated;

      // Prorate if joining mid-year and proration is enabled
      if (allocation.prorate_on_joining && joiningDate > yearStartDate) {
        const daysInYear =
          (yearEndDate - yearStartDate) / (1000 * 60 * 60 * 24);
        const remainingDays =
          (yearEndDate - joiningDate) / (1000 * 60 * 60 * 24);
        allocatedDays = Math.round(
          (allocation.days_allocated * remainingDays) / daysInYear,
        );
      }

      // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both new and existing balances
      await c.query(
        `INSERT INTO employee_leave_balances 
             (employee_id, leave_type_id, leave_year, allocated_days, used_days, carry_forward_days, available_days)
           VALUES (?, ?, ?, ?, 0, 0, ?)
           ON DUPLICATE KEY UPDATE 
             available_days = ? + COALESCE(carry_forward_days, 0) - COALESCE(used_days, 0),
             allocated_days = ?`,
        [
          employeeId,
          allocation.leave_type_id,
          currentYear,
          allocatedDays,
          allocatedDays, // initial available if new
          allocatedDays, // update available calculation base
          allocatedDays, // update allocated days
        ],
      );
    }

    await c.commit();
    c.end();

    res.json({
      success: true,
      message: "Leave balances initialized successfully",
      year: currentYear,
    });
  } catch (error) {
    console.error("Error initializing leave balances:", error);
    res.status(500).json({ error: error.message });
  }
});

// Self-service: Initialize Leave Balances for Current Employee
router.post("/initialize-my-balance", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const { leave_year } = req.body;

    const c = await db();
    await c.beginTransaction();

    // Get employee's leave plan
    const [employees] = await c.query(
      `SELECT leave_plan_id, DateJoined FROM employees WHERE id = ?`,
      [emp.id],
    );

    if (employees.length === 0) {
      c.end();
      return res.status(404).json({ error: "Employee not found" });
    }

    const employee = employees[0];

    if (!employee.leave_plan_id) {
      c.end();
      return res
        .status(400)
        .json({ error: "You have no leave plan assigned. Please contact HR." });
    }

    // Get leave plan allocations
    const [allocations] = await c.query(
      `
            SELECT lpa.*, lt.can_carry_forward, lt.max_carry_forward_days
            FROM leave_plan_allocations lpa
            INNER JOIN leave_types lt ON lpa.leave_type_id = lt.id
            WHERE lpa.leave_plan_id = ?
        `,
      [employee.leave_plan_id],
    );

    const currentYear = leave_year || new Date().getFullYear();

    // Calculate proration if joining mid-year
    const joiningDate = new Date(employee.DateJoined);
    const yearStartDate = new Date(currentYear, 0, 1);
    const yearEndDate = new Date(currentYear, 11, 31);

    for (const allocation of allocations) {
      let allocatedDays = allocation.days_allocated;

      // Prorate if joining mid-year and proration is enabled
      if (allocation.prorate_on_joining && joiningDate > yearStartDate) {
        const daysInYear =
          (yearEndDate - yearStartDate) / (1000 * 60 * 60 * 24);
        const remainingDays =
          (yearEndDate - joiningDate) / (1000 * 60 * 60 * 24);
        allocatedDays = Math.round(
          (allocation.days_allocated * remainingDays) / daysInYear,
        );
      }

      // Check if balance already exists
      const [existing] = await c.query(
        `SELECT id FROM employee_leave_balances 
                 WHERE employee_id = ? AND leave_type_id = ? AND leave_year = ?`,
        [emp.id, allocation.leave_type_id, currentYear],
      );

      if (existing.length === 0) {
        // Insert new balance
        await c.query(
          `INSERT INTO employee_leave_balances 
                     (employee_id, leave_type_id, leave_year, allocated_days, used_days, carry_forward_days, available_days)
                     VALUES (?, ?, ?, ?, 0, 0, ?)`,
          [
            emp.id,
            allocation.leave_type_id,
            currentYear,
            allocatedDays,
            allocatedDays,
          ],
        );
      }
    }

    await c.commit();
    c.end();

    res.json({
      success: true,
      message: "Your leave balances have been initialized successfully",
      year: currentYear,
    });
  } catch (error) {
    console.error("Error initializing leave balances:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Employee Leave Balance
// Supports optional `employeeId` (or `employee_id`) query param for HR/Manager/Admin
router.get("/balance", auth, async (req, res) => {
  try {
    const { year, leave_year } = req.query;
    const leaveYear = year || leave_year || new Date().getFullYear();

    // Allow privileged roles to request another employee's balance via query param
    const requestedEmpId = req.query.employeeId || req.query.employee_id;
    let emp = null;

    if (requestedEmpId) {
      const role = String(req.user.role || '').toLowerCase();
      if (!['hr', 'manager', 'admin'].includes(role)) {
        return res.status(403).json({ error: 'Forbidden: insufficient role to query other employee balance' });
      }

      const ctemp = await db();
      const [rows] = await ctemp.query('SELECT * FROM employees WHERE id = ? LIMIT 1', [requestedEmpId]);
      await ctemp.end();
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found for provided employeeId' });
      }
      emp = rows[0];
    } else {
      emp = await findEmployeeByUserId(req.user.id);
    }

    if (!emp) {
      return res.status(404).json({ error: "Employee not found. If you're HR/Manager/Admin, provide 'employeeId' query parameter." });
    }

    const c = await db();
    const [balances] = await c.query(
      `
            SELECT 
                elb.*,
                lt.type_name,
                lt.type_code,
                lt.is_paid,
                lt.can_carry_forward,
                lt.max_carry_forward_days
            FROM employee_leave_balances elb
            INNER JOIN leave_types lt ON elb.leave_type_id = lt.id
            WHERE elb.employee_id = ? AND elb.leave_year = ?
            ORDER BY lt.type_name
        `,
      [emp.id, leaveYear],
    );

    c.end();
    res.json(balances);
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Employee Leave Balance by ID (HR/Manager)
router.get("/balance/:employeeId", auth, async (req, res) => {
  try {
    const { year, leave_year } = req.query;
    const leaveYear = year || leave_year || new Date().getFullYear();

    const c = await db();
    const [balances] = await c.query(
      `
            SELECT 
                elb.*,
                lt.type_name,
                lt.type_code,
                lt.is_paid,
                lt.can_carry_forward,
                lt.max_carry_forward_days
            FROM employee_leave_balances elb
            INNER JOIN leave_types lt ON elb.leave_type_id = lt.id
            WHERE elb.employee_id = ? AND elb.leave_year = ?
            ORDER BY lt.type_name
        `,
      [req.params.employeeId, leaveYear],
    );

    c.end();
    res.json(balances);
  } catch (error) {
    console.error("Error fetching employee leave balance:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============================================
   LEAVE APPLICATION
   ============================================ */

// Apply for Leave
router.post("/apply", auth, async (req, res) => {
  try {
    console.log(
      "[LEAVE DEBUG] Incoming /apply request:",
      req.body,
      "User:",
      req.user,
    );
    const emp = await findEmployeeByUserId(req.user.id);
    console.log("[LEAVE DEBUG] Employee lookup result:", emp);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    let { leave_type_id, start_date, end_date, total_days, reason } = req.body;
    console.log("[LEAVE DEBUG] Parsed request data:", {
      leave_type_id,
      start_date,
      end_date,
      total_days,
      reason,
    });

    // Calculate total_days if not provided
    if (!total_days || total_days === null) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const timeDiff = endDate.getTime() - startDate.getTime();
      total_days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
      console.log("[LEAVE DEBUG] Calculated total_days:", total_days);
    }

    const c = await db();
    await c.beginTransaction();

    // Check leave balance
    const leaveYear = new Date(start_date).getFullYear();
    const [balances] = await c.query(
      `SELECT available_days FROM employee_leave_balances 
             WHERE employee_id = ? AND leave_type_id = ? AND leave_year = ?`,
      [emp.id, leave_type_id, leaveYear],
    );
    console.log("[LEAVE DEBUG] Leave balance query result:", balances);

    if (balances.length === 0) {
      c.end();
      console.log("[LEAVE DEBUG] No leave balance found for this leave type");
      return res
        .status(400)
        .json({ error: "No leave balance found for this leave type" });
    }

    if (balances[0].available_days < total_days) {
      c.end();
      console.log("[LEAVE DEBUG] Insufficient leave balance:", {
        available: balances[0].available_days,
        requested: total_days,
      });
      return res.status(400).json({
        error: "Insufficient leave balance",
        available: balances[0].available_days,
        requested: total_days,
      });
    }

    // Check for duplicate/overlapping leave requests (any status) for every date in the range
    const start = new Date(start_date);
    const end = new Date(end_date);
    let conflict = false;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split("T")[0];
      const [rows] = await c.query(
        `SELECT id, start_date, end_date FROM leaves WHERE employee_id = ? AND DATE(start_date) <= ? AND DATE(end_date) >= ? AND LOWER(status) != 'rejected'`,
        [emp.id, dStr, dStr],
      );
      console.log(
        `[LEAVE DEBUG] Checking emp.id=${emp.id}, date=${dStr}, found=${rows.length}`,
        rows,
      );
      if (rows.length > 0) {
        conflict = true;
        console.log("[LEAVE DEBUG] Conflict found for date:", dStr, rows);
        break;
      }
    }
    if (conflict) {
      await c.rollback();
      c.end();
      console.log(
        "[LEAVE DEBUG] Duplicate/overlap detected, aborting request.",
      );
      return res.status(400).json({
        error:
          "A leave request already exists for at least one of these dates. Duplicate leave requests are not allowed.",
      });
    }

    // Create leave application
    const [result] = await c.query(
      `INSERT INTO leaves 
             (employee_id, leave_type_id, start_date, end_date, total_days, reason, status, applied_at)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [emp.id, leave_type_id, start_date, end_date, total_days, reason],
    );
    console.log("[LEAVE DEBUG] Leave application inserted:", result);

    await c.commit();
    c.end();

    res.json({
      success: true,
      leaveId: result.insertId,
      message: "Leave application submitted successfully",
    });
  } catch (error) {
    console.error("[LEAVE DEBUG] Error applying for leave:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get My Leaves
router.get("/my-leaves", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const c = await db();
    const [leaves] = await c.query(
      `
            SELECT 
                l.*,
                lt.type_name,
                lt.type_code,
                u.full_name as approver_name
            FROM leaves l
            INNER JOIN leave_types lt ON l.leave_type_id = lt.id
            LEFT JOIN users u ON l.approver_id = u.id
            WHERE l.employee_id = ?
            ORDER BY l.applied_at DESC
        `,
      [emp.id],
    );

    c.end();
    res.json(leaves);
  } catch (error) {
    console.error("Error fetching my leaves:", error);
    res.status(500).json({ error: error.message });
  }
});

// Approve Leave (HR/Manager)
router.put("/approve/:leaveId", auth, async (req, res) => {
  try {
    const currentEmp = await findEmployeeByUserId(req.user.id);
    if (!currentEmp)
      return res.status(404).json({ error: "Employee not found" });

    const c = await db();
    await c.beginTransaction();

    // Get leave details with employee info
    const [leaves] = await c.query(
      `SELECT l.*, e.reporting_manager_id 
             FROM leaves l
             JOIN employees e ON l.employee_id = e.id
             WHERE l.id = ?`,
      [req.params.leaveId],
    );

    if (leaves.length === 0) {
      await c.rollback();
      c.end();
      return res.status(404).json({ error: "Leave not found" });
    }

    const leave = leaves[0];

    // Check authorization: HR/Admin can approve any, Manager can only approve their team's leaves
    const isHR = ["admin", "hr"].includes(req.user.role);
    const isReportingManager = leave.reporting_manager_id === currentEmp.id;

    if (!isHR && !isReportingManager) {
      await c.rollback();
      c.end();
      return res
        .status(403)
        .json({ error: "You can only approve leaves for your direct reports" });
    }

    const leaveYear = new Date(leave.start_date).getFullYear();

    // Update leave status
    await c.query(
      `UPDATE leaves SET status = 'approved', approver_id = ?, approval_date = NOW() WHERE id = ?`,
      [req.user.id, req.params.leaveId],
    );

    // Update employee leave balance
    await c.query(
      `UPDATE employee_leave_balances 
             SET used_days = used_days + ?, available_days = available_days - ?
             WHERE employee_id = ? AND leave_type_id = ? AND leave_year = ?`,
      [
        leave.total_days,
        leave.total_days,
        leave.employee_id,
        leave.leave_type_id,
        leaveYear,
      ],
    );

    await c.commit();
    c.end();

    res.json({ success: true, message: "Leave approved successfully" });
  } catch (error) {
    console.error("Error approving leave:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reject Leave (HR/Manager)
router.put("/reject/:leaveId", auth, async (req, res) => {
  try {
    const currentEmp = await findEmployeeByUserId(req.user.id);
    if (!currentEmp)
      return res.status(404).json({ error: "Employee not found" });

    const { rejection_reason } = req.body;

    const c = await db();

    // Get leave details with employee info
    const [leaves] = await c.query(
      `SELECT l.*, e.reporting_manager_id 
             FROM leaves l
             JOIN employees e ON l.employee_id = e.id
             WHERE l.id = ?`,
      [req.params.leaveId],
    );

    if (leaves.length === 0) {
      c.end();
      return res.status(404).json({ error: "Leave not found" });
    }

    const leave = leaves[0];

    // Check authorization: HR/Admin can reject any, Manager can only reject their team's leaves
    const isHR = ["admin", "hr"].includes(req.user.role);
    const isReportingManager = leave.reporting_manager_id === currentEmp.id;

    if (!isHR && !isReportingManager) {
      c.end();
      return res
        .status(403)
        .json({ error: "You can only reject leaves for your direct reports" });
    }

    await c.query(
      `UPDATE leaves 
             SET status = 'rejected', approver_id = ?, approval_date = NOW(), rejection_reason = ?
             WHERE id = ?`,
      [req.user.id, rejection_reason, req.params.leaveId],
    );
    c.end();

    res.json({ success: true, message: "Leave rejected successfully" });
  } catch (error) {
    console.error("Error rejecting leave:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Pending Leaves (HR/Manager)
router.get("/pending", auth, async (req, res) => {
  try {
    const currentEmp = await findEmployeeByUserId(req.user.id);
    if (!currentEmp)
      return res.status(404).json({ error: "Employee not found" });

    const c = await db();

    // HR/Admin see all pending leaves, Managers see only their team's pending leaves
    const isHR = ["admin", "hr"].includes(req.user.role);
    let query = `
            SELECT 
                l.*,
                lt.type_name,
                lt.type_code,
                e.EmployeeNumber,
                e.FirstName,
                e.LastName,
                e.WorkEmail
            FROM leaves l
            INNER JOIN leave_types lt ON l.leave_type_id = lt.id
            INNER JOIN employees e ON l.employee_id = e.id
            WHERE l.status = 'pending'`;

    const params = [];
    if (!isHR) {
      query += ` AND e.reporting_manager_id = ?`;
      params.push(currentEmp.id);
    }

    query += ` ORDER BY l.applied_at ASC`;

    const [leaves] = await c.query(query, params);
    c.end();
    res.json(leaves);
  } catch (error) {
    console.error("Error fetching pending leaves:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Team Leave Report (HR/Manager) - Pending, Approved, Rejected
router.get("/team-report", auth, async (req, res) => {
  try {
    const currentEmp = await findEmployeeByUserId(req.user.id);
    if (!currentEmp)
      return res.status(404).json({ error: "Employee not found" });

    const { startDate, endDate, status } = req.query;
    const c = await db();

    // HR/Admin see all, Managers see only their team
    const isHR = ["admin", "hr"].includes(req.user.role);

    let query = `
            SELECT 
                l.*,
                lt.type_name,
                lt.type_code,
                e.EmployeeNumber,
                e.FirstName,
                e.LastName,
                e.FullName,
                e.WorkEmail,
                e.profile_image,
                u.full_name as approver_name
            FROM leaves l
            INNER JOIN leave_types lt ON l.leave_type_id = lt.id
            INNER JOIN employees e ON l.employee_id = e.id
            LEFT JOIN users u ON l.approver_id = u.id
            WHERE 1=1`;

    const params = [];

    if (!isHR) {
      query += ` AND e.reporting_manager_id = ?`;
      params.push(currentEmp.id);
    }

    if (startDate && endDate) {
      query += ` AND ((l.start_date BETWEEN ? AND ?) OR (l.end_date BETWEEN ? AND ?))`;
      params.push(startDate, endDate, startDate, endDate);
    }

    if (status) {
      query += ` AND l.status = ?`;
      params.push(status.toLowerCase());
    }

    query += ` ORDER BY l.applied_at DESC`;

    const [leaves] = await c.query(query, params);
    c.end();
    res.json(leaves);
  } catch (error) {
    console.error("Error fetching team leave report:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ============================================
   WFH/REMOTE WORK REQUEST ENDPOINTS
   ============================================ */

// Get all WFH/Remote requests
router.get("/wfh-requests", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const c = await db();
    const [r] = await c.query(
      `SELECT l.*, e.FirstName, e.LastName, e.EmployeeNumber 
             FROM leaves l 
             LEFT JOIN employees e ON l.employee_id = e.id 
             WHERE l.employee_id = ? AND l.leave_type IN ('WFH', 'Remote') 
             ORDER BY l.applied_at DESC`,
      [emp.id],
    );
    c.end();
    res.json(r);
  } catch (error) {
    console.error("Error fetching WFH requests:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all pending WFH/Remote requests (HR/Manager)
router.get("/wfh-requests/pending", auth, async (req, res) => {
  try {
    // If user is not manager/hr/admin, return empty array
    if (!["admin", "hr", "manager"].includes(req.user.role)) {
      return res.json([]);
    }

    const c = await db();
    const [r] = await c.query(
      `SELECT l.*, e.FirstName, e.LastName, e.EmployeeNumber 
             FROM leaves l 
             LEFT JOIN employees e ON l.employee_id = e.id 
             WHERE l.leave_type IN ('WFH', 'Remote') AND l.status = 'pending' 
             ORDER BY l.applied_at ASC`,
    );
    c.end();

    console.log("[WFH-GET] Fetched pending WFH requests count:", r.length);
    if (r && r.length > 0) {
      console.log("[WFH-GET] First request:", {
        id: r[0].id,
        start_date: r[0].start_date,
        end_date: r[0].end_date,
        total_days: r[0].total_days,
        leave_type: r[0].leave_type,
        FirstName: r[0].FirstName,
        LastName: r[0].LastName,
      });
      console.log("[WFH-GET] All record data:", r[0]);
    }

    res.json(r);
  } catch (error) {
    console.error("[WFH-GET] Error fetching pending WFH requests:", error);
    res.status(500).json({ error: error.message });
  }
});

// Check if today has an approved WFH/Remote request
router.get("/wfh-check-today", auth, async (req, res) => {
  try {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    console.log("🔍 WFH Check - User ID:", req.user.id);
    console.log("🔍 WFH Check - Employee ID:", emp.id);

    const today = new Date().toISOString().split("T")[0];
    console.log("🔍 WFH Check - Today's date:", today);

    const c = await db();

    // First, let's see what WFH requests exist for this employee
    const [allRequests] = await c.query(
      `SELECT id, leave_type, start_date, end_date, status, DATE(start_date) as start_date_only 
             FROM leaves 
             WHERE employee_id = ? AND leave_type IN ('WFH', 'Remote')
             ORDER BY start_date DESC LIMIT 5`,
      [emp.id],
    );
    console.log("🔍 All WFH/Remote requests for employee:", allRequests);

    const [r] = await c.query(
      `SELECT leave_type, start_date, end_date, status 
             FROM leaves 
             WHERE employee_id = ? 
             AND DATE(start_date) <= DATE(?) 
             AND DATE(end_date) >= DATE(?)
             AND leave_type IN ('WFH', 'Remote') 
             AND status = 'approved' 
             LIMIT 1`,
      [emp.id, today, today],
    );

    console.log("🔍 Matching WFH request:", r);

    c.end();
    res.json({
      has_wfh: r.length > 0,
      work_mode: r.length > 0 ? r[0].leave_type : "Office",
    });
  } catch (error) {
    console.error("Error checking WFH status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Request WFH/Remote work
router.post("/wfh-request", auth, async (req, res) => {
  try {
    console.log(
      "[WFH-DEBUG] Received WFH request:",
      JSON.stringify(req.body, null, 2),
    );

    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const { start_date, end_date, total_days, work_mode, reason, date } =
      req.body;

    console.log(
      "[WFH-DEBUG] Extracted fields - start_date:",
      start_date,
      "end_date:",
      end_date,
      "total_days:",
      total_days,
      "work_mode:",
      work_mode,
    );

    // Support both single date and date range
    const finalStartDate = start_date || date;
    const finalEndDate = end_date || date;
    let finalTotalDays = total_days || 1;

    console.log(
      "[WFH-DEBUG] Final values - start:",
      finalStartDate,
      "end:",
      finalEndDate,
      "days:",
      finalTotalDays,
    );

    if (!finalStartDate || !finalEndDate || !work_mode) {
      console.log("[WFH-DEBUG] Validation failed - Required fields missing");
      return res
        .status(400)
        .json({ error: "Start date, end date and work mode are required" });
    }

    if (!["WFH", "Remote"].includes(work_mode)) {
      console.log(
        "[WFH-DEBUG] Validation failed - Invalid work mode:",
        work_mode,
      );
      return res.status(400).json({ error: "Work mode must be WFH or Remote" });
    }

    // Calculate total_days if not provided or is 0 or less
    if (!total_days || total_days <= 0 || total_days === null) {
      const start = new Date(finalStartDate);
      const end = new Date(finalEndDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      finalTotalDays = diffDays;
      console.log("[WFH-DEBUG] Calculated total_days:", finalTotalDays);
    }

    const c = await db();
    await c.beginTransaction();

    // CHECK FOR DUPLICATE/OVERLAPPING WFH REQUESTS (pending or approved only)
    console.log("[WFH-DEBUG] Checking for overlapping WFH requests...");
    const [existingWFH] = await c.query(
      `SELECT id, start_date, end_date, status, leave_type 
       FROM leaves 
       WHERE employee_id = ? 
       AND leave_type = 'WFH'
       AND (status = 'pending' OR status = 'approved')
       AND DATE(start_date) <= ? 
       AND DATE(end_date) >= ?`,
      [emp.id, finalEndDate, finalStartDate],
    );

    console.log("[WFH-DEBUG] Found existing WFH requests:", existingWFH.length);
    if (existingWFH.length > 0) {
      existingWFH.forEach((req) => {
        console.log(
          `[WFH-DEBUG] Conflicting request - ID: ${req.id}, Start: ${req.start_date}, End: ${req.end_date}, Status: ${req.status}`,
        );
      });

      await c.rollback();
      c.end();

      const conflictingReq = existingWFH[0];
      return res.status(400).json({
        error: `You already have a ${conflictingReq.status} WFH request from ${conflictingReq.start_date} to ${conflictingReq.end_date}. You cannot apply for WFH on overlapping dates.`,
        conflictingRequest: {
          id: conflictingReq.id,
          start_date: conflictingReq.start_date,
          end_date: conflictingReq.end_date,
          status: conflictingReq.status,
        },
      });
    }

    const [result] = await c.query(
      `INSERT INTO leaves 
             (employee_id, leave_type, start_date, end_date, total_days, reason, status, applied_at)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        emp.id,
        work_mode,
        finalStartDate,
        finalEndDate,
        finalTotalDays,
        reason || `${work_mode} request`,
      ],
    );

    await c.commit();
    c.end();

    console.log(
      "[WFH-DEBUG] Successfully inserted record with ID:",
      result.insertId,
      "start:",
      finalStartDate,
      "end:",
      finalEndDate,
      "days:",
      finalTotalDays,
    );

    res.json({
      success: true,
      id: result.insertId,
      message: `${work_mode} request submitted successfully`,
    });
  } catch (error) {
    console.error("[WFH-DEBUG] Error submitting WFH request:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
