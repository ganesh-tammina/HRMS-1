/**
 * UPLOAD ROUTES
 * Handles bulk uploads for employees, payroll, and holidays
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { db } = require("../config/database");
const { auth, admin, hr } = require("../middleware/auth");
const { getOrCreateMaster } = require("../utils/helpers");
const { excel } = require("../utils/excelReader");

const upload = multer({ dest: "uploads/" });

/* ============ BULK EMPLOYEE UPLOAD ============ */

router.post("/employees", auth, admin, hr, upload.single("file"), async (req, res) => {
    const rows = excel(req.file.path);
    const c = await db();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = [];

    for (const r of rows) {
        try {
            const empNo = r.EmployeeNumber || r['Employee Number'] || null;
            if (!empNo) {
                skipped++;
                errors.push("Missing EmployeeNumber");
                continue;
            }

            // ---- Master Data Lookups ----
            const locationName = r.Location || r.LocationName || null;
            const locationCountry = r.LocationCountry || r['Location Country'] || null;
            const departmentName = r.Department || null;
            const subDepartmentName = r.SubDepartment || r['Sub Department'] || null;
            const designationName = r.Designation || r.JobTitle || null;
            const secondaryDesignationName = r.SecondaryDesignation || r.SecondaryJobTitle || r['Secondary Designation'] || null;
            const buName = r.BusinessUnit || null;
            const legalName = r.LegalEntity || null;
            const costCenterCode = r.CostCenter || r.CostCenterCode || null;
            const bandName = r.Band || null;
            const payGradeName = r.PayGrade || r['Pay Grade'] || null;

            // Policy lookups - matching exact Excel column names
            const leavePlanName = r.LeavePlan || r['Leave Plan'] || null;
            const shiftPolicyName = r.ShiftPolicyName || r.ShiftPolicy || r['Shift Policy'] || null;
            const weeklyOffPolicyName = r.WeeklyOffPolicyName || r.WeeklyOffPolicy || r['Weekly Off Policy'] || null;
            const attendancePolicyName = r.AttendanceTimeTrackingPolicy || r.AttendancePolicy || r['Attendance Policy'] || null;
            const attendanceCaptureSchemeName = r.AttendanceCaptureScheme || r['Attendance Capture Scheme'] || null;
            const holidayListName = r.HolidayListName || r.HolidayList || r['Holiday List'] || null;
            const expensePolicyName = r.ExpensePolicyName || r.ExpensePolicy || r['Expense Policy'] || null;

            // ---- Ensure master data exists and get IDs (only if value provided) ----
            console.log(`\n📋 Processing Employee: ${empNo} - ${r.FullName || r.Name || ''}`);
            console.log(`   Master Data: Location="${locationName}", Dept="${departmentName}", Desig="${designationName}"`);

            // Create/update location with country
            let locationId = null;
            if (locationName) {
                const [existingLoc] = await c.query('SELECT id FROM locations WHERE name = ?', [locationName]);
                if (existingLoc.length) {
                    locationId = existingLoc[0].id;
                    if (locationCountry) {
                        await c.query('UPDATE locations SET country = ? WHERE id = ?', [locationCountry, locationId]);
                    }
                } else {
                    const [newLoc] = await c.query('INSERT INTO locations (name, country) VALUES (?, ?)', [locationName, locationCountry]);
                    locationId = newLoc.insertId;
                }
            }
            const locId = locationId;
            const deptId = departmentName ? await getOrCreateMaster(c, 'departments', 'name', departmentName) : null;

            // Sub-department needs parent department_id
            let subDeptId = null;
            if (subDepartmentName && deptId) {
                const [existingSubDept] = await c.query(
                    'SELECT id FROM sub_departments WHERE name = ? AND department_id = ?',
                    [subDepartmentName, deptId]
                );
                if (existingSubDept.length) {
                    subDeptId = existingSubDept[0].id;
                } else {
                    const [newSubDept] = await c.query(
                        'INSERT INTO sub_departments (name, department_id) VALUES (?, ?)',
                        [subDepartmentName, deptId]
                    );
                    subDeptId = newSubDept.insertId;
                    console.log(`✓ Created new sub_departments: ${subDepartmentName} (ID: ${subDeptId})`);
                }
            }

            const desgId = designationName ? await getOrCreateMaster(c, 'designations', 'name', designationName) : null;
            const secondaryDesgId = secondaryDesignationName ? await getOrCreateMaster(c, 'designations', 'name', secondaryDesignationName) : null;
            const buId = buName ? await getOrCreateMaster(c, 'business_units', 'name', buName) : null;
            const legalId = legalName ? await getOrCreateMaster(c, 'legal_entities', 'name', legalName) : null;
            const costId = costCenterCode ? await getOrCreateMaster(c, 'cost_centers', 'code', costCenterCode) : null;
            const bandId = bandName ? await getOrCreateMaster(c, 'bands', 'name', bandName) : null;
            const payGradeId = payGradeName ? await getOrCreateMaster(c, 'pay_grades', 'name', payGradeName) : null;

            // Policy IDs
            const leavePlanId = leavePlanName ? await getOrCreateMaster(c, 'leave_plans', 'name', leavePlanName) : null;
            const shiftPolicyId = shiftPolicyName ? await getOrCreateMaster(c, 'shift_policies', 'name', shiftPolicyName) : null;
            // const weeklyOffPolicyId = weeklyOffPolicyName ? await getOrCreateMaster(c, 'weekly_off_policies', 'name', weeklyOffPolicyName) : null;
            const weeklyOffPolicyId = await getOrCreateMaster(
                c,
                'weekly_off_policies',
                'name',
                weeklyOffPolicyName,
                {
                    location_id: locId,
                    department_id: deptId,
                    shift_policy_id: shiftPolicyId
                }
            );
            const attendancePolicyId = attendancePolicyName ? await getOrCreateMaster(c, 'attendance_policies', 'name', attendancePolicyName) : null;
            const attendanceCaptureSchemeId = attendanceCaptureSchemeName ? await getOrCreateMaster(c, 'attendance_capture_schemes', 'name', attendanceCaptureSchemeName) : null;
            const holidayListId = holidayListName ? await getOrCreateMaster(c, 'holiday_lists', 'name', holidayListName) : null;
            const expensePolicyId = expensePolicyName ? await getOrCreateMaster(c, 'expense_policies', 'name', expensePolicyName) : null;

            console.log(`   IDs: Loc=${locationId}, Dept=${deptId}, Desig=${desgId}, Band=${bandId}`);

            // Reporting Manager lookup (by EmployeeNumber)
            let reportingManagerId = null;
            if (r.ReportingManager || r['Reporting Manager'] || r.ReportingManagerEmployeeNumber) {
                const [mgr] = await c.query(
                    `SELECT id FROM employees WHERE EmployeeNumber = ? LIMIT 1`,
                    [r.ReportingManager || r['Reporting Manager'] || r.ReportingManagerEmployeeNumber]
                );
                if (mgr.length > 0) reportingManagerId = mgr[0].id;
            }

            // Dotted Line Manager lookup (by EmployeeNumber)
            let dottedLineManagerId = null;
            if (r.DottedLineManager || r['Dotted Line Manager']) {
                const dottedMgrNum = String(r.DottedLineManager || r['Dotted Line Manager']).trim();
                if (dottedMgrNum && dottedMgrNum !== 'Not Applicable' && dottedMgrNum !== 'N/A') {
                    const [dMgr] = await c.query(
                        `SELECT id FROM employees WHERE EmployeeNumber = ? LIMIT 1`,
                        [dottedMgrNum]
                    );
                    if (dMgr.length > 0) dottedLineManagerId = dMgr[0].id;
                }
            }

            // ---- Check employee exists ----
            const [existing] = await c.query(
                `SELECT id FROM employees WHERE EmployeeNumber = ?`,
                [empNo]
            );

            if (existing.length > 0) {
                // ---------- UPDATE ----------
                // Convert PhysicallyHandicapped to 0/1
                const physicallyHandicapped = (['Yes', 'YES', 'yes', 'Y', 'y', '1', 1, true].includes(r.PhysicallyHandicapped)) ? 1 : 0;

                // Parse notice_period - extract number from text like "3months" or "Default Notice period - 3months"
                let noticePeriod = null;
                if (r.notice_period || r.NoticePeriod) {
                    const noticeText = String(r.notice_period || r.NoticePeriod);
                    const match = noticeText.match(/(\d+)/); // Extract first number
                    if (match) {
                        noticePeriod = parseInt(match[1]);
                    }
                }

                await c.query(
                    `UPDATE employees SET
                        attendance_number = ?,
                        FirstName = ?,
                        MiddleName = ?,
                        LastName = ?,
                        FullName = ?,
                        WorkEmail = ?,
                        PersonalEmail = ?,
                        Gender = ?,
                        MaritalStatus = ?,
                        BloodGroup = ?,
                        PhysicallyHandicapped = ?,
                        Nationality = ?,
                        DateOfBirth = ?,
                        current_address_line1 = ?,
                        current_address_line2 = ?,
                        current_city = ?,
                        current_state = ?,
                        current_zip = ?,
                        current_country = ?,
                        permanent_address_line1 = ?,
                        permanent_address_line2 = ?,
                        permanent_city = ?,
                        permanent_state = ?,
                        permanent_zip = ?,
                        permanent_country = ?,
                        father_name = ?,
                        mother_name = ?,
                        spouse_name = ?,
                        children_names = ?,
                        DateJoined = ?,
                        time_type = ?,
                        worker_type = ?,
                        EmploymentStatus = ?,
                        LocationId = ?,
                        DepartmentId = ?,
                        SubDepartmentId = ?,
                        DesignationId = ?,
                        SecondaryDesignationId = ?,
                        BusinessUnitId = ?,
                        LegalEntityId = ?,
                        BandId = ?,
                        PayGradeId = ?,
                        CostCenterId = ?,
                        reporting_manager_id = ?,
                        dotted_line_manager_id = ?,
                        leave_plan_id = ?,
                        shift_policy_id = ?,
                        weekly_off_policy_id = ?,
                        attendance_policy_id = ?,
                        attendance_capture_scheme_id = ?,
                        holiday_list_id = ?,
                        expense_policy_id = ?,
                        PANNumber = ?,
                        AadhaarNumber = ?,
                        pf_number = ?,
                        uan_number = ?,
                        lpa = ?,
                        basic_pct = ?,
                        hra_pct = ?,
                        medical_allowance = ?,
                        transport_allowance = ?,
                        special_allowance = ?,
                        paid_basic_monthly = ?,
                        working_days = ?,
                        loss_of_days = ?,
                        exit_date = ?,
                        exit_status = ?,
                        termination_type = ?,
                        termination_reason = ?,
                        resignation_note = ?,
                        comments = ?
                     WHERE EmployeeNumber = ?`,
                    [
                        r.attendance_number || r.AttendanceNumber || null,
                        r.FirstName || null,
                        r.MiddleName || null,
                        r.LastName || null,
                        r.FullName || r.Name || null,
                        r.WorkEmail || null,
                        r.PersonalEmail || r['Personal Email'] || null,
                        r.Gender || null,
                        r.MaritalStatus || null,
                        r.BloodGroup || null,
                        physicallyHandicapped,
                        r.Nationality || null,
                        r.DateOfBirth || null,
                        r.current_address_line1 || r.CurrentAddressLine1 || null,
                        r.current_address_line2 || r.CurrentAddressLine2 || null,
                        r.current_city || r.CurrentCity || null,
                        r.current_state || r.CurrentState || null,
                        r.current_zip || r.CurrentZip || null,
                        r.current_country || r.CurrentCountry || null,
                        r.permanent_address_line1 || r.PermanentAddressLine1 || null,
                        r.permanent_address_line2 || r.PermanentAddressLine2 || null,
                        r.permanent_city || r.PermanentCity || null,
                        r.permanent_state || r.PermanentState || null,
                        r.permanent_zip || r.PermanentZip || null,
                        r.permanent_country || r.PermanentCountry || null,
                        r.father_name || r.FatherName || null,
                        r.mother_name || r.MotherName || null,
                        r.spouse_name || r.SpouseName || null,
                        r.children_names || r.ChildrenNames || null,
                        r.DateJoined || r.DateOfJoining || null,
                        r.time_type || r.TimeType || null,
                        r.worker_type || r.WorkerType || null,
                        r.EmploymentStatus || r.Status || null,
                        // r.notice_period || r.NoticePeriod || null,
                        locId,
                        deptId,
                        subDeptId,
                        desgId,
                        secondaryDesgId,
                        buId,
                        legalId,
                        bandId,
                        payGradeId,
                        costId,
                        reportingManagerId,
                        dottedLineManagerId,
                        leavePlanId,
                        shiftPolicyId,
                        weeklyOffPolicyId,
                        attendancePolicyId,
                        attendanceCaptureSchemeId,
                        holidayListId,
                        expensePolicyId,
                        r.PANNumber || null,
                        r.AadhaarNumber || null,
                        r.pf_number || r.PFNumber || null,
                        r.uan_number || r.UANNumber || null,
                        r.lpa || r.LPA || null,
                        r.basic_pct || r.BasicPct || null,
                        r.hra_pct || r.HRAPct || null,
                        r.medical_allowance || r.MedicalAllowance || null,
                        r.transport_allowance || r.TransportAllowance || null,
                        r.special_allowance || r.SpecialAllowance || null,
                        r.paid_basic_monthly || r.PaidBasicMonthly || null,
                        r.working_days || r.WorkingDays || null,
                        r.loss_of_days || r.LossOfDays || null,
                        r.exit_date || r.ExitDate || null,
                        r.exit_status || r.ExitStatus || null,
                        r.termination_type || r.TerminationType || null,
                        r.termination_reason || r.TerminationReason || null,
                        r.resignation_note || r.ResignationNote || null,
                        r.comments || r.Comments || null,
                        empNo
                    ]
                );
                updated++;
            } else {
                // ---------- INSERT ----------
                // Convert PhysicallyHandicapped to 0/1
                const physicallyHandicapped = (['Yes', 'YES', 'yes', 'Y', 'y', '1', 1, true].includes(r.PhysicallyHandicapped)) ? 1 : 0;

                // Parse notice_period - extract number from text like "3months" or "Default Notice period - 3months"
                let noticePeriod = null;
                if (r.notice_period || r.NoticePeriod) {
                    const noticeText = String(r.notice_period || r.NoticePeriod);
                    const match = noticeText.match(/(\d+)/); // Extract first number
                    if (match) {
                        noticePeriod = parseInt(match[1]);
                    }
                }

                await c.query(
                    `INSERT INTO employees
                     (EmployeeNumber, attendance_number, FirstName, MiddleName, LastName, FullName, 
                      WorkEmail, PersonalEmail, Gender, MaritalStatus, BloodGroup, PhysicallyHandicapped, 
                      Nationality, DateOfBirth,
                      current_address_line1, current_address_line2, current_city, current_state, current_zip, current_country,
                      permanent_address_line1, permanent_address_line2, permanent_city, permanent_state, permanent_zip, permanent_country,
                      father_name, mother_name, spouse_name, children_names,
                      DateJoined, time_type, worker_type, EmploymentStatus, notice_period,
                      LocationId, DepartmentId, SubDepartmentId, DesignationId, SecondaryDesignationId,
                      BusinessUnitId, LegalEntityId, BandId, PayGradeId, CostCenterId, reporting_manager_id, dotted_line_manager_id,
                      leave_plan_id, shift_policy_id, weekly_off_policy_id, attendance_policy_id, 
                      attendance_capture_scheme_id, holiday_list_id, expense_policy_id,
                      PANNumber, AadhaarNumber, pf_number, uan_number,
                      lpa, basic_pct, hra_pct, medical_allowance, transport_allowance, special_allowance,
                      paid_basic_monthly, working_days, loss_of_days,
                      exit_date, exit_status, termination_type, termination_reason, resignation_note, comments)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    [
                        empNo,
                        r.attendance_number || r.AttendanceNumber || null,
                        r.FirstName || null,
                        r.MiddleName || null,
                        r.LastName || null,
                        r.FullName || r.Name || null,
                        r.WorkEmail || null,
                        r.PersonalEmail || r['Personal Email'] || null,
                        r.Gender || null,
                        r.MaritalStatus || null,
                        r.BloodGroup || null,
                        physicallyHandicapped,
                        r.Nationality || null,
                        r.DateOfBirth || null,
                        r.current_address_line1 || r.CurrentAddressLine1 || null,
                        r.current_address_line2 || r.CurrentAddressLine2 || null,
                        r.current_city || r.CurrentCity || null,
                        r.current_state || r.CurrentState || null,
                        r.current_zip || r.CurrentZip || null,
                        r.current_country || r.CurrentCountry || null,
                        r.permanent_address_line1 || r.PermanentAddressLine1 || null,
                        r.permanent_address_line2 || r.PermanentAddressLine2 || null,
                        r.permanent_city || r.PermanentCity || null,
                        r.permanent_state || r.PermanentState || null,
                        r.permanent_zip || r.PermanentZip || null,
                        r.permanent_country || r.PermanentCountry || null,
                        r.father_name || r.FatherName || null,
                        r.mother_name || r.MotherName || null,
                        r.spouse_name || r.SpouseName || null,
                        r.children_names || r.ChildrenNames || null,
                        r.DateJoined || r.DateOfJoining || null,
                        r.time_type || r.TimeType || null,
                        r.worker_type || r.WorkerType || null,
                        r.EmploymentStatus || r.Status || null,
                        noticePeriod,
                        locationId,
                        deptId,
                        subDeptId,
                        desgId,
                        secondaryDesgId,
                        buId,
                        legalId,
                        bandId,
                        payGradeId,
                        costId,
                        reportingManagerId,
                        dottedLineManagerId,
                        leavePlanId,
                        shiftPolicyId,
                        weeklyOffPolicyId,
                        attendancePolicyId,
                        attendanceCaptureSchemeId,
                        holidayListId,
                        expensePolicyId,
                        r.PANNumber || null,
                        r.AadhaarNumber || null,
                        r.pf_number || r.PFNumber || null,
                        r.uan_number || r.UANNumber || null,
                        r.lpa || r.LPA || null,
                        r.basic_pct || r.BasicPct || null,
                        r.hra_pct || r.HRAPct || null,
                        r.medical_allowance || r.MedicalAllowance || null,
                        r.transport_allowance || r.TransportAllowance || null,
                        r.special_allowance || r.SpecialAllowance || null,
                        r.paid_basic_monthly || r.PaidBasicMonthly || null,
                        r.working_days || r.WorkingDays || null,
                        r.loss_of_days || r.LossOfDays || null,
                        r.exit_date || r.ExitDate || null,
                        r.exit_status || r.ExitStatus || null,
                        r.termination_type || r.TerminationType || null,
                        r.termination_reason || r.TerminationReason || null,
                        r.resignation_note || r.ResignationNote || null,
                        r.comments || r.Comments || null
                    ]
                );
                inserted++;
            }

        } catch (err) {
            skipped++;
            const errorMsg = `Row ${inserted + updated + skipped} (Employee: ${r.EmployeeNumber || 'Unknown'}): ${err.message}`;
            errors.push(errorMsg);
            console.error('❌ Employee upload error:', errorMsg);
            if (err.stack) console.error('Stack:', err.stack.split('\n').slice(0, 3).join('\n'));
        }
    }

    // Get master data counts after upload
    let masterCounts = [];
    try {
        const [counts] = await c.query(`
            SELECT 
                'locations' as table_name, COUNT(*) as count FROM locations
            UNION ALL SELECT 'departments', COUNT(*) FROM departments
            UNION ALL SELECT 'sub_departments', COUNT(*) FROM sub_departments
            UNION ALL SELECT 'designations', COUNT(*) FROM designations
            UNION ALL SELECT 'business_units', COUNT(*) FROM business_units
            UNION ALL SELECT 'legal_entities', COUNT(*) FROM legal_entities
            UNION ALL SELECT 'cost_centers', COUNT(*) FROM cost_centers
            UNION ALL SELECT 'bands', COUNT(*) FROM bands
            UNION ALL SELECT 'pay_grades', COUNT(*) FROM pay_grades
            UNION ALL SELECT 'leave_plans', COUNT(*) FROM leave_plans
            UNION ALL SELECT 'shift_policies', COUNT(*) FROM shift_policies
            UNION ALL SELECT 'weekly_off_policies', COUNT(*) FROM weekly_off_policies
            UNION ALL SELECT 'attendance_policies', COUNT(*) FROM attendance_policies
            UNION ALL SELECT 'attendance_capture_schemes', COUNT(*) FROM attendance_capture_schemes
            UNION ALL SELECT 'holiday_lists', COUNT(*) FROM holiday_lists
            UNION ALL SELECT 'expense_policies', COUNT(*) FROM expense_policies
        `);
        masterCounts = counts;
    } catch (countErr) {
        console.error('❌ Error fetching master counts:', countErr.message);
        masterCounts = [];
    }

    c.end();

    console.log('\n📊 Master Data Summary After Upload:');
    masterCounts.forEach(row => {
        console.log(`   ${row.table_name}: ${row.count} records`);
    });

    res.json({
        message: 'Employee upload completed',
        processed: rows.length,
        inserted,
        updated,
        skipped,
        errors: errors.slice(0, 20),
        summary: `✅ Inserted: ${inserted}, ✅ Updated: ${updated}, ⚠️ Skipped: ${skipped}`,
        masterDataCounts: masterCounts.reduce((acc, row) => {
            acc[row.table_name] = row.count;
            return acc;
        }, {})
    });
});

/* ============ BULK HOLIDAY UPLOAD ============ */

router.post("/holidays", auth, admin, upload.single("file"), async (req, res) => {
    const rows = excel(req.file.path);
    const c = await db();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const r of rows) {
        try {
            const holidayDate = r.holiday_date || r.HolidayDate || r.date || r.Date || null;
            const holidayName = r.holiday_name || r.HolidayName || r.name || r.Name || null;
            const holidayType = r.holiday_type || r.HolidayType || r.type || r.Type || 'public';
            const applicableStates = r.applicable_states || r.ApplicableStates || r.states || null;
            const description = r.description || r.Description || null;

            if (!holidayDate || !holidayName) {
                skipped++;
                continue;
            }

            // Check if holiday exists
            const [existing] = await c.query(
                "SELECT id FROM holidays WHERE holiday_date = ? AND holiday_name = ?",
                [holidayDate, holidayName]
            );

            if (existing.length > 0) {
                // Update
                await c.query(
                    "UPDATE holidays SET holiday_type = ?, applicable_states = ?, description = ? WHERE id = ?",
                    [holidayType, applicableStates, description, existing[0].id]
                );
                updated++;
            } else {
                // Insert
                await c.query(
                    "INSERT INTO holidays (holiday_date, holiday_name, holiday_type, applicable_states, description) VALUES (?, ?, ?, ?, ?)",
                    [holidayDate, holidayName, holidayType, applicableStates, description]
                );
                inserted++;
            }

        } catch (err) {
            skipped++;
        }
    }

    c.end();
    res.json({ processed: rows.length, inserted, updated, skipped });
});

/* ============ TEST/DIAGNOSTIC ENDPOINT ============ */

router.get("/test-master-creation", auth, admin, async (req, res) => {
    const c = await db();

    try {
        // Test creating entries in all master tables
        const testData = {
            location: "Test Location " + Date.now(),
            department: "Test Department " + Date.now(),
            designation: "Test Designation " + Date.now(),
            businessUnit: "Test BU " + Date.now(),
            legalEntity: "Test Legal " + Date.now(),
            costCenter: "TEST" + Date.now(),
            band: "Test Band " + Date.now(),
            payGrade: "Test Grade " + Date.now(),
            leavePlan: "Test Leave Plan " + Date.now(),
            shiftPolicy: "Test Shift " + Date.now()
        };

        const { getOrCreateMaster } = require("../utils/helpers");

        const results = {};
        results.locationId = await getOrCreateMaster(c, 'locations', 'name', testData.location);
        results.departmentId = await getOrCreateMaster(c, 'departments', 'name', testData.department);
        results.designationId = await getOrCreateMaster(c, 'designations', 'name', testData.designation);
        results.businessUnitId = await getOrCreateMaster(c, 'business_units', 'name', testData.businessUnit);
        results.legalEntityId = await getOrCreateMaster(c, 'legal_entities', 'name', testData.legalEntity);
        results.costCenterId = await getOrCreateMaster(c, 'cost_centers', 'code', testData.costCenter);
        results.bandId = await getOrCreateMaster(c, 'bands', 'name', testData.band);
        results.payGradeId = await getOrCreateMaster(c, 'pay_grades', 'name', testData.payGrade);
        results.leavePlanId = await getOrCreateMaster(c, 'leave_plans', 'name', testData.leavePlan);
        results.shiftPolicyId = await getOrCreateMaster(c, 'shift_policies', 'name', testData.shiftPolicy);

        c.end();

        res.json({
            message: "Master data creation test successful",
            testData,
            results,
            allCreated: Object.values(results).every(id => id !== null && id > 0)
        });
    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

/* ============ BULK PAYROLL UPLOAD ============ */

router.post("/payroll", auth, admin, upload.single("file"), async (req, res) => {
    const rows = excel(req.file.path);
    const c = await db();

    try {
        // Create payroll run
        const runMonth = req.body.month || new Date().getMonth() + 1;
        const runYear = req.body.year || new Date().getFullYear();
        const payrollType = req.body.payroll_type || rows[0]?.payroll_type || 'regular';

        const [runResult] = await c.query(
            "INSERT INTO payroll_runs (payroll_month, payroll_type) VALUES (?, ?)",
            [`${runYear}-${String(runMonth).padStart(2, '0')}`, payrollType]
        );
        const runId = runResult.insertId;

        let inserted = 0;
        let skipped = 0;
        let errors = [];

        // Log first row keys for debugging
        if (rows.length > 0) {
            console.log('📋 Excel columns found:', Object.keys(rows[0]));
        }

        for (const r of rows) {
            try {
                // Try multiple column name variations
                const empNo = r.EmployeeNumber || r['Employee Number'] || r.employee_number ||
                    r['Employee Code'] || r.employee_code || r.EmployeeCode ||
                    r['Emp No'] || r['Emp Number'] || r.emp_no || null;

                if (!empNo) {
                    skipped++;
                    if (errors.length < 10) { // Limit error messages
                        errors.push(`Missing EmployeeNumber (Available columns: ${Object.keys(r).slice(0, 5).join(', ')}...)`);
                    }
                    continue;
                }

                // Find employee
                const [emp] = await c.query("SELECT id FROM employees WHERE EmployeeNumber = ?", [empNo]);
                if (emp.length === 0) {
                    skipped++;
                    errors.push(`Employee ${empNo} not found`);
                    continue;
                }

                const empId = emp[0].id;

                // Parse all payroll components from Excel
                const parseNum = (val) => parseFloat(val || 0) || 0;
                const parseInt2 = (val) => parseInt(val || 0) || 0;

                // Basic info
                const payrollMonth = r.payroll_month || `${runYear}-${String(runMonth).padStart(2, '0')}`;
                const employmentStatus = r.employment_status || r.EmploymentStatus || null;
                const dateOfJoining = r.date_of_joining || r.DateOfJoining || null;
                const dateOfBirth = r.date_of_birth || r.DateOfBirth || null;
                const locationName = r.location || r.Location || null;
                const departmentName = r.department || r.Department || null;
                const jobTitle = r.job_title || r.JobTitle || null;
                const payrollStatus = r.status || r.Status || 'processed';
                const statusDescription = r.status_description || r.StatusDescription || null;
                const warnings = r.warnings || r.Warnings || null;

                // Days calculation
                const actualPayableDays = parseNum(r.actual_payable_days);
                const workingDays = parseNum(r.working_days);
                const lossOfPayDays = parseNum(r.loss_of_pay_days);
                const daysPayable = parseNum(r.days_payable);
                const payableUnits = parseNum(r.payable_units);
                const remunerationAmount = parseNum(r.remuneration_amount);

                // Earnings
                const basic = parseNum(r.basic);
                const hra = parseNum(r.hra);
                const medicalAllowance = parseNum(r.medical_allowance);
                const transportAllowance = parseNum(r.transport_allowance);
                const specialAllowance = parseNum(r.special_allowance);
                const mealCoupons = parseNum(r.meal_coupons);
                const mobileInternetAllowance = parseNum(r.mobile_internet_allowance);
                const newspaperJournalAllowance = parseNum(r.newspaper_journal_allowance);
                const childEducationAllowance = parseNum(r.child_education_allowance);
                const incentives = parseNum(r.incentives);
                const otherReimbursement = parseNum(r.other_reimbursement);
                const relocationBonus = parseNum(r.relocation_bonus);
                const grossAmount = parseNum(r.gross_a);

                // Employer contributions
                const pfEmployer = parseNum(r.pf_employer);
                const esiEmployer = parseNum(r.esi_employer);
                const totalEmployerContributions = parseNum(r.total || (pfEmployer + esiEmployer));

                // Employee deductions
                const pfEmployee = parseNum(r.pf_employee);
                const esiEmployee = parseNum(r.esi_employee);
                const totalContributions = parseNum(r.total_contributions_b);
                const professionalTax = parseNum(r.professional_tax);
                const totalIncomeTax = parseNum(r.total_income_tax);
                const loanDeduction = parseNum(r.loan_deduction);
                const mealCouponServiceCharge = parseNum(r.meal_coupon_service_charge);
                const otherDeduction = parseNum(r.other_deduction);
                const mealCouponDeduction = parseNum(r.meal_coupon);
                const totalDeductions = parseNum(r.total_deductions_c);

                // Net pay
                const netPay = parseNum(r.net_pay);
                const cashAdvance = parseNum(r.cash_advance_d);
                const settlementAgainstAdvance = parseNum(r.settlement_against_advance_e);
                const socialMediaLoginInvoice = parseNum(r.socialmedia_login_invoice);
                const totalReimbursements = parseNum(r.total_reimbursements_f);
                const totalNetPay = parseNum(r.total_net_pay);

                // Insert payslip with all 53 columns
                await c.query(
                    `INSERT INTO payroll_slips 
                     (payroll_run_id, employee_id, employment_status, date_of_joining, date_of_birth,
                      location_name, department_name, job_title, payroll_status, status_description, warnings,
                      actual_payable_days, working_days, loss_of_pay_days, days_payable, payable_units, remuneration_amount,
                      basic, hra, medical_allowance, transport_allowance, special_allowance,
                      meal_coupons, mobile_internet_allowance, newspaper_journal_allowance, child_education_allowance,
                      incentives, other_reimbursement, relocation_bonus, gross_amount,
                      pf_employer, esi_employer, total_employer_contributions,
                      pf_employee, esi_employee, total_contributions,
                      professional_tax, total_income_tax, loan_deduction, meal_coupon_service_charge,
                      other_deduction, meal_coupon_deduction, total_deductions,
                      net_pay, cash_advance, settlement_against_advance, social_media_login_invoice,
                      total_reimbursements, total_net_pay) 
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    [runId, empId, employmentStatus, dateOfJoining, dateOfBirth,
                        locationName, departmentName, jobTitle, payrollStatus, statusDescription, warnings,
                        actualPayableDays, workingDays, lossOfPayDays, daysPayable, payableUnits, remunerationAmount,
                        basic, hra, medicalAllowance, transportAllowance, specialAllowance,
                        mealCoupons, mobileInternetAllowance, newspaperJournalAllowance, childEducationAllowance,
                        incentives, otherReimbursement, relocationBonus, grossAmount,
                        pfEmployer, esiEmployer, totalEmployerContributions,
                        pfEmployee, esiEmployee, totalContributions,
                        professionalTax, totalIncomeTax, loanDeduction, mealCouponServiceCharge,
                        otherDeduction, mealCouponDeduction, totalDeductions,
                        netPay, cashAdvance, settlementAgainstAdvance, socialMediaLoginInvoice,
                        totalReimbursements, totalNetPay]
                );

                inserted++;

            } catch (err) {
                skipped++;
                errors.push(err.message);
            }
        }

        c.end();
        res.json({
            run_id: runId,
            processed: rows.length,
            inserted,
            skipped,
            errors: errors.slice(0, 10)
        });

    } catch (error) {
        c.end();
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
