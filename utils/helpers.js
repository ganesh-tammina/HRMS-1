/**
 * EMPLOYEE HELPERS - REFACTORED
 * 
 * Improvements:
 * - Comprehensive input validation
 * - Role-based authorization utilities
 * - Privacy-compliant data masking  
 * - Query optimization helpers
 * - Connection management utilities
 * - Security-first design
 * 
 * BACKWARD COMPATIBLE: All existing exports maintained
 */

const { db } = require("../config/database");

/* ============ FIELD WHITELISTS ============ */

/**
 * Public employee fields - safe to show to all authenticated users
 */
const EMPLOYEE_PUBLIC_FIELDS = [
    'id', 'EmployeeNumber', 'FirstName', 'LastName', 'FullName',
    'WorkEmail', 'Gender', 'DateJoined', 'profile_image',
    'DepartmentId', 'DesignationId', 'LocationId', 'EmploymentStatus'
];

/**
 * Private employee fields - only for HR/Admin or self
 */
const EMPLOYEE_PRIVATE_FIELDS = [
    ...EMPLOYEE_PUBLIC_FIELDS,
    'MiddleName', 'PersonalEmail', 'PhoneNumber', 'DateOfBirth',
    'MaritalStatus', 'BloodGroup', 'Nationality',
    'current_city', 'current_state', 'current_country',
    'reporting_manager_id', 'time_type', 'worker_type'
];

/**
 * Sensitive employee fields - only for Admin or with explicit permission
 */
const EMPLOYEE_SENSITIVE_FIELDS = [
    'PANNumber', 'AadhaarNumber', 'pf_number', 'uan_number',
    'lpa', 'basic_pct', 'hra_pct', 'medical_allowance',
    'transport_allowance', 'special_allowance', 'paid_basic_monthly',
    'current_address_line1', 'current_address_line2', 'current_zip',
    'permanent_address_line1', 'permanent_address_line2',
    'permanent_city', 'permanent_state', 'permanent_zip', 'permanent_country',
    'father_name', 'mother_name', 'spouse_name', 'children_names'
];

/**
 * Fields employees can update themselves
 */
const EMPLOYEE_UPDATE_FIELDS_SELF = [
    'PersonalEmail', 'PhoneNumber',
    'current_address_line1', 'current_address_line2',
    'current_city', 'current_state', 'current_zip', 'current_country',
    'permanent_address_line1', 'permanent_address_line2',
    'permanent_city', 'permanent_state', 'permanent_zip', 'permanent_country',
    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
    'profile_image', 'spouse_name', 'children_names',
    'DateOfBirth', 'Gender', 'BloodGroup', 'MaritalStatus',
    'father_name', 'mother_name'
];

/**
 * Fields HR can update (in addition to self fields)
 */
const EMPLOYEE_UPDATE_FIELDS_HR = [
    ...EMPLOYEE_UPDATE_FIELDS_SELF,
    'reporting_manager_id', 'dotted_line_manager_id',
    'DepartmentId', 'SubDepartmentId', 'DesignationId', 'SecondaryDesignationId',
    'LocationId', 'BusinessUnitId', 'LegalEntityId',
    'leave_plan_id', 'shift_policy_id', 'weekly_off_policy_id',
    'attendance_policy_id', 'attendance_capture_scheme_id',
    'holiday_list_id', 'expense_policy_id',
    'BandId', 'PayGradeId', 'CostCenterId',
    'time_type', 'worker_type', 'EmploymentStatus', 'notice_period'        
];

/**
 * Fields only Admin can update (all fields except system-managed ones)
 */
