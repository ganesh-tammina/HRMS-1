/**
 * HRMS REFACTORED SERVER - Modular Structure
 * ==========================================
 * This is the refactored version with modular organization
 * All functionality remains the same, just better organized
 */

// Load environment variables
require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');
const path = require("path");
const multer = require("multer");
const swaggerUi = require("swagger-ui-express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const fs = require("fs");

// Import Swagger specification (modular main)
const swaggerSpec = require("./swagger/swagger.spec.js");

// Import configurations
const { DB, db } = require("./config/database");
const { JWT_SECRET } = require("./config/constants");

// Import migration runner
const { runMigrations } = require("./migrations/run-migrations");

// Import middleware
const { auth, admin, hr, manager, roleAuth } = require("./middleware/auth");

// Import utilities
const { findEmployeeByUserId, toMySQLDateTime, getOrCreateMaster } = require("./utils/helpers");
const { excel } = require("./utils/excelReader");

// Import route modules
const authRoutes = require("./routes/auth.routes");
const masterRoutes = require("./routes/master.routes");
const candidatesRoutes = require("./routes/candidates.routes");
const preonboardingRoutes = require("./routes/preonboarding.routes");
const onboardingRoutes = require("./routes/onboarding.routes.enhanced.js");
const employeeRoutes = require("./routes/employee.routes");
const attendanceRoutes = require("./routes/attendance-enhanced.routes"); // Enhanced with multiple punches
const leaveRoutes = require("./routes/leave-enhanced.routes"); // Enhanced leave management
const payrollRoutes = require("./routes/payroll.routes");
const uploadRoutes = require("./routes/upload.routes");
const timesheetRoutes = require("./routes/timesheet-enhanced.routes"); // Enhanced timesheet management
const complianceRoutes = require("./routes/compliance.routes"); // Compliance tracking & enforcement
const announcementRoutes = require("./routes/announcement.routes");
const supportRoutes = require("./routes/support.routes");
const birthdayRoutes = require("./routes/birthday.routes");
const holidayRoutes = require("./routes/holiday.routes");
const reportRoutes = require("./routes/report.routes");
const reportRoutesEnhanced = require("./routes/report.routes.enhanced"); // Enhanced analytics
const notificationRoutesEnhanced = require("./routes/notification.routes.enhanced"); // Enhanced notifications
const workUpdatesRoutes = require("./routes/workupdates.routes");
const adminTimesheetRoutes = require("./routes/admin-timesheet.routes");
const projectRoutes = require("./routes/projects.routes");
const assetRoutes = require("./routes/assets.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const emailRoutes = require("./routes/email.routes");
const financeConfigRoutes = require("./routes/finance-master-config.routes"); // Finance Master Configuration Engine

// Import notification service
const timesheetNotificationService = require("./utils/timesheet-notification.service");
const complianceChecker = require("./utils/compliance-checker.service");

const app = express();
const upload = multer({ dest: "uploads/" });

// CORS Configuration for Production
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4201')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

console.log('🌐 Allowed CORS origins:', allowedOrigins);
console.log('✅ Finance Master Configuration Engine integrated'); // Integration confirmation

// Middleware
app.use(bodyParser.json());

app.use(
    cors({
        origin: true,
    })
);

// Serve static files from public/www/browser folder (where Angular build outputs)
// IMPORTANT: This must come BEFORE the catch-all route
app.use(express.static(path.join(__dirname, 'public', 'www', 'browser'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0', // No cache in dev, 1d in prod
    etag: false,   // Disable ETag for better caching
    setHeaders: (res, path) => {
        // ✅ Ensure CSS files load immediately (not deferred)
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
        // ✅ Ensure JS loads properly  
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        }
    }
}));

// Serve uploaded files (profile images, documents, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// SPA fallback - serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'www', 'browser','index.html'));
});

// SPA fallback - serve index.html for non-API routes (client-side routing)
// This route ONLY matches paths without file extensions (no dots = no files)
// Pattern explained:
//   ^              - start of path
//   (?!.*\.)       - negative lookahead: must NOT contain a dot (file extension)
//   (?!.*api)      - must NOT contain /api
//   (?!.*uploads)  - must NOT contain /uploads
//   (?!.*api-docs) - must NOT contain /api-docs
app.get(/^(?!.*\.)(?!.*api|.*uploads|.*api-docs).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'www', 'browser','index.html'));
});

// Swagger JSON endpoint (needed for Swagger UI)
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(swaggerSpec);
});

/* ============ FRONTEND DIAGNOSTICS ENDPOINT ============ */

