const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin, hr, roleAuth } = require("../middleware/auth");

// ...existing code...

// Allow HR to delete shift policies
router.delete("/shift-policies/:id", auth, roleAuth(["admin", "hr"]), async (req, res) => {
  try {
    const c = await db();
    const [result] = await c.query("DELETE FROM shift_policies WHERE id = ?", [
      req.params.id,
    ]);
    c.end();
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Shift policy not found" });
    }
    res.json({ success: true, message: "Shift policy deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generic master creation helper
const createMasterRoutes = (route, table, col) => {
  router.get(`/${route}`, auth, roleAuth(["admin", "hr", "manager", "employee"]), async (req, res) => {
    const c = await db();
    const [r] = await c.query(
      `SELECT id, ${col} as name, created_at FROM ${table}`
    );
    c.end();
    res.json(r);
  });

  router.post(`/${route}`, auth, roleAuth(["admin", "hr"]), async (req, res) => {
    const value = req.body[col];
    if (!value || value.trim() === "") {
      return res.status(400).json({ error: `${col} is required` });
    }
    const c = await db();
    // Check for duplicate
    const [existing] = await c.query(`SELECT id FROM ${table} WHERE ${col} = ?`, [value]);
    if (existing.length > 0) {
      c.end();
      return res.status(409).json({ error: `${route} with this ${col} already exists` });
    }
    await c.query(`INSERT INTO ${table}(${col}) VALUES(?)`, [value]);
    c.end();
    res.json({ message: `${route} created` });
  });

  router.delete(`/${route}/:id`, auth, roleAuth(["admin", "hr"]), async (req, res) => {
    try {
      const c = await db();
      const [result] = await c.query(`DELETE FROM ${table} WHERE id = ?`, [
        req.params.id,
      ]);
      c.end();

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: `${route} not found` });
      }

      res.json({ success: true, message: `${route} deleted successfully` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};

// Create routes for all master tables
createMasterRoutes("locations", "locations", "name");
createMasterRoutes("departments", "departments", "name");
createMasterRoutes("designations", "designations", "name");
createMasterRoutes("business-units", "business_units", "name");
createMasterRoutes("legal-entities", "legal_entities", "name");
createMasterRoutes("cost-centers", "cost_centers", "code");
createMasterRoutes("sub-departments", "sub_departments", "name");
createMasterRoutes("bands", "bands", "name");
createMasterRoutes("pay-grades", "pay_grades", "name");
createMasterRoutes("leave-plans", "leave_plans", "name");
// Shift policies and weekly-off policies handled separately due to enhanced fields
createMasterRoutes("attendance-policies", "attendance_policies", "name");
createMasterRoutes(
  "attendance-capture-schemes",
  "attendance_capture_schemes",
  "name"
);
createMasterRoutes("holiday-lists", "holiday_lists", "name");
createMasterRoutes("expense-policies", "expense_policies", "name");

// Enhanced Shift Policies Route
router.get("/shift-policies", auth, roleAuth(["admin", "hr", "manager", "employee"]), async (req, res) => {
  try {
    const c = await db();
    const [rows] = await c.query(`
            SELECT id, name, shift_type, start_time, end_time, 
                   break_duration_minutes, timezone, description, is_active,
                   created_at, updated_at
            FROM shift_policies 
            ORDER BY is_active DESC, name ASC
        `);
    c.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/shift-policies", auth, roleAuth(["admin", "hr"]), async (req, res) => {
  try {
    const {
      name,
      shift_type,
      start_time,
      end_time,
      break_duration_minutes,
      timezone,
      description,
      is_active,
    } = req.body;

    if (!name || !start_time || !end_time) {
      return res
        .status(400)
        .json({ error: "Name, start_time, and end_time are required" });
    }

    const c = await db();
    const [result] = await c.query(
      `
            INSERT INTO shift_policies 
            (name, shift_type, start_time, end_time, break_duration_minutes, timezone, description, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        name,
        shift_type || "general",
        start_time,
        end_time,
        break_duration_minutes || 60,
        timezone || "UTC",
        description || null,
        is_active !== undefined ? is_active : 1,
      ]
    );
    c.end();
    res.json({ message: "Shift policy created", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/shift-policies/:id", auth, roleAuth(["admin", "hr"]), async (req, res) => {
  try {
    const {
      name,
      shift_type,
      start_time,
      end_time,
      break_duration_minutes,
      timezone,
      description,
      is_active,
    } = req.body;
    const c = await db();

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (shift_type !== undefined) {
      updates.push("shift_type = ?");
      values.push(shift_type);
    }
    if (start_time !== undefined) {
      updates.push("start_time = ?");
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push("end_time = ?");
      values.push(end_time);
    }
    if (break_duration_minutes !== undefined) {
      updates.push("break_duration_minutes = ?");
      values.push(break_duration_minutes);
    }
    if (timezone !== undefined) {
      updates.push("timezone = ?");
      values.push(timezone);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active);
    }

    if (updates.length === 0) {
      c.end();
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.params.id);
    await c.query(
      `UPDATE shift_policies SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
    c.end();
    res.json({ message: "Shift policy updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ENHANCED WEEKLY OFF POLICIES ROUTES ============
router.get("/weekly-off-policies", auth, roleAuth(["admin", "hr", "manager", "employee"]), async (req, res) => {
  let c;
  try {
    c = await db();
    const [rows] = await c.query(`
            SELECT 
                wop.*,
                l.name as location_name,
                d.name as department_name,
                sp.name as shift_policy_name,
                u1.full_name as created_by_name,   -- Fixed: changed from first_name to full_name
                u2.full_name as updated_by_name    -- Fixed: changed from first_name to full_name
            FROM weekly_off_policies wop
            LEFT JOIN locations l ON wop.location_id = l.id
            LEFT JOIN departments d ON wop.department_id = d.id
            LEFT JOIN shift_policies sp ON wop.shift_policy_id = sp.id
            LEFT JOIN users u1 ON wop.created_by = u1.id
            LEFT JOIN users u2 ON wop.updated_by = u2.id
            ORDER BY wop.is_active DESC, wop.created_at DESC
        `);

    // Handle JSON fields for the frontend
    const formattedRows = rows.map((row) => ({
      ...row,
      week_pattern:
        typeof row.week_pattern === "string"
          ? JSON.parse(row.week_pattern)
          : row.week_pattern,
      half_day_pattern:
        typeof row.half_day_pattern === "string"
          ? JSON.parse(row.half_day_pattern)
          : row.half_day_pattern,
    }));

    res.json(formattedRows);
  } catch (err) {
    console.error("GET Policies Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (c && c.release) c.release();
  }
});

router.post("/weekly-off-policies", auth, roleAuth(["admin", "hr"]), async (req, res) => {
  try {
    const {
      policy_code,
      name,
      description,
      effective_date,
      end_date,
      is_active,
      sunday_off,
      monday_off,
      tuesday_off,
      wednesday_off,
      thursday_off,
      friday_off,
      saturday_off,
      week_pattern,
      is_payable,
      holiday_overlap_rule,
      sandwich_rule,
      minimum_work_days,
      allow_half_day,
      half_day_pattern,
      location_id,
      department_id,
      shift_policy_id,
    } = req.body;

    if (!policy_code || !name || !effective_date) {
      return res
        .status(400)
        .json({ error: "policy_code, name, and effective_date are required" });
    }

    const c = await db();

    // Get user ID from token
    const userId = req.user?.id || null;

    const [result] = await c.query(
      `
            INSERT INTO weekly_off_policies (
                policy_code, name, description, effective_date, end_date, is_active,
                sunday_off, monday_off, tuesday_off, wednesday_off, thursday_off, friday_off, saturday_off,
                week_pattern, is_payable, holiday_overlap_rule, sandwich_rule, minimum_work_days,
                allow_half_day, half_day_pattern,
                location_id, department_id, shift_policy_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        policy_code,
        name,
        description || null,
        effective_date,
        end_date || null,
        is_active !== undefined ? is_active : 1,
        sunday_off !== undefined ? sunday_off : 1,
        monday_off || 0,
        tuesday_off || 0,
        wednesday_off || 0,
        thursday_off || 0,
        friday_off || 0,
        saturday_off || 0,
        week_pattern ? JSON.stringify(week_pattern) : null,
        is_payable !== undefined ? is_payable : 1,
        holiday_overlap_rule || "ignore",
        sandwich_rule || 0,
        minimum_work_days || 0,
        allow_half_day || 0,
        half_day_pattern ? JSON.stringify(half_day_pattern) : null,
        location_id || null,
        department_id || null,
        shift_policy_id || null,
        userId,
      ]
    );

    c.end();
    res.json({
      success: true,
      message: "Weekly off policy created successfully",
      id: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/weekly-off-policies/:id", auth, roleAuth(["admin", "hr"]), async (req, res) => {
  try {
    const c = await db();
    const updates = [];
    const values = [];

    const allowedFields = [
      "policy_code",
      "name",
      "description",
      "effective_date",
      "end_date",
      "is_active",
      "sunday_off",
      "monday_off",
      "tuesday_off",
      "wednesday_off",
      "thursday_off",
      "friday_off",
      "saturday_off",
      "is_payable",
      "holiday_overlap_rule",
      "sandwich_rule",
      "minimum_work_days",
      "allow_half_day",
      "location_id",
      "department_id",
      "shift_policy_id",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    // Handle JSON fields separately
    if (req.body.week_pattern !== undefined) {
      updates.push("week_pattern = ?");
      values.push(
        req.body.week_pattern ? JSON.stringify(req.body.week_pattern) : null
      );
    }

    if (req.body.half_day_pattern !== undefined) {
      updates.push("half_day_pattern = ?");
      values.push(
        req.body.half_day_pattern
          ? JSON.stringify(req.body.half_day_pattern)
          : null
      );
    }

    // Add updated_by
    const userId = req.user?.id || null;
    if (userId) {
      updates.push("updated_by = ?");
      values.push(userId);
    }

    if (updates.length === 0) {
      c.end();
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(req.params.id);
    await c.query(
      `UPDATE weekly_off_policies SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
    c.end();
    res.json({
      success: true,
      message: "Weekly off policy updated successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/weekly-off-policies/:id", auth, roleAuth(["admin", "hr"]), async (req, res) => {
  try {
    const c = await db();
    const [result] = await c.query(
      "DELETE FROM weekly_off_policies WHERE id = ?",
      [req.params.id]
    );
    c.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Weekly off policy not found" });
    }

    res.json({
      success: true,
      message: "Weekly off policy deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add update (PUT) endpoints for all generic master tables
const updateMasterRoutes = [
  { route: "locations", table: "locations", col: "name" },
  { route: "departments", table: "departments", col: "name" },
  { route: "designations", table: "designations", col: "name" },
  { route: "business-units", table: "business_units", col: "name" },
  { route: "legal-entities", table: "legal_entities", col: "name" },
  { route: "cost-centers", table: "cost_centers", col: "code" },
  { route: "sub-departments", table: "sub_departments", col: "name" },
  { route: "bands", table: "bands", col: "name" },
  { route: "pay-grades", table: "pay_grades", col: "name" },
  { route: "leave-plans", table: "leave_plans", col: "name" },
  { route: "attendance-policies", table: "attendance_policies", col: "name" },
  {
    route: "attendance-capture-schemes",
    table: "attendance_capture_schemes",
    col: "name",
  },
  { route: "holiday-lists", table: "holiday_lists", col: "name" },
  { route: "expense-policies", table: "expense_policies", col: "name" },
];

updateMasterRoutes.forEach(({ route, table, col }) => {
  router.put(`/${route}/:id`, auth, roleAuth(["admin", "hr"]), async (req, res) => {
    try {
      const c = await db();
      const value = req.body[col];
      if (!value || value.trim() === "") {
        c.end();
        return res.status(400).json({ error: `${col} is required` });
      }
      // Check for duplicate (excluding current id)
      const [existing] = await c.query(`SELECT id FROM ${table} WHERE ${col} = ? AND id != ?`, [value, req.params.id]);
      if (existing.length > 0) {
        c.end();
        return res.status(409).json({ error: `${route} with this ${col} already exists` });
      }
      const [result] = await c.query(
        `UPDATE ${table} SET ${col} = ? WHERE id = ?`,
        [value, req.params.id]
      );
      c.end();
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: `${route} not found` });
      }
      res.json({ success: true, message: `${route} updated successfully` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

module.exports = router;