const EMPLOYEE_UPDATE_FIELDS_ADMIN = [
    ...EMPLOYEE_UPDATE_FIELDS_HR,
    'EmployeeNumber', 'FirstName', 'MiddleName', 'LastName', 'FullName',
    'WorkEmail', 'Gender', 'DateOfBirth', 'MaritalStatus', 'BloodGroup',
    'Nationality', 'PhysicallyHandicapped',
    'father_name', 'mother_name',
    'DateJoined', 'lpa', 'basic_pct', 'hra_pct',
    'medical_allowance', 'transport_allowance', 'special_allowance',
    'paid_basic_monthly', 'working_days', 'loss_of_days',
    'PANNumber', 'AadhaarNumber', 'pf_number', 'uan_number',
    'exit_date', 'exit_status', 'termination_type',
    'termination_reason', 'resignation_note', 'comments'
];

/**
 * System-managed fields that should never be updated via API
 */
const EMPLOYEE_READONLY_FIELDS = [
    'id', 'created_at', 'updated_at', 'attendance_number'
];

/* ============ CORE HELPER FUNCTIONS ============ */

/**
 * Find employee record for a given user ID
 * Matches username to WorkEmail or EmployeeNumber
 * 
 * BACKWARD COMPATIBLE: Maintains exact same behavior as original
 * 
 * @param {number} userId - User ID from JWT token
 * @returns {Promise<Object|null>} Employee record or null if not found
 */