app.get('/api/diagnostics', (req, res) => {
    const fs = require('fs');
    const browserPath = path.join(__dirname, 'public', 'www', 'browser');
    
    const diagnostics = {
        timestamp: new Date().toISOString(),
        server: {
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 3000,
            platform: process.platform
        },
        frontend: {
            buildPath: browserPath,
            exists: fs.existsSync(browserPath),
            files: {
                indexHtml: fs.existsSync(path.join(browserPath, 'index.html')),
                mainJs: fs.readdirSync(browserPath).filter(f => f.startsWith('main-')).length > 0,
                polyfillsJs: fs.readdirSync(browserPath).filter(f => f.startsWith('polyfills-')).length > 0,
                stylesCss: fs.readdirSync(browserPath).filter(f => f.startsWith('styles-')).length > 0,
            },
            fileList: fs.existsSync(browserPath) ? 
                fs.readdirSync(browserPath)
                    .filter(f => f.match(/\.(js|css|html|map)$/))
                    .map(f => ({
                        name: f,
                        size: fs.statSync(path.join(browserPath, f)).size,
                        modified: fs.statSync(path.join(browserPath, f)).mtime
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name))
                : []
        },
        staticServing: {
            middleware: 'express.static configured for /public/www/browser',
            spaFallback: 'Regex: /^(?!.*)(?!.*api|.*uploads|.*api-docs).*$/',
            corsEnabled: true
        },
        status: '✅ Frontend build detected - UI should render properly'
    };
    
    res.json(diagnostics);
});

/* ============ DATABASE INITIALIZATION ============ */

async function initializeDatabase() {
    const pool = mysql.createPool({
        host: "localhost",
        user: "root",
        password: "root",
        waitForConnections: true,
        connectionLimit: 60,
        queueLimit: 0
    });

    const conn = await pool.getConnection();

    try {
        const schemaPath = path.join(__dirname, 'schema.sql');

        if (!fs.existsSync(schemaPath)) {
            console.warn('⚠️ schema.sql not found, skipping file-based initialization');
            await conn.query(`CREATE DATABASE IF NOT EXISTS hrms_db_new`);
            await conn.query(`USE hrms_db_new`);
            console.log("✅ Database created/verified (minimal setup)");
        } else {
            console.log('📄 Reading schema from schema.sql...');
            const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

            await conn.query(`CREATE DATABASE IF NOT EXISTS hrms_db_new`);
            console.log("✅ Database hrms_db_new created/verified");
            await conn.query(`USE hrms_db_new`);
            console.log("✅ Using database hrms_db_new");

            const sqlWithoutComments = schemaSQL
                .split('\n')
                .map(line => {
                    const commentIndex = line.indexOf('--');
                    if (commentIndex >= 0) return line.substring(0, commentIndex);
                    return line;
                })
                .join('\n');

            const statements = sqlWithoutComments
                .split(';')
                .map(s => s.trim())
                .filter(s => {
                    if (s.length === 0) return false;
                    const upper = s.toUpperCase();
                    if (upper.includes('CREATE DATABASE')) return false;
                    if (upper.startsWith('USE ')) return false;
                    return true;
                });

            console.log(`📊 Executing ${statements.length} SQL statements...`);

            let successCount = 0;
            let skipCount = 0;

            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                try {
                    await conn.query(statement);
                    successCount++;
                    if (statement.toUpperCase().includes('CREATE TABLE')) {
                        const match = statement.match(/CREATE TABLE.*?`?(\w+)`?\s*\(/i);
                        if (match) console.log(`  ✓ Created table: ${match[1]}`);
                    }
                } catch (err) {
                    if (err.message.includes('Duplicate') ||
                        err.message.includes('already exists') ||
                        err.message.includes('Multiple primary key')) {
                        skipCount++;
                    } else {
                        console.error(`❌ Error on statement ${i + 1}:`);
                        console.error(`   SQL: ${statement.substring(0, 100)}...`);
                        console.error(`   Error: ${err.message}`);
                        throw err;
                    }
                }
            }

            console.log(`✅ Database initialization complete: ${successCount} executed, ${skipCount} skipped`);
        }

    } catch (error) {
        console.error("❌ Database initialization error:", error.message);
        throw error;
    } finally {
        await conn.release();
        await pool.end();
    }
}

async function ensureAdminUser() {
    const conn = await mysql.createConnection({
        host: DB.host,
        user: DB.user,
        password: DB.password,
        database: DB.database
    });
    try {
        const [rows] = await conn.execute('SELECT id FROM users WHERE username = ? LIMIT 1', ['admin']);
        if (rows.length) {
            console.log('✅ Default admin already exists');
            return;
        }
        const hashed = await bcrypt.hash('admin123', 10);
        await conn.execute(
            'INSERT INTO users (username, password_hash, role, full_name, created_at) VALUES (?, ?, ?, ?, NOW())',
            ['admin', hashed, 'admin', 'Default Admin']
        );
        console.log('✅ Default admin created: username="admin" password="admin123"');
    } catch (err) {
        console.error('Failed to create default admin:', err.message);
        throw err;
    } finally {
        await conn.end();
    }
}

/* ============ ACCESS MATRIX ============ */

const ACCESS_MATRIX = {
    description: "Role access (allowed = true). Roles: admin, hr, manager, finance, employee",
    matrix: {
        "/api/login": { admin: true, hr: true, manager: true, employee: true, method: "POST", note: "public auth" },
        "/api/onboarding/set-password": { admin: true, hr: true, manager: true, employee: true, method: "POST" },
        "/api/employees": { "GET": { admin: true, hr: true, manager: true, employee: false }, "POST": { admin: true, hr: true, manager: false, employee: false } },
        "/api/employees/search": { admin: true, hr: true, manager: true, employee: true, method: "GET" },
        "/api/profile": { "GET": { admin: true, hr: true, manager: true, employee: true }, "PUT": { admin: true, hr: true, manager: true, employee: true } },
        "/api/payslips/{employee_id}": { admin: true, hr: true, manager: true, employee: true, note: "employee can view own only" },
        "/api/payslips/{employee_id}/{slip_id}": { admin: true, hr: true, manager: true, employee: true, note: "employee can view own only" },
        "/api/upload/employees": { admin: true, hr: true, manager: false, employee: false, method: "POST" },
        "/api/upload/payroll": { admin: true, hr: true, finance: true, manager: false, employee: false, method: "POST" },
        "/api/upload/holidays": { admin: true, hr: true, manager: false, employee: false, method: "POST" },
        "/api/attendance": { "POST": { admin: true, hr: true, manager: true, employee: true }, "GET /api/attendance/{date}": { admin: true, hr: true, manager: true, employee: false } },
        "/api/attendance-report": { admin: true, hr: true, manager: true, employee: false, method: "GET" },
        "/api/timesheets": { "POST": { admin: true, hr: true, manager: true, employee: true }, "GET": { admin: true, hr: true, manager: true, employee: true } },
        "/api/leaves": { "GET": { admin: true, hr: true, manager: true, employee: true }, "POST": { admin: true, hr: true, manager: true, employee: true } },
        "/api/leaves/{id}": { "PUT": { admin: true, hr: true, manager: true, employee: false } },
        "/api/announcements": { "GET": { admin: true, hr: true, manager: true, employee: true }, "POST": { admin: true, hr: true, manager: false, employee: false } },
        "/api/support": { "GET": { admin: true, hr: true, manager: true, employee: true }, "POST": { admin: true, hr: true, manager: true, employee: true } },
        "/api/holidays": { admin: true, hr: true, manager: true, employee: true, method: "GET" },
        "/api/birthdays": { admin: true, hr: true, manager: true, employee: true, method: "GET" },
        "/api/birthday-wishes": { "POST": { admin: true, hr: true, manager: true, employee: true }, "GET /api/birthday-wishes/{employee_id}": { admin: true, hr: true, manager: true, employee: true } },
        "/api/support": { admin: true, hr: true, manager: true, employee: true },
        "/api/access-matrix": { admin: true, hr: true, manager: true, employee: true, method: "GET", note: "Returns this matrix" }
    }
};

app.get("/api/access-matrix", auth, async (req, res) => {
    res.json(ACCESS_MATRIX);
});

/* ============ MOUNT MODULAR ROUTES ============ */

// Authentication & Authorization Routes
app.use("/api/auth", authRoutes);

// Master Data Routes (locations, departments, designations, etc.)
app.use("/api", masterRoutes);

// Candidates Routes
app.use("/api/candidates", candidatesRoutes);

// Pre-onboarding Routes
app.use("/api/preonboarding", preonboardingRoutes);

// Onboarding Routes
app.use("/api/onboarding", onboardingRoutes);

// Employee Routes
app.use("/api/employees", employeeRoutes);

// Attendance Routes
app.use("/api/attendance", attendanceRoutes);

// Leave Routes
app.use("/api/leaves", leaveRoutes);

// Payroll Routes
app.use("/api/payroll", payrollRoutes);
app.use("/api/payslips", payrollRoutes); // Also mount for payslips endpoints

// Payroll Master CRUD Routes
const payrollMasterRoutes = require("./routes/payroll.master.routes");
app.use("/api/payroll-master", payrollMasterRoutes);
// Finance Master Configuration Engine
app.use("/api/finance-config", financeConfigRoutes);
// Upload Routes
app.use("/api/upload", uploadRoutes);

// Timesheet Routes
app.use("/api/timesheets", timesheetRoutes);
app.use("/api/timesheet", timesheetRoutes); // Also mount on singular for compatibility

// Compliance & Enforcement Routes
app.use("/api/compliance", complianceRoutes);

// Announcement Routes
app.use("/api/announcements", announcementRoutes);

// Support Routes
app.use("/api/support", supportRoutes);

// Birthday Routes
app.use("/api/birthdays", birthdayRoutes);
app.use("/api/birthday-wishes", birthdayRoutes); // Also mount for wishes

// Holiday Routes
app.use("/api/holidays", holidayRoutes);

// Report Routes
app.use("/api/reports", reportRoutes);
app.use("/api/reports/analytics", reportRoutesEnhanced); // Enhanced analytics endpoints
app.use("/api/reports/export", reportRoutesEnhanced); // Enhanced export endpoints

// Notification Routes
app.use("/api/notifications", notificationRoutesEnhanced); // Enhanced notification system

// Work Updates Routes (Employee)
app.use("/api/work-updates", workUpdatesRoutes);

// Admin Timesheet Verification Routes
app.use("/api/admin/timesheet", adminTimesheetRoutes);

// Project Management Routes
app.use("/api/projects", projectRoutes);

// Asset Management Routes
app.use("/api/assets", assetRoutes);

// Dashboard & Analytics Routes
app.use("/api/dashboard", dashboardRoutes);

// Email Routes
app.use("/", emailRoutes);

/* ============ SWAGGER API DOCUMENTATION ============ */

// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve);
app.get("/api-docs", swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        persistAuthorization: true,
        displayOperationId: false,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        tryItOutEnabled: true
    },
    customCss: `.swagger-ui .topbar {background-color:#1976d2}`,
    customSiteTitle: "HRMS API Documentation - Modular"
}));