async function findEmployeeByUserId(userId) {
    let connection = null;
    
    try {
        // Validate input
        if (!userId || isNaN(parseInt(userId))) {
            console.warn('[findEmployeeByUserId] Invalid userId:', userId);
            return null;
        }

        connection = await db();
        
        // Get username from users table
        const [userRows] = await connection.query(
            "SELECT username FROM users WHERE id = ?", 
            [userId]
        );
        
        if (!userRows || userRows.length === 0) {
            console.warn('[findEmployeeByUserId] User not found:', userId);
            return null;
        }

        const username = userRows[0].username;
        
        // Find employee by email or employee number
        const [employeeRows] = await connection.query(
            "SELECT * FROM employees WHERE WorkEmail = ? OR EmployeeNumber = ? LIMIT 1",
            [username, username]
        );
        
        if (!employeeRows || employeeRows.length === 0) {
            console.warn('[findEmployeeByUserId] Employee not found for username:', username);
            return null;
        }

        console.log(`[findEmployeeByUserId] Found employee ${employeeRows[0].id} for user ${userId}`);
        return employeeRows[0];
        
    } catch (error) {
        console.error('[findEmployeeByUserId] Error:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * Convert JavaScript Date to MySQL DATETIME format
 * 
 * BACKWARD COMPATIBLE: Maintains exact same behavior
 * 
 * @param {Date|string|number} val - Date value to convert
 * @returns {string|null} MySQL DATETIME string or null if invalid
 */
function toMySQLDateTime(val) {
    if (!val) return null;
    
    const date = new Date(val);
    
    // Check if valid date
    if (isNaN(date.getTime())) {
        console.warn('[toMySQLDateTime] Invalid date value:', val);
        return null;
    }
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/**
 * Convert JavaScript Date to MySQL DATE format (YYYY-MM-DD)
 * 
 * @param {Date|string|number} val - Date value to convert
 * @returns {string|null} MySQL DATE string or null if invalid
 */
function toMySQLDate(val) {
    if (!val) return null;
    
    const date = new Date(val);
    
    if (isNaN(date.getTime())) {
        console.warn('[toMySQLDate] Invalid date value:', val);
        return null;
    }
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Get or create master record and return ID
 * Enhanced with better error handling and logging
 * 
 * BACKWARD COMPATIBLE: Maintains same signature and behavior
 * 
 * @param {Object} conn - Database connection
 * @param {string} table - Table name
 * @param {string} column - Column name
 * @param {string} value - Value to find or create
 * @param {Object} context - Additional context data (optional)
 * @returns {Promise<number|null>} Record ID or null if value is empty
 */
async function getOrCreateMaster(conn, table, column, value, context = {}) {
    // Validate inputs
    if (!conn) {
        throw new Error('Database connection required');
    }
    
    if (!table || typeof table !== 'string') {
        throw new Error('Valid table name required');
    }
    
    if (!column || typeof column !== 'string') {
        throw new Error('Valid column name required');
    }
    
    if (!value || String(value).trim() === '') {
        return null;
    }
    
    const val = String(value).trim();
    
    try {
        // 1. Check if the master record already exists
        const [rows] = await conn.query(
            `SELECT id FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, 
            [val]
        );
        
        if (rows.length > 0) {
            console.log(`[getOrCreateMaster] Found existing ${table}: ${val} (ID: ${rows[0].id})`);
            return rows[0].id;
        }
        
        // 2. If it doesn't exist, create it
        console.log(`[getOrCreateMaster] Creating new ${table}: ${val}`);

        // Special handling for weekly_off_policies
        if (table === 'weekly_off_policies') {
            const policyCode = `WOP-${val.replace(/\s+/g, '-').toUpperCase()}-${Date.now().toString().slice(-4)}`;
            
            const [result] = await conn.query(
                `INSERT INTO weekly_off_policies (
                    name, policy_code, effective_date, 
                    location_id, department_id, shift_policy_id, is_active
                ) VALUES (?, ?, CURRENT_DATE, ?, ?, ?, 1)`, 
                [
                    val, 
                    policyCode, 
                    context.location_id || null, 
                    context.department_id || null, 
                    context.shift_policy_id || null
                ]
            );
            
            console.log(`[getOrCreateMaster] Created ${table}: ${val} (ID: ${result.insertId})`);
            return result.insertId;
        }

        // Default behavior for simple master tables
        const [result] = await conn.query(
            `INSERT INTO \`${table}\` (\`${column}\`) VALUES (?)`, 
            [val]
        );
        
        console.log(`[getOrCreateMaster] Created ${table}: ${val} (ID: ${result.insertId})`);
        return result.insertId;

    } catch (error) {
        console.error(`[getOrCreateMaster] Error for ${table}.${column}="${val}":`, error.message);
        
        // Check if error is due to duplicate entry (race condition)
        if (error.code === 'ER_DUP_ENTRY') {
            console.log(`[getOrCreateMaster] Duplicate entry detected, fetching existing record`);
            const [rows] = await conn.query(
                `SELECT id FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, 
                [val]
            );
            if (rows.length > 0) {
                return rows[0].id;
            }
        }
        
        throw error;
    }
}

/* ============ NEW UTILITY FUNCTIONS ============ */

/**
 * Validate employee ID
 * @param {any} employeeId - Value to validate
 * @returns {boolean} True if valid employee ID
 */
function validateEmployeeId(employeeId) {
    if (!employeeId) return false;
    
    const id = parseInt(employeeId);
    
    return !isNaN(id) && id > 0 && id === parseFloat(employeeId);
}

/**
 * Sanitize employee input data
 * Removes HTML tags, trims whitespace, prevents script injection
 * 
 * @param {Object} data - Raw input data
 * @returns {Object} Sanitized data
 */
function sanitizeEmployeeInput(data) {
    if (!data || typeof data !== 'object') {
        return {};
    }

    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
            sanitized[key] = value;
            continue;
        }

        if (typeof value === 'string') {
            // Remove HTML tags
            let clean = value.replace(/<[^>]*>/g, '');
            // Trim whitespace
            clean = clean.trim();
            // Limit length to prevent DoS
            if (clean.length > 5000) {
                clean = clean.substring(0, 5000);
            }
            sanitized[key] = clean;
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Filter employee update data based on role
 * Enforces field-level permissions
 * 
 * @param {Object} data - Data to filter
 * @param {string} role - User role (employee/manager/hr/admin)
 * @param {boolean} isSelfUpdate - Whether user is updating their own record
 * @returns {Object} Filtered data containing only allowed fields
 */
function filterEmployeeUpdateData(data, role, isSelfUpdate = false) {
    const sanitized = sanitizeEmployeeInput(data);
    const filtered = {};
    
    let allowedFields = [];
    
    // Determine allowed fields based on role
    const normalizedRole = String(role).toLowerCase().trim();
    
    if (normalizedRole === 'admin') {
        allowedFields = EMPLOYEE_UPDATE_FIELDS_ADMIN;
    } else if (normalizedRole === 'hr') {
        allowedFields = EMPLOYEE_UPDATE_FIELDS_HR;
    } else if (isSelfUpdate) {
        allowedFields = EMPLOYEE_UPDATE_FIELDS_SELF;
    } else {
        // Regular employees can only update their own records
        allowedFields = [];
    }
    
    // Filter data to only include allowed fields
    for (const field of allowedFields) {
        if (sanitized.hasOwnProperty(field) && !EMPLOYEE_READONLY_FIELDS.includes(field)) {
            filtered[field] = sanitized[field];
        }
    }

    return filtered;
}

/**
 * Mask sensitive employee data based on viewing role
 * Implements privacy-first data handling
 * 
 * @param {Object} employeeData - Full employee data
 * @param {string} viewerRole - Role of user viewing the data
 * @param {boolean} isSelf - Whether viewer is viewing their own data
 * @returns {Object} Employee data with sensitive fields masked
 */
function maskSensitiveData(employeeData, viewerRole, isSelf = false) {
    if (!employeeData) return null;

    const normalizedRole = String(viewerRole).toLowerCase().trim();
    const masked = { ...employeeData };

    // Admin sees everything
    if (normalizedRole === 'admin') {
        return masked;
    }

    // Self can see own private data but not all sensitive fields
    if (isSelf) {
        // Mask only highly sensitive fields
        if (masked.PANNumber) {
            masked.PANNumber = maskPAN(masked.PANNumber);
        }
        if (masked.AadhaarNumber) {
            masked.AadhaarNumber = maskAadhaar(masked.AadhaarNumber);
        }
        return masked;
    }

    // HR can see private but not all sensitive fields
    if (normalizedRole === 'hr') {
        // Mask financial and identity information
        if (masked.PANNumber) masked.PANNumber = maskPAN(masked.PANNumber);
        if (masked.AadhaarNumber) masked.AadhaarNumber = maskAadhaar(masked.AadhaarNumber);
        if (masked.lpa) masked.lpa = '***REDACTED***';
        if (masked.basic_pct) delete masked.basic_pct;
        if (masked.hra_pct) delete masked.hra_pct;
        if (masked.paid_basic_monthly) delete masked.paid_basic_monthly;
        return masked;
    }

    // Regular employees see only public fields
    const publicData = {};
    for (const field of EMPLOYEE_PUBLIC_FIELDS) {
        if (masked.hasOwnProperty(field)) {
            publicData[field] = masked[field];
        }
    }

    return publicData;
}

/**
 * Mask PAN number (show only last 4 digits)
 * @param {string} pan - PAN number
 * @returns {string} Masked PAN
 */
function maskPAN(pan) {
    if (!pan || pan.length < 4) return '****';
    return '******' + pan.slice(-4);
}

/**
 * Mask Aadhaar number (show only last 4 digits)
 * @param {string} aadhaar - Aadhaar number
 * @returns {string} Masked Aadhaar
 */
function maskAadhaar(aadhaar) {
    if (!aadhaar || aadhaar.length < 4) return '****';
    return '********' + aadhaar.slice(-4);
}

/**
 * Check if user can view employee details
 * Implements authorization logic
 * 
 * @param {number} viewerId - ID of user trying to view
 * @param {number} targetEmployeeId - ID of employee being viewed
 * @param {string} viewerRole - Role of viewer
 * @returns {Promise<boolean>} True if viewer can access target employee's data
 */
async function canViewEmployee(viewerId, targetEmployeeId, viewerRole) {
    const normalizedRole = String(viewerRole).toLowerCase().trim();
    
    // Admin and HR can view anyone
    if (normalizedRole === 'admin' || normalizedRole === 'hr') {
        return true;
    }

    let connection = null;
    
    try {
        connection = await db();
        
        // Get viewer's employee record
        const viewerEmployee = await findEmployeeByUserId(viewerId);
        if (!viewerEmployee) return false;

        // Can view self
        if (viewerEmployee.id === parseInt(targetEmployeeId)) {
            return true;
        }

        // Managers can view their direct reports
        const [reports] = await connection.query(
            'SELECT COUNT(*) as count FROM employees WHERE id = ? AND reporting_manager_id = ?',
            [targetEmployeeId, viewerEmployee.id]
        );

        if (reports[0].count > 0) {
            return true;
        }

        // Can view team members (people with same manager)
        if (viewerEmployee.reporting_manager_id) {
            const [teammates] = await connection.query(
                'SELECT COUNT(*) as count FROM employees WHERE id = ? AND reporting_manager_id = ?',
                [targetEmployeeId, viewerEmployee.reporting_manager_id]
            );

            if (teammates[0].count > 0) {
                return true;
            }
        }

        return false;

    } catch (error) {
        console.error('[canViewEmployee] Error:', error.message);
        return false;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * Build standard employee detail query with all JOINs
 * Reusable query builder to eliminate code duplication
 * 
 * @param {string} whereClause - WHERE clause (e.g., "e.id = ?")
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query result
 */
async function buildEmployeeDetailQuery(whereClause, params) {
    let connection = null;
    
    try {
        connection = await db();
        
        const query = `
            SELECT 
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
                cc.name as cost_center_name,
                mgr.FullName as manager_name,
                mgr.WorkEmail as manager_email,
                lp.name as leave_plan_name,
                sp.name as shift_policy_name,
                ap.name as attendance_policy_name,
                wop.name as weekly_off_policy_name,
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
            LEFT JOIN attendance_policies ap ON e.attendance_policy_id = ap.id
            LEFT JOIN weekly_off_policies wop ON e.weekly_off_policy_id = wop.id
            LEFT JOIN attendance_capture_schemes acs ON e.attendance_capture_scheme_id = acs.id
            LEFT JOIN holiday_lists hl ON e.holiday_list_id = hl.id
            LEFT JOIN expense_policies ep ON e.expense_policy_id = ep.id
            ${whereClause}
        `;

        const [rows] = await connection.query(query, params);
        return rows;

    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * Build pagination query
 * 
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @returns {Object} Pagination info { limit, offset }
 */
function buildPagination(page = 1, pageSize = 50) {
    const maxPageSize = 1000;
    const safePage = Math.max(1, parseInt(page) || 1);
    const safePageSize = Math.min(maxPageSize, Math.max(1, parseInt(pageSize) || 50));
    
    return {
        limit: safePageSize,
        offset: (safePage - 1) * safePageSize,
        page: safePage,
        pageSize: safePageSize
    };
}

/* ============ EXPORTS ============ */

// Backward compatible exports (must maintain exact names)
module.exports = { 
    findEmployeeByUserId, 
    toMySQLDateTime, 
    getOrCreateMaster,
    
    // New utility exports
    toMySQLDate,
    validateEmployeeId,
    sanitizeEmployeeInput,
    filterEmployeeUpdateData,
    maskSensitiveData,
    maskPAN,
    maskAadhaar,
    canViewEmployee,
    buildEmployeeDetailQuery,
    buildPagination,
    
    // Export field whitelists for use in routes
    EMPLOYEE_PUBLIC_FIELDS,
    EMPLOYEE_PRIVATE_FIELDS,
    EMPLOYEE_SENSITIVE_FIELDS,
    EMPLOYEE_UPDATE_FIELDS_SELF,
    EMPLOYEE_UPDATE_FIELDS_HR,
    EMPLOYEE_UPDATE_FIELDS_ADMIN,
    EMPLOYEE_READONLY_FIELDS
};