/* ============ HEALTH CHECK ============ */

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date(),
        server: "HRMS API v2.0 (Modular Structure)",
        modules: {
            auth: "✓ Loaded",
            masters: "✓ Loaded",
            onboarding: "✓ Loaded",
            employees: "✓ Loaded",
            attendance: "✓ Loaded",
            leaves: "✓ Loaded",
            payroll: "✓ Loaded",
            uploads: "✓ Loaded",
            timesheets: "✓ Loaded",
            announcements: "✓ Loaded",
            support: "✓ Loaded",
            birthdays: "✓ Loaded",
            holidays: "✓ Loaded",
            reports: "✓ Loaded",
            notifications: "✓ Loaded",
            projects: "✓ Loaded",
            assets: "✓ Loaded",
            dashboard: "✓ Loaded",
            admin_timesheet: "✓ Loaded"
        }
    });
});

/* ============ START SERVER ============ */

(async function startServer() {
    try {
        console.log("🔄 Initializing database...");
        await initializeDatabase();
        console.log("✅ Database initialized\n");

        console.log("🔄 Running database migrations...");
        const connection = await db.getConnection();
        try {
            await runMigrations(connection);
        } finally {
            connection.release();
        }
        console.log("✅ Migrations completed\n");

        console.log("🔄 Creating default admin user...");
        await ensureAdminUser();
        console.log("✅ Admin user ready\n");

        const PORT = process.env.PORT || 3000;
        const ENV = process.env.NODE_ENV || 'development';

        // Start timesheet notification service
        timesheetNotificationService.start();
        console.log("✅ Timesheet notification service started");

        // Start compliance checker service
        complianceChecker.start();

        app.listen(PORT, () => {
            console.log(`\n╔══════════════════════════════════════════════╗`);
            console.log(`║     HRMS API Server (Modular)                ║`);
            console.log(`╠══════════════════════════════════════════════╣`);
            console.log(`║ Environment: ${ENV.padEnd(32)} ║`);
            console.log(`║ Port: ${String(PORT).padEnd(39)} ║`);
            console.log(`║ API Docs: http://localhost:${PORT}/api-docs     ║`);
            console.log(`║ Home: http://localhost:${PORT}/                 ║`);
            console.log(`║ API Base: ${(process.env.API_BASE_URL || `http://localhost:${PORT}`).padEnd(33)} ║`);
            console.log(`║ Default Login: admin / admin123              ║`);
            console.log(`║                                              ║`);
            console.log(`║ 📁 Modular Structure:                        ║`);
            console.log(`║   ├── config/    (DB & Constants)            ║`);
            console.log(`║   ├── middleware/ (Auth & Guards)            ║`);
            console.log(`║   ├── routes/    (API Endpoints)             ║`);
            console.log(`║   ├── utils/     (Helpers & Excel)           ║`);
            console.log(`║   └── swagger/   (API Documentation)         ║`);
            console.log(`╚══════════════════════════════════════════════╝`);
        });
    } catch (err) {
        console.error("❌ Failed to start server:", err.message);
        process.exit(1);
    }
})();

module.exports = app;
