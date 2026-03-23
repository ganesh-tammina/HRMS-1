
/**
 * SWAGGER API DOCUMENTATION
 * Complete OpenAPI 3.0 specification for HRMS API
 */
const baseUrl =
  process.env.NODE_ENV === "production"
    ? process.env.API_BASE_URL
    : "http://localhost:3000";

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "HRMS API - Modular Version",
    version: "2.0.0",
    description: `Human Resource Management System API - Modular Architecture with Auth, Employees, Payroll, Attendance, Timesheets, and more. Features hybrid work support (Office/WFH/Remote), leave management, and comprehensive reporting.`,
  },
  servers: [
    {
      url: baseUrl,
      description:
        process.env.NODE_ENV === "production"
          ? "Production Server"
          : "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "JWT token from /api/auth/login (username: admin, password: admin123)",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          username: { type: "string" },
          role: {
            type: "string",
            enum: ["admin", "hr", "manager", "employee"],
            description:
              "User role - admin (full access), hr (HR operations), manager (team management), employee (self-service)",
          },
        },
      },
      Employee: {
        type: "object",
        properties: {
          id: { type: "integer" },
          EmployeeNumber: { type: "string" },
          FullName: { type: "string" },
          WorkEmail: { type: "string" },
          Department: { type: "string" },
          Designation: { type: "string" },
          Location: { type: "string" },
        },
      },
      CheckInRequest: {
        type: "object",
        required: ["work_mode"],
        properties: {
          work_mode: {
            type: "string",
            enum: ["Office", "WFH", "Remote", "Hybrid"],
            description: "Work mode - Office (on-site), WFH (Work From Home), Remote (any remote location), Hybrid (mixed mode)",
          },
          location: { type: "string", example: "Home - Mumbai" },
          notes: { type: "string", example: "Working from home today" },
        },
      },
      WFHRequest: {
        type: "object",
        required: ["date", "work_mode"],
        properties: {
          date: {
            type: "string",
            format: "date",
            example: "2025-12-25",
            description: "Date for WFH/Remote work",
          },
          work_mode: {
            type: "string",
            enum: ["WFH", "Remote"],
            description:
              "Work mode - WFH (Work From Home) or Remote (any remote location)",
            example: "WFH",
          },
          reason: {
            type: "string",
            example: "Personal commitment",
            description: "Optional reason for the request",
          },
        },
      },
      LeaveApplication: {
        type: "object",
        required: [
          "employee_id",
          "leave_type_id",
          "start_date",
          "end_date",
          "reason",
        ],
        properties: {
          employee_id: { type: "integer" },
          leave_type_id: { type: "integer" },
          start_date: { type: "string", format: "date" },
          end_date: { type: "string", format: "date" },
          reason: { type: "string" },
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected", "cancelled"],
            description:
              "Leave status - pending (awaiting approval), approved (approved by manager), rejected (denied), cancelled (withdrawn by employee)",
            default: "pending",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/health": {
      get: {
        summary: "Health Check",
        description: "Check if server is running",
        security: [],
        tags: ["System"],
        responses: {
          200: { description: "Server is healthy" },
        },
      },
    },
    // ============ UPLOADS ============
    "/api/upload/employees": {
      post: {
        summary: "Bulk Upload Employees (Admin)",
        description:
          "Upload Excel file with employee data. Supports both insert and update operations.",
        tags: ["📤 Upload"],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description:
                      "Excel file (.xlsx or .xls) with employee data",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Employees uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    processed: { type: "integer" },
                    inserted: { type: "integer" },
                    updated: { type: "integer" },
                    skipped: { type: "integer" },
                    errors: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/upload/holidays": {
      post: {
        summary: "Bulk Upload Holidays (Admin)",
        description: "Upload Excel file with holiday data",
        tags: ["📤 Upload"],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "Excel file with holiday data",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Holidays uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    processed: { type: "integer" },
                    inserted: { type: "integer" },
                    updated: { type: "integer" },
                    skipped: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/upload/payroll": {
      post: {
        summary: "Bulk Upload Payroll (Admin)",
        description:
          "Upload Excel file with payroll data to generate salary slips for multiple employees at once",
        tags: ["📤 Upload"],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description:
                      "Excel file with payroll data (EmployeeNumber, basic, hra, conveyance, special_allowance, pf, esi, etc.)",
                  },
                  month: {
                    type: "integer",
                    example: 12,
                    description: "Payroll month (1-12)",
                  },
                  year: {
                    type: "integer",
                    example: 2025,
                    description: "Payroll year",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Payroll uploaded and processed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    run_id: {
                      type: "integer",
                      description: "Created payroll run ID",
                    },
                    processed: { type: "integer" },
                    inserted: { type: "integer" },
                    skipped: { type: "integer" },
                    errors: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    // ============ AUTHENTICATION ============
    "/api/auth/login": {
      post: {
        summary: "User Login",
        description:
          "Authenticate user and receive JWT token. Default: username='admin', password='admin123'",
        security: [],
        tags: ["🔐 Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", example: "admin" },
                  password: { type: "string", example: "admin123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "Logout User",
        description:
          "Logs out the current user. Clears session data on client-side and logs the logout activity for audit trail. Note: JWT tokens cannot be invalidated server-side without a blacklist implementation.",
        tags: ["🔐 Authentication"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Logged out successfully",
            content: {
              "application/json": {
                example: {
                  message:
                    "Logged out successfully. Please discard token client-side.",
                  success: true,
                  timestamp: "2025-12-30T10:30:00.000Z",
                },
              },
            },
          },
          401: { description: "Unauthorized - Invalid or missing token" },
          500: { description: "Server error during logout" },
        },
      },
    },
    "/api/auth/employee/check": {
      get: {
        summary: "🆕 Check Employee by Email",
        description:
          "Check if employee exists by email and whether they have a user account created",
        security: [],
        tags: ["🔐 Authentication"],
        parameters: [
          {
            name: "email",
            in: "query",
            required: true,
            schema: { type: "string", example: "john.doe@company.com" },
            description: "Employee work email",
          },
        ],
        responses: {
          200: {
            description: "Employee check successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    found: { type: "boolean", example: true },
                    employee: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        EmployeeNumber: { type: "string" },
                        FullName: { type: "string" },
                        WorkEmail: { type: "string" },
                        JobTitle: { type: "string" },
                        Department: { type: "string" },
                        Location: { type: "string" },
                        Status: { type: "string" },
                      },
                    },
                    hasUserAccount: { type: "boolean", example: false },
                    userInfo: {
                      type: "object",
                      nullable: true,
                      properties: {
                        id: { type: "integer" },
                        username: { type: "string" },
                        role: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: "Employee not found" },
          400: { description: "Email parameter required" },
        },
      },
    },
    "/api/auth/user/create": {
      post: {
        summary: "🆕 Create User Account for Employee",
        description:
          "Create user account with password for an existing employee. Email must match an employee's WorkEmail.",
        security: [],
        tags: ["🔐 Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    example: "john.doe@company.com",
                    description: "Must match employee WorkEmail",
                  },
                  password: {
                    type: "string",
                    example: "SecurePass123!",
                    description: "User login password",
                  },
                  role: {
                    type: "string",
                    enum: ["employee", "hr", "manager", "admin"],
                    default: "employee",
                    description: "User role (default: employee)",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "User account created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    employee: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        employeeNumber: { type: "string" },
                        fullName: { type: "string" },
                        email: { type: "string" },
                      },
                    },
                    user: {
                      type: "object",
                      properties: {
                        username: { type: "string" },
                        role: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: "Employee not found" },
          409: { description: "User account already exists" },
          400: { description: "Email and password required" },
        },
      },
    },
    "/api/auth/users": {
      get: {
        summary: "🆕 Get All Users",
        description:
          "Get list of all user accounts with employee linkage (Admin/HR only)",
        tags: ["🔐 Authentication"],
        responses: {
          200: {
            description: "List of users",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    users: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          username: { type: "string" },
                          role: { type: "string" },
                          full_name: { type: "string" },
                          created_at: { type: "string", format: "date-time" },
                          employee_id: { type: "integer", nullable: true },
                          EmployeeNumber: { type: "string", nullable: true },
                          Status: { type: "string", nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          403: { description: "Access denied" },
        },
      },
    },
    "/api/auth/user/create-auto": {
      post: {
        summary: "🆕 Create User with Auto Role Assignment",
        description: `Create user account with automatic role assignment based on:
1. If department is "Human Resource" → HR role
2. Else if employee has > 4 direct reports → Manager role
3. Else → Employee role

**Public endpoint - No authentication required (for self-registration)**`,
        security: [],
        tags: ["🔐 Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["employee_id", "password"],
                properties: {
                  employee_id: {
                    type: "integer",
                    example: 1,
                    description: "Employee ID from employees table",
                  },
                  password: {
                    type: "string",
                    example: "SecurePass123!",
                    description: "User login password",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "User created with auto-assigned role",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example:
                        "User account created successfully with auto-assigned role",
                    },
                    employee: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        employeeNumber: { type: "string" },
                        fullName: { type: "string" },
                        email: { type: "string" },
                        department: { type: "string" },
                      },
                    },
                    user: {
                      type: "object",
                      properties: {
                        username: { type: "string" },
                        role: {
                          type: "string",
                          enum: ["employee", "manager", "hr"],
                        },
                      },
                    },
                    roleAssignmentReason: {
                      type: "string",
                      example: "Has more than 4 direct reports",
                      description: "Explanation of why this role was assigned",
                    },
                  },
                },
              },
            },
          },
          400: {
            description:
              "Employee ID and password required or employee has no work email",
          },
          403: { description: "Access denied. Admin or HR required" },
          404: { description: "Employee not found" },
          409: { description: "User account already exists" },
        },
      },
    },
    "/api/auth/user/preview-role/{employee_id}": {
      get: {
        summary: "🆕 Preview Auto Role Assignment",
        description: `Preview what role would be assigned to an employee without creating the user account.
Shows department, report count, and suggested role with reasoning.

**Public endpoint - No authentication required (for registration page)**`,
        security: [],
        tags: ["🔐 Authentication"],
        parameters: [
          {
            name: "employee_id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Employee ID",
          },
        ],
        responses: {
          200: {
            description: "Role preview",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    employee: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        employeeNumber: { type: "string" },
                        fullName: { type: "string" },
                        email: { type: "string" },
                        department: { type: "string" },
                      },
                    },
                    reportCount: { type: "integer", example: 6 },
                    suggestedRole: {
                      type: "string",
                      enum: ["employee", "manager", "hr"],
                      example: "manager",
                    },
                    roleAssignmentReason: {
                      type: "string",
                      example: "Has 6 direct reports (more than 4)",
                    },
                    userExists: { type: "boolean", example: false },
                    currentRole: {
                      type: "string",
                      nullable: true,
                      description: "Current role if user already exists",
                    },
                  },
                },
              },
            },
          },
          403: { description: "Access denied. Admin or HR required" },
          404: { description: "Employee not found" },
        },
      },
    },
    "/api/auth/user/create-bulk": {
      post: {
        summary: "🆕 Bulk Create Users with Auto Role Assignment",
        description: `Create multiple user accounts at once with automatic role assignment.
Each employee will get their role assigned based on department and report count.
Skips employees who already have user accounts.

**Admin or HR access required**`,
        tags: ["🔐 Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["employee_ids", "default_password"],
                properties: {
                  employee_ids: {
                    type: "array",
                    items: { type: "integer" },
                    example: [1, 2, 3, 4, 5],
                    description: "Array of employee IDs",
                  },
                  default_password: {
                    type: "string",
                    example: "Welcome@2025",
                    description: "Default password for all created users",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bulk creation completed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Bulk user creation completed",
                    },
                    summary: {
                      type: "object",
                      properties: {
                        total: { type: "integer", example: 10 },
                        success: { type: "integer", example: 7 },
                        failed: { type: "integer", example: 1 },
                        skipped: { type: "integer", example: 2 },
                      },
                    },
                    results: {
                      type: "object",
                      properties: {
                        success: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              employee_id: { type: "integer" },
                              employee_number: { type: "string" },
                              full_name: { type: "string" },
                              email: { type: "string" },
                              role: { type: "string" },
                              reason: { type: "string" },
                            },
                          },
                        },
                        failed: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              employee_id: { type: "integer" },
                              reason: { type: "string" },
                            },
                          },
                        },
                        skipped: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              employee_id: { type: "integer" },
                              employee_number: { type: "string" },
                              email: { type: "string" },
                              reason: { type: "string" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "employee_ids array and default_password required",
          },
          403: { description: "Access denied. Admin or HR required" },
        },
      },
    },
    "/api/auth/users/{id}": {
      get: {
        summary: "🆕 Get User by ID",
        description: "Get specific user details (Admin/HR or own account)",
        tags: ["🔐 Authentication"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "User details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        username: { type: "string" },
                        role: { type: "string" },
                        full_name: { type: "string" },
                        created_at: { type: "string" },
                        updated_at: { type: "string" },
                        employee_id: { type: "integer" },
                        EmployeeNumber: { type: "string" },
                        emp_full_name: { type: "string" },
                        Status: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: "User not found" },
          403: { description: "Access denied" },
        },
      },
      delete: {
        summary: "🆕 Delete User",
        description: "Delete user account (Admin only)",
        tags: ["🔐 Authentication"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: { description: "User deleted successfully" },
          403: { description: "Access denied" },
        },
      },
    },
    "/api/auth/users/{id}/role": {
      put: {
        summary: "🆕 Update User Role",
        description: "Change user role (Admin only)",
        tags: ["🔐 Authentication"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: {
                    type: "string",
                    enum: ["admin", "hr", "manager", "employee"],
                    example: "hr",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User role updated successfully" },
          400: { description: "Valid role required" },
          403: { description: "Access denied" },
        },
      },
    },
    "/api/auth/users/{id}/make-hr": {
      post: {
        summary: "🆕 Make User HR",
        description:
          "Promote user to HR role (Admin only). Quick action alternative to PUT /users/:id/role",
        tags: ["🔐 Authentication"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "User ID to promote",
          },
        ],
        responses: {
          200: {
            description: "User promoted to HR successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "User promoted to HR successfully",
                    },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        username: { type: "string" },
                        previousRole: { type: "string" },
                        newRole: { type: "string", example: "hr" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: "User not found" },
          403: { description: "Access denied. Admin role required" },
        },
      },
    },
    "/api/auth/users/{id}/make-manager": {
      post: {
        summary: "🆕 Make User Manager",
        description:
          "Promote user to Manager role (Admin only). Quick action alternative to PUT /users/:id/role",
        tags: ["🔐 Authentication"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "User ID to promote",
          },
        ],
        responses: {
          200: {
            description: "User promoted to Manager successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "User promoted to Manager successfully",
                    },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        username: { type: "string" },
                        previousRole: { type: "string" },
                        newRole: { type: "string", example: "manager" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: "User not found" },
          403: { description: "Access denied. Admin role required" },
        },
      },
    },
    "/api/auth/users/{id}/make-admin": {
      post: {
        summary: "🆕 Make User Admin",
        description:
          "Promote user to Admin role (Admin only). Quick action alternative to PUT /users/:id/role",
        tags: ["🔐 Authentication"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "User ID to promote",
          },
        ],
        responses: {
          200: {
            description: "User promoted to Admin successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "User promoted to Admin successfully",
                    },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        username: { type: "string" },
                        previousRole: { type: "string" },
                        newRole: { type: "string", example: "admin" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: "User not found" },
          403: { description: "Access denied. Admin role required" },
        },
      },
    },
    "/api/auth/users/{id}/make-employee": {
      post: {
        summary: "🆕 Demote User to Employee",
        description:
          "Change user role back to Employee (Admin only). Quick action alternative to PUT /users/:id/role",
        tags: ["🔐 Authentication"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "User ID to demote",
          },
        ],
        responses: {
          200: {
            description: "User role changed to Employee",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "User role changed to Employee",
                    },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        username: { type: "string" },
                        previousRole: { type: "string" },
                        newRole: { type: "string", example: "employee" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: "User not found" },
          403: { description: "Access denied. Admin role required" },
        },
      },
    },
    "/api/auth/users/bulk-role-update": {
      post: {
        summary: "🆕 Bulk Update User Roles",
        description:
          "Update multiple user roles in one request (Admin only). Useful for batch promotions/demotions",
        tags: ["🔐 Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["updates"],
                properties: {
                  updates: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["userId", "role"],
                      properties: {
                        userId: { type: "integer", example: 2 },
                        role: {
                          type: "string",
                          enum: ["admin", "hr", "manager", "employee"],
                          example: "hr",
                        },
                      },
                    },
                    example: [
                      { userId: 2, role: "hr" },
                      { userId: 3, role: "manager" },
                      { userId: 4, role: "employee" },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Bulk update completed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "3 of 3 users updated successfully",
                    },
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          userId: { type: "integer" },
                          success: { type: "boolean" },
                          role: { type: "string" },
                          error: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid request format" },
          403: { description: "Access denied. Admin role required" },
        },
      },
    },
    "/api/auth/password/create": {
      post: {
        summary: "Create Password (Legacy)",
        description: "Legacy endpoint - Use /api/auth/user/create instead",
        tags: ["🔐 Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  employee_id: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Password set successfully" },
        },
      },
    },

    // ============ EMPLOYEES ============
    "/api/employees": {
      get: {
        summary: "Get All Employees",
        description: "Retrieve list of all employees with pagination support",
        tags: ["👥 Employees"],
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            description: "Page number (default: 1)",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Records per page (default: 20, max: 100)",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: "List of employees",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Employee" },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Employee",
        description: "Create new employee (Admin/HR only)",
        tags: ["👥 Employees"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Employee" },
            },
          },
        },
        responses: {
          200: { description: "Employee created successfully" },
        },
      },
    },
    "/api/employees/{id}": {
      get: {
        summary: "Get Employee by ID",
        tags: ["👥 Employees"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: { description: "Employee details" },
          404: { description: "Employee not found" },
        },
      },
      put: {
        summary: "Update Employee",
        description: "Update employee details (HR only)",
        tags: ["👥 Employees"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: { description: "Employee updated" },
        },
      },
    },
    "/api/employees/{id}/details": {
      get: {
        summary: "🆕 Get Detailed Employee Information",
        description:
          "Get comprehensive employee details including attendance summary, leave balance, and pending requests",
        tags: ["👥 Employees"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Detailed employee information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    employee: {
                      type: "object",
                      description:
                        "Employee data with all master relationships",
                    },
                    attendance_summary: {
                      type: "object",
                      properties: {
                        recent_records: { type: "array" },
                        total_present_days: { type: "integer" },
                        wfh_days: { type: "integer" },
                        remote_days: { type: "integer" },
                      },
                    },
                    leave_summary: { type: "array" },
                    pending_requests: { type: "array" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/employees/my-team/reporting": {
      get: {
        summary: "Get Reporting Team",
        description:
          "Returns a list of employees who report directly to the logged-in user with pagination support.",
        tags: ["👥 Employees"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            description: "Page number (default: 1)",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Records per page (default: 20, max: 100)",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: "List of direct reports",
            content: {
              "application/json": {
                example: {
                  data: [
                    {
                      id: 10,
                      FirstName: "John",
                      LastName: "Doe",
                      department_name: "US Insurance",
                      designation_name: "Assistant Manager",
                      location_name: "Site 1",
                    },
                  ],
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 5,
                    totalPages: 1,
                  },
                  message: "Your reporting team",
                },
              },
            },
          },
          404: { description: "Employee not found" },
          500: { description: "Internal server error" },
        },
      },
    },
    "/api/employees/my-team/co-team": {
      get: {
        summary: "Get Co-Team Members",
        description:
          "Returns a list of colleagues who share the same reporting manager as the logged-in user with pagination support.",
        tags: ["👥 Employees"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            description: "Page number (default: 1)",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Records per page (default: 20, max: 100)",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: "List of co-team members",
            content: {
              "application/json": {
                example: {
                  data: [
                    {
                      id: 11,
                      FirstName: "Jane",
                      LastName: "Smith",
                      department_name: "US Insurance",
                      designation_name: "Senior Associate",
                      location_name: "Site 1",
                    },
                  ],
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 8,
                    totalPages: 1,
                  },
                  message: "Your co-team members",
                },
              },
            },
          },
          404: { description: "Employee not found" },
          500: { description: "Internal server error" },
        },
      },
    },
    "/api/employees/my-team/reporting/{employeeId}": {
      get: {
        summary: "Get Reporting Team by ID",
        description:
          "Returns a list of all employees who report directly to the specified employee ID.",
        tags: ["👥 Employees"],
        parameters: [
          {
            name: "employeeId",
            in: "path",
            required: true,
            description:
              "The unique ID of the employee (manager) whose direct reports you want to fetch.",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "A list of direct reports successfully retrieved.",
            content: {
              "application/json": {
                example: {
                  team: [
                    {
                      id: "101",
                      FirstName: "John",
                      LastName: "Doe",
                      department_name: "US Insurance",
                      designation_name: "Assistant Manager",
                      location_name: "Visakhapatnam",
                    },
                  ],
                  message: "Reporting team for employee 101",
                },
              },
            },
          },
          500: { description: "Internal server error" },
        },
      },
    },
    "/api/employees/my-team/co-team/{employeeId}": {
      get: {
        summary: "Get Co-Team Members by ID",
        description:
          "Returns colleagues who share the same reporting manager as the given employee ID (peers).",
        tags: ["👥 Employees"],
        parameters: [
          {
            name: "employeeId",
            in: "path",
            required: true,
            description:
              "The unique ID of the employee whose peers you want to fetch.",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "A list of peer employees successfully retrieved.",
            content: {
              "application/json": {
                example: {
                  team: [
                    {
                      id: "102",
                      FirstName: "Jane",
                      LastName: "Smith",
                      department_name: "US Insurance",
                      designation_name: "Assistant Manager",
                      location_name: "Visakhapatnam",
                    },
                  ],
                  message: "Co-team members for employee 101",
                },
              },
            },
          },
          500: { description: "Internal server error" },
        },
      },
    },
    "/api/employees/profile/me": {
      get: {
        summary: "Get My Profile",
        tags: ["👥 Employees"],
        responses: {
          200: { description: "User profile" },
        },
      },
      put: {
        summary: "Update My Profile",
        tags: ["👥 Employees"],
        responses: {
          200: { description: "Profile updated" },
        },
      },
    },
    "/api/employees/profile/image": {
      post: {
        summary: "Upload Profile Image",
        tags: ["👥 Employees"],
        description:
          "Upload profile image for the authenticated user. Accepts image files (jpg, jpeg, png). Maximum file size: 5MB.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image"],
                properties: {
                  image: {
                    type: "string",
                    format: "binary",
                    description:
                      "Image file to upload (jpg, jpeg, png). Field name must be 'image'.",
                  },
                },
              },
              example: {
                image: "(binary file data)",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Profile image uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Profile image uploaded successfully",
                    },
                    imagePath: {
                      type: "string",
                      example:
                        "/uploads/profile_images/1735123456789-profile.jpg",
                    },
                  },
                },
                example: {
                  success: true,
                  message: "Profile image uploaded successfully",
                  imagePath:
                    "/uploads/profile_images/1735123456789-profile.jpg",
                },
              },
            },
          },
          400: {
            description: "No image file uploaded",
            content: {
              "application/json": {
                example: {
                  error: "No image file uploaded",
                },
              },
            },
          },
          500: {
            description: "Failed to upload profile image",
            content: {
              "application/json": {
                example: {
                  error: "Failed to upload profile image",
                },
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    "/api/employees/profile/image/{employeeId}": {
      get: {
        summary: "Get Profile Image URL",
        tags: ["👥 Employees"],
        description: "Get profile image path for a specific employee",
        parameters: [
          {
            name: "employeeId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Profile image path retrieved",
            content: {
              "application/json": {
                example: {
                  imagePath:
                    "/uploads/profile_images/1735123456789-profile.jpg",
                },
              },
            },
          },
          404: { description: "Profile image not found" },
          500: { description: "Failed to fetch profile image" },
        },
      },
    },
    "/api/employees/search/query": {
      get: {
        summary: "Search Employees",
        tags: ["👥 Employees"],
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string" },
            example: "John",
            description: "Search query (searches name, email, department, etc.)",
          },
          {
            name: "page",
            in: "query",
            required: false,
            description: "Page number (default: 1)",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Records per page (default: 20, max: 100)",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: "Search results with pagination",
            content: {
              "application/json": {
                example: {
                  data: [
                    {
                      id: 1,
                      EmployeeNumber: "EMP001",
                      FullName: "John Doe",
                      WorkEmail: "john@company.com",
                      Department: "Engineering",
                    },
                  ],
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 3,
                    totalPages: 1,
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ ATTENDANCE (MULTIPLE PUNCHES SYSTEM) ============
    "/api/attendance/punch-in": {
      post: {
        summary: "✨ Punch In (Multiple Times per Day)",
        description:
          "Punch in - can be done multiple times per day (e.g., morning, after lunch). System validates against active punch-in.",
        tags: ["⏰ Attendance"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  work_mode: {
                    type: "string",
                    enum: ["Office", "WFH", "Remote", "Hybrid"],
                    description:
                      "Work mode - Office, WFH (Work From Home), Remote, or Hybrid",
                    example: "Office",
                  },
                  location: { type: "string", example: "Mumbai Office" },
                  notes: { type: "string", example: "Starting work" },
                },
              },
              example: {
                work_mode: "Office",
                location: "Mumbai Office",
                notes: "Morning shift",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Punched in successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Punched in successfully",
                  punch_time: "2025-12-23T09:00:00.000Z",
                  work_mode: "Office",
                  attendance_id: 15,
                },
              },
            },
          },
          400: { description: "Already punched in - punch out first" },
        },
      },
    },
    "/api/attendance/punch-out": {
      post: {
        summary: "✨ Punch Out (Multiple Times per Day)",
        description:
          "Punch out - can be done multiple times per day (e.g., lunch break, end of day). Automatically calculates and updates gross hours.",
        tags: ["⏰ Attendance"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  notes: { type: "string", example: "Lunch break" },
                },
              },
              example: {
                notes: "Going for lunch",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Punched out successfully with updated hours",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Punched out successfully",
                  punch_time: "2025-12-23T13:00:00.000Z",
                  attendance_id: 15,
                  hours_calculated: {
                    total_work_hours: 4.0,
                    total_break_hours: 0.0,
                    gross_hours: 4.0,
                  },
                },
              },
            },
          },
          400: { description: "Already punched out or no attendance record" },
        },
      },
    },
    "/api/attendance/today": {
      get: {
        summary: "✨ Get Today's Attendance Status",
        description:
          "Get complete attendance status for today including all punches, total hours, and can_punch_in/can_punch_out status",
        tags: ["⏰ Attendance"],
        responses: {
          200: {
            description: "Today's attendance with all punches",
            content: {
              "application/json": {
                example: {
                  has_attendance: true,
                  attendance: {
                    id: 15,
                    attendance_date: "2025-12-23",
                    first_check_in: "2025-12-23T09:00:00",
                    last_check_out: "2025-12-23T18:00:00",
                    total_work_hours: 8.5,
                    total_break_hours: 1.0,
                    gross_hours: 8.5,
                    work_mode: "Office",
                    status: "present",
                  },
                  punches: [
                    {
                      id: 1,
                      punch_type: "in",
                      punch_time: "2025-12-23T09:00:00",
                      location: "Office",
                    },
                    {
                      id: 2,
                      punch_type: "out",
                      punch_time: "2025-12-23T13:00:00",
                      location: "Office",
                    },
                    {
                      id: 3,
                      punch_type: "in",
                      punch_time: "2025-12-23T14:00:00",
                      location: "Office",
                    },
                    {
                      id: 4,
                      punch_type: "out",
                      punch_time: "2025-12-23T18:00:00",
                      location: "Office",
                    },
                  ],
                  punch_count: 4,
                  last_punch_type: "out",
                  can_punch_in: true,
                  can_punch_out: false,
                },
              },
            },
          },
        },
      },
    },
    "/api/attendance/my-report": {
      get: {
        summary: "✨ My Attendance Report",
        description:
          "Get attendance report with summary statistics (total days, present, hours worked, etc.)",
        tags: ["⏰ Attendance"],
        parameters: [
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date" },
            example: "2025-12-01",
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date" },
            example: "2025-12-31",
          },
          {
            name: "month",
            in: "query",
            schema: { type: "integer" },
            example: 12,
          },
          {
            name: "year",
            in: "query",
            schema: { type: "integer" },
            example: 2025,
          },
        ],
        responses: {
          200: {
            description: "Attendance report with summary",
            content: {
              "application/json": {
                example: {
                  summary: {
                    total_days: 20,
                    present_days: 18,
                    absent_days: 0,
                    half_days: 2,
                    total_work_hours: 162.5,
                    avg_work_hours: 8.13,
                  },
                  attendance: [
                    {
                      id: 15,
                      attendance_date: "2025-12-23",
                      gross_hours: 8.5,
                      punch_in_count: 2,
                      punch_out_count: 2,
                      status: "present",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/api/attendance/details/{date}": {
      get: {
        summary: "✨ Get Attendance Details for Date",
        description:
          "Get detailed punch history and calculated punch pairs for specific date",
        tags: ["⏰ Attendance"],
        parameters: [
          {
            name: "date",
            in: "path",
            required: true,
            schema: { type: "string", format: "date" },
            example: "2025-12-23",
          },
        ],
        responses: {
          200: {
            description: "Detailed attendance with punch pairs",
            content: {
              "application/json": {
                example: {
                  attendance: {
                    id: 15,
                    attendance_date: "2025-12-23",
                    total_work_hours: 8.5,
                    total_break_hours: 1.0,
                    gross_hours: 8.5,
                  },
                  punches: [
                    {
                      id: 1,
                      punch_type: "in",
                      punch_time: "2025-12-23T09:00:00",
                    },
                    {
                      id: 2,
                      punch_type: "out",
                      punch_time: "2025-12-23T13:00:00",
                    },
                    {
                      id: 3,
                      punch_type: "in",
                      punch_time: "2025-12-23T14:00:00",
                    },
                    {
                      id: 4,
                      punch_type: "out",
                      punch_time: "2025-12-23T18:00:00",
                    },
                  ],
                  punch_pairs: [
                    {
                      punch_in: "2025-12-23T09:00:00",
                      punch_out: "2025-12-23T13:00:00",
                      hours_worked: 4.0,
                      punch_in_location: "Office",
                      punch_out_location: "Office",
                    },
                    {
                      punch_in: "2025-12-23T14:00:00",
                      punch_out: "2025-12-23T18:00:00",
                      hours_worked: 4.5,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/api/attendance/report/employee/{employeeId}": {
      get: {
        summary: "✨ Employee Attendance Report (Manager)",
        description:
          "Get comprehensive attendance report for specific employee (Manager/Admin only)",
        tags: ["⏰ Attendance"],
        parameters: [
          {
            name: "employeeId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 5,
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          { name: "month", in: "query", schema: { type: "integer" } },
          { name: "year", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Employee attendance report",
            content: {
              "application/json": {
                example: {
                  employee: {
                    id: 5,
                    employee_number: "EMP005",
                    name: "John Doe",
                    email: "john@company.com",
                  },
                  summary: {
                    total_days: 20,
                    present_days: 18,
                    total_work_hours: 162.5,
                    avg_work_hours: 8.13,
                  },
                  attendance: [],
                },
              },
            },
          },
        },
      },
    },
    "/api/attendance/report/details/{employeeId}/{date}": {
      get: {
        summary: "✨ Employee Attendance Details (Manager)",
        description:
          "Get detailed punch breakdown for employee on specific date (Manager/Admin only)",
        tags: ["⏰ Attendance"],
        parameters: [
          {
            name: "employeeId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "date",
            in: "path",
            required: true,
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: { description: "Detailed punch history with pairs" },
        },
      },
    },
    "/api/attendance/report/team": {
      get: {
        summary: "✨ Team Attendance Report",
        description:
          "Get attendance for all team members reporting to you. Available for any authenticated user (admin/hr/manager/employee) who has team members. Returns empty result if no team members are found.",
        tags: ["⏰ Attendance"],
        parameters: [
          {
            name: "date",
            in: "query",
            schema: { type: "string", format: "date" },
            example: "2025-12-23",
          },
        ],
        responses: {
          200: {
            description: "Team attendance summary",
            content: {
              "application/json": {
                example: {
                  team_members: [
                    {
                      id: 5,
                      EmployeeNumber: "EMP005",
                      FirstName: "John",
                      LastName: "Doe",
                    },
                  ],
                  date: "2025-12-23",
                  attendance: [
                    {
                      employee_id: 5,
                      EmployeeNumber: "EMP005",
                      FirstName: "John",
                      gross_hours: 8.5,
                      status: "present",
                      total_punches: 4,
                    },
                  ],
                  summary: {
                    total_team: 10,
                    present: 8,
                    absent: 1,
                    on_leave: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/attendance/report/all": {
      get: {
        summary: "✨ All Attendance Report (Admin)",
        description: "Get company-wide attendance report (Admin/HR only)",
        tags: ["⏰ Attendance"],
        parameters: [
          {
            name: "date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: {
            description: "Company-wide attendance",
            content: {
              "application/json": {
                example: {
                  attendance: [],
                  summary: {
                    total_records: 50,
                    present: 45,
                    absent: 2,
                    half_day: 1,
                    on_leave: 2,
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ LEAVES & WFH REQUESTS ============
    "/api/leaves/wfh-request": {
      post: {
        summary: "🆕 Request WFH/Remote Work",
        description:
          "Submit a request to work from home or remotely for a specific date",
        tags: ["🏖️ Leave Management"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WFHRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "WFH request submitted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    id: { type: "integer", example: 123 },
                    message: {
                      type: "string",
                      example: "WFH request submitted successfully",
                    },
                  },
                },
              },
            },
          },
          400: {
            description:
              "Invalid request - missing date or work_mode, or invalid work_mode value",
          },
          404: { description: "Employee not found" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/leaves/wfh-requests": {
      get: {
        summary: "🆕 Get My WFH/Remote Requests",
        description: "Get all my WFH and Remote work requests",
        tags: ["🏖️ Leave Management"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of WFH/Remote requests",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      employee_id: { type: "integer" },
                      leave_type: { type: "string", enum: ["WFH", "Remote"] },
                      start_date: { type: "string", format: "date" },
                      end_date: { type: "string", format: "date" },
                      reason: { type: "string" },
                      status: {
                        type: "string",
                        enum: ["pending", "approved", "rejected"],
                      },
                      applied_at: { type: "string", format: "date-time" },
                      FirstName: { type: "string" },
                      LastName: { type: "string" },
                      EmployeeNumber: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          404: { description: "Employee not found" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/leaves/wfh-requests/pending": {
      get: {
        summary: "🆕 Get Pending WFH Requests (HR/Manager)",
        description:
          "Get all pending WFH/Remote requests for approval. Returns empty array for employee role, returns pending requests for manager/hr/admin roles.",
        tags: ["🏖️ Leave Management"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description:
              "Pending WFH/Remote requests with employee details (or empty array for employees)",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      employee_id: { type: "integer" },
                      leave_type: { type: "string", enum: ["WFH", "Remote"] },
                      start_date: { type: "string", format: "date" },
                      end_date: { type: "string", format: "date" },
                      reason: { type: "string" },
                      status: { type: "string", example: "pending" },
                      applied_at: { type: "string", format: "date-time" },
                      FirstName: { type: "string" },
                      LastName: { type: "string" },
                      EmployeeNumber: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          500: { description: "Server error" },
        },
      },
    },
    "/api/leaves/wfh-check-today": {
      get: {
        summary: "🆕 Check Today's WFH Status",
        description:
          "Check if the logged-in employee has an approved WFH/Remote request for today. Used to auto-select work mode during punch-in.",
        tags: ["🏖️ Leave Management"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "WFH status for today",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    has_wfh: {
                      type: "boolean",
                      example: true,
                      description:
                        "Whether user has approved WFH/Remote request for today",
                    },
                    work_mode: {
                      type: "string",
                      enum: ["Office", "WFH", "Remote"],
                      example: "WFH",
                      description:
                        "Approved work mode for today, or 'Office' if none",
                    },
                  },
                },
              },
            },
          },
          404: { description: "Employee not found" },
          500: { description: "Server error" },
        },
      },
    },

    // ============ ENHANCED LEAVE MANAGEMENT SYSTEM ============
    "/api/leaves/plans": {
      post: {
        summary: "✨ Create Leave Plan (Admin)",
        description:
          "Create comprehensive leave plan with multiple leave types and allocations. Supports auto-proration for mid-year joiners.",
        tags: ["🏖️ Leave Management"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Standard Plan 2025" },
                  leave_year_start_month: { type: "integer", example: 1 },
                  leave_year_start_day: { type: "integer", example: 1 },
                  description: {
                    type: "string",
                    example: "Standard leave plan for all permanent employees",
                  },
                  allocations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        leave_type_id: { type: "integer" },
                        days_allocated: { type: "number" },
                        prorate_on_joining: { type: "boolean" },
                      },
                    },
                  },
                },
                required: ["name", "allocations"],
              },
              example: {
                name: "Standard Plan 2025",
                leave_year_start_month: 1,
                leave_year_start_day: 1,
                description:
                  "Standard leave allocation for all permanent employees",
                allocations: [
                  {
                    leave_type_id: 1,
                    days_allocated: 12,
                    prorate_on_joining: true,
                  },
                  {
                    leave_type_id: 2,
                    days_allocated: 7,
                    prorate_on_joining: false,
                  },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Leave plan created successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Leave plan created successfully",
                  planId: 1,
                },
              },
            },
          },
        },
      },
      get: {
        summary: "✨ Get All Leave Plans (Admin)",
        description:
          "Get list of all leave plans with allocation details and employee counts",
        tags: ["🏖️ Leave Management"],
        responses: {
          200: {
            description: "List of leave plans",
            content: {
              "application/json": {
                example: [
                  {
                    id: 1,
                    plan_name: "Standard Plan 2025",
                    leave_year_start: "Jan 1",
                    description: "Standard leave plan",
                    is_active: true,
                    total_allocations: 2,
                    employees_count: 45,
                  },
                ],
              },
            },
          },
        },
      },
    },
    "/api/leaves/plans/{id}": {
      get: {
        summary: "✨ Get Leave Plan Details (Admin)",
        description:
          "Get detailed information about specific leave plan including all allocations",
        tags: ["🏖️ Leave Management"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Leave plan with allocations",
            content: {
              "application/json": {
                example: {
                  id: 1,
                  plan_name: "Standard Plan 2025",
                  leave_year_start_month: 1,
                  leave_year_start_day: 1,
                  description: "Standard plan",
                  is_active: true,
                  allocations: [
                    {
                      leave_type_id: 1,
                      leave_type_name: "Casual Leave",
                      type_code: "CL",
                      allocated_days: 12,
                      prorate_on_joining: true,
                    },
                  ],
                },
              },
            },
          },
        },
      },
      put: {
        summary: "✨ Update Leave Plan (Admin)",
        description: "Update leave plan details and allocations",
        tags: ["🏖️ Leave Management"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  allocations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        leave_type_id: { type: "integer" },
                        days_allocated: { type: "number" },
                        prorate_on_joining: { type: "boolean" },
                      },
                    },
                  },
                },
              },
              example: {
                name: "Updated Standard Plan 2025",
                description: "Updated description",
                allocations: [
                  {
                    leave_type_id: 1,
                    days_allocated: 15,
                    prorate_on_joining: true,
                  },
                ],
              },
            },
          },
        },
        responses: {
          200: { description: "Plan updated successfully" },
        },
      },
    },
    "/api/leaves/types": {
      post: {
        summary: "✨ Create Leave Type (Admin)",
        description: "Create new leave type with carry forward configuration",
        tags: ["🏖️ Leave Management"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  type_name: { type: "string" },
                  type_code: { type: "string" },
                  is_paid: { type: "boolean" },
                  requires_approval: { type: "boolean" },
                  can_carry_forward: { type: "boolean" },
                  max_carry_forward_days: { type: "integer" },
                  description: { type: "string" },
                },
                required: ["type_name", "type_code"],
              },
              example: {
                type_name: "Privilege Leave",
                type_code: "PL",
                is_paid: true,
                requires_approval: true,
                can_carry_forward: true,
                max_carry_forward_days: 5,
                description: "Annual privilege leave with carry forward",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Leave type created",
            content: {
              "application/json": {
                example: {
                  success: true,
                  id: 5,
                },
              },
            },
          },
        },
      },
      get: {
        summary: "✨ Get All Leave Types",
        description: "Get list of all active leave types with configuration",
        tags: ["🏖️ Leave Management"],
        responses: {
          200: {
            description: "List of leave types",
            content: {
              "application/json": {
                example: [
                  {
                    id: 1,
                    type_name: "Casual Leave",
                    type_code: "CL",
                    is_paid: 1,
                    requires_approval: 1,
                    can_carry_forward: 0,
                    max_carry_forward_days: 0,
                  },
                  {
                    id: 2,
                    type_name: "Sick Leave",
                    type_code: "SL",
                    is_paid: 1,
                    requires_approval: 0,
                    can_carry_forward: 1,
                    max_carry_forward_days: 3,
                  },
                ],
              },
            },
          },
        },
      },
    },
    "/api/leaves/types/{id}": {
      put: {
        summary: "✨ Update Leave Type (Admin)",
        description: "Update leave type configuration",
        tags: ["🏖️ Leave Management"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  type_name: { type: "string" },
                  type_code: { type: "string" },
                  description: { type: "string" },
                  is_paid: { type: "boolean" },
                  requires_approval: { type: "boolean" },
                  can_carry_forward: { type: "boolean" },
                  max_carry_forward_days: { type: "integer" },
                },
              },
              example: {
                type_name: "Updated Casual Leave",
                can_carry_forward: true,
                max_carry_forward_days: 2,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Leave type updated",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Leave type updated successfully",
                },
              },
            },
          },
        },
      },
    },
    "/api/leaves/initialize-balance/{employeeId}": {
      post: {
        summary: "✨ Initialize Employee Leave Balance (Admin)",
        description:
          "Initialize leave balances for employee based on their leave plan. Auto-prorates for mid-year joiners based on joining date.",
        tags: ["🏖️ Leave Management"],
        parameters: [
          {
            name: "employeeId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 5,
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  leave_plan_id: { type: "integer" },
                  leave_year: { type: "integer" },
                },
              },
              example: {
                leave_plan_id: 1,
                leave_year: 2025,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Leave balances initialized with auto-proration",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Leave balances initialized successfully",
                  balances: [
                    {
                      leave_type: "Casual Leave",
                      allocated_days: 9,
                      note: "Prorated based on joining date (July 1)",
                    },
                    {
                      leave_type: "Sick Leave",
                      allocated_days: 7,
                      note: "Full allocation (no proration)",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/api/leaves/initialize-my-balance": {
      post: {
        summary: "🧑‍💼 Initialize My Leave Balance",
        description:
          "Self-service API for employees to initialize their own leave balances based on the assigned leave plan. Auto-prorates if the employee joined mid-year.",
        tags: ["🏖️ Leave Management"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  leave_year: {
                    type: "integer",
                    description:
                      "Leave year for initialization (defaults to current year)",
                  },
                },
              },
              example: {
                leave_year: 2025,
              },
            },
          },
        },
        responses: {
          200: {
            description:
              "Leave balances initialized successfully for logged-in employee",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message:
                    "Your leave balances have been initialized successfully",
                  year: 2025,
                },
              },
            },
          },
          400: {
            description: "Leave plan not assigned",
            content: {
              "application/json": {
                example: {
                  error: "You have no leave plan assigned. Please contact HR.",
                },
              },
            },
          },
          401: {
            description: "Unauthorized – Invalid or missing token",
          },
          404: {
            description: "Employee not found",
            content: {
              "application/json": {
                example: {
                  error: "Employee not found",
                },
              },
            },
          },
          500: {
            description: "Internal server error",
            content: {
              "application/json": {
                example: {
                  error: "Something went wrong",
                },
              },
            },
          },
        },
      },
    },
    "/api/leaves/balance": {
      get: {
        summary: "✨ Get My Leave Balance",
        description:
          "Get current leave balance for logged-in employee with breakdown: allocated + carry_forward - used = available",
        tags: ["🏖️ Leave Management"],
        parameters: [
          {
            name: "leave_year",
            in: "query",
            schema: { type: "integer" },
            example: 2025,
          },
        ],
        responses: {
          200: {
            description: "Leave balance by type",
            content: {
              "application/json": {
                example: {
                  employee_id: 5,
                  leave_year: 2025,
                  balances: [
                    {
                      leave_type_id: 1,
                      leave_type_name: "Casual Leave",
                      type_code: "CL",
                      allocated_days: 12,
                      carry_forward_days: 2,
                      used_days: 5,
                      available_days: 9,
                    },
                    {
                      leave_type_id: 2,
                      leave_type_name: "Sick Leave",
                      type_code: "SL",
                      allocated_days: 7,
                      carry_forward_days: 0,
                      used_days: 3,
                      available_days: 4,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/api/leaves/balance/{employeeId}": {
      get: {
        summary: "✨ Get Employee Leave Balance (Manager/Admin)",
        description:
          "Get leave balance for specific employee (Manager/Admin only)",
        tags: ["🏖️ Leave Management"],
        parameters: [
          {
            name: "employeeId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "leave_year",
            in: "query",
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: { description: "Employee leave balance" },
        },
      },
    },
    "/api/leaves/apply": {
      post: {
        summary: "✨ Apply for Leave (Enhanced with Balance Check)",
        description:
          "Apply for leave with automatic balance validation. System checks available days before submission.",
        tags: ["🏖️ Leave Management"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  leave_type_id: { type: "integer" },
                  start_date: { type: "string", format: "date" },
                  end_date: { type: "string", format: "date" },
                  total_days: { type: "number" },
                  reason: { type: "string" },
                },
                required: [
                  "leave_type_id",
                  "start_date",
                  "end_date",
                  "total_days",
                  "reason",
                ],
              },
              example: {
                leave_type_id: 1,
                start_date: "2025-12-25",
                end_date: "2025-12-27",
                total_days: 3,
                reason: "Family function",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Leave applied successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  leaveId: 15,
                  message: "Leave application submitted successfully",
                },
              },
            },
          },
          400: {
            description: "Insufficient leave balance",
            content: {
              "application/json": {
                example: {
                  success: false,
                  message:
                    "Insufficient leave balance. Available: 2 days, Requested: 3 days",
                },
              },
            },
          },
        },
      },
    },
    "/api/leaves/approve/{leaveId}": {
      put: {
        summary: "✨ Approve Leave (Auto-deduct from Balance)",
        description:
          "Approve leave and automatically deduct days from employee balance",
        tags: ["🏖️ Leave Management"],
        parameters: [
          {
            name: "leaveId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 15,
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  remarks: { type: "string" },
                },
              },
              example: {
                remarks: "Approved by manager",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Leave approved and balance updated",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message:
                    "Leave approved successfully. 3 days deducted from balance.",
                  remaining_balance: 6,
                },
              },
            },
          },
        },
      },
    },
    "/api/leaves/reject/{leaveId}": {
      put: {
        summary: "✨ Reject Leave (With Reason)",
        description: "Reject leave application with mandatory rejection reason",
        tags: ["🏖️ Leave Management"],
        parameters: [
          {
            name: "leaveId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  rejection_reason: { type: "string" },
                },
                required: ["rejection_reason"],
              },
              example: {
                rejection_reason:
                  "Team capacity insufficient during this period",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Leave rejected",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Leave rejected successfully",
                },
              },
            },
          },
        },
      },
    },
    "/api/leaves/pending": {
      get: {
        summary: "✨ Get Pending Leave Approvals (Manager/Admin)",
        description:
          "Get all pending leave requests with employee details and balance information",
        tags: ["🏖️ Leave Management"],
        responses: {
          200: {
            description: "Pending leave requests",
            content: {
              "application/json": {
                example: [
                  {
                    leave_id: 15,
                    employee_id: 5,
                    employee_name: "John Doe",
                    leave_type_name: "Casual Leave",
                    type_code: "CL",
                    start_date: "2025-12-25",
                    end_date: "2025-12-27",
                    total_days: 3,
                    reason: "Family function",
                    available_balance: 9,
                    applied_date: "2025-12-20",
                  },
                ],
              },
            },
          },
        },
      },
    },
    "/api/leaves/my-leaves": {
      get: {
        summary: "✨ Get My Leave History",
        description:
          "Get my complete leave history with status and balance impact",
        tags: ["🏖️ Leave Management"],
        parameters: [
          {
            name: "leave_year",
            in: "query",
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Leave history",
            content: {
              "application/json": {
                example: [
                  {
                    id: 15,
                    leave_type_name: "Casual Leave",
                    start_date: "2025-12-25",
                    end_date: "2025-12-27",
                    total_days: 3,
                    status: "approved",
                    applied_date: "2025-12-20",
                    approved_date: "2025-12-21",
                  },
                ],
              },
            },
          },
        },
      },
    },

    // ============ ENHANCED TIMESHEETS ============
    "/api/timesheets/assignment-status": {
      get: {
        summary: "✨ Check Project Assignment Status",
        description:
          "Check if employee is assigned to projects (determines timesheet type: regular or project-based)",
        tags: ["📝 Timesheets"],
        responses: {
          200: {
            description: "Assignment status",
            content: {
              "application/json": {
                example: {
                  has_project: true,
                  timesheet_type: "project_based",
                  assignments: [
                    {
                      project_id: 1,
                      project_name: "Client Portal",
                      client_name: "ABC Corp",
                      shift_name: "General Shift",
                      daily_hours: 8,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/api/timesheets/regular/submit": {
      post: {
        summary: "✨ Submit Regular Timesheet (Non-Project Employees)",
        description:
          "Submit hourly timesheet based on shift timings for employees not assigned to projects",
        tags: ["📝 Timesheets"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  hours_breakdown: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        hour: { type: "string", example: "09:00-10:00" },
                        task: { type: "string", example: "Development" },
                        hours: { type: "number", example: 1 },
                      },
                    },
                  },
                  total_hours: { type: "number" },
                  notes: { type: "string" },
                },
                required: ["date", "hours_breakdown", "total_hours"],
              },
              example: {
                date: "2025-12-23",
                hours_breakdown: [
                  { hour: "09:00-10:00", task: "Development", hours: 1 },
                  { hour: "10:00-12:00", task: "Testing", hours: 2 },
                  { hour: "13:00-17:00", task: "Code Review", hours: 4 },
                ],
                total_hours: 7,
                notes: "Regular work day",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Timesheet submitted",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Regular timesheet submitted successfully",
                  timesheet_id: 15,
                },
              },
            },
          },
        },
      },
    },
    "/api/timesheets/regular/my-timesheets": {
      get: {
        summary: "✨ Get My Regular Timesheets",
        description: "Get regular timesheets with filters",
        tags: ["📝 Timesheets"],
        parameters: [
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          { name: "month", in: "query", schema: { type: "integer" } },
          { name: "year", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Regular timesheets list" },
        },
      },
    },
    "/api/timesheets/project/submit": {
      post: {
        summary: "✨ Submit Project Timesheet",
        description:
          "Submit hourly timesheet for project work based on project shift timings",
        tags: ["📝 Timesheets"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  project_id: { type: "integer" },
                  hours_breakdown: { type: "array" },
                  total_hours: { type: "number" },
                  work_description: { type: "string" },
                  notes: { type: "string" },
                },
                required: [
                  "date",
                  "project_id",
                  "hours_breakdown",
                  "total_hours",
                  "work_description",
                ],
              },
              example: {
                date: "2025-12-23",
                project_id: 1,
                hours_breakdown: [
                  {
                    hour: "09:00-12:00",
                    task: "Feature Development",
                    hours: 3,
                  },
                  { hour: "13:00-17:00", task: "Bug Fixes", hours: 4 },
                ],
                total_hours: 7,
                work_description: "Implemented user authentication module",
                notes: "Completed ahead of schedule",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Project timesheet submitted",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Project timesheet submitted successfully",
                  timesheet_id: 20,
                },
              },
            },
          },
        },
      },
    },
    "/api/timesheets/project/my-timesheets": {
      get: {
        summary: "✨ Get My Project Timesheets",
        description: "Get project timesheets with filters",
        tags: ["📝 Timesheets"],
        parameters: [
          { name: "project_id", in: "query", schema: { type: "integer" } },
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          { name: "month", in: "query", schema: { type: "integer" } },
          { name: "year", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Project timesheets list" },
        },
      },
    },
    "/api/timesheets/client-timesheet/upload": {
      post: {
        summary: "✨ Upload Client Timesheet (End of Month)",
        description:
          "Upload client-provided timesheet for validation against internal timesheets",
        tags: ["📝 Timesheets"],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  month: { type: "integer" },
                  year: { type: "integer" },
                  project_id: { type: "integer" },
                },
                required: ["file", "month", "year", "project_id"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Client timesheet uploaded",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Client timesheet uploaded successfully",
                  file_path: "uploads/client_timesheets/...",
                  timesheets_updated: 22,
                },
              },
            },
          },
        },
      },
    },
    "/api/timesheets/client-timesheet/status": {
      get: {
        summary: "✨ Get Client Timesheet Status",
        description: "Check client timesheet upload and validation status",
        tags: ["📝 Timesheets"],
        parameters: [
          {
            name: "month",
            in: "query",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "year",
            in: "query",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Client timesheet status",
            content: {
              "application/json": {
                example: [
                  {
                    project_id: 1,
                    project_name: "Client Portal",
                    client_name: "ABC Corp",
                    total_days: 22,
                    total_hours: 176,
                    client_file: "uploads/...",
                    upload_date: "2025-12-31",
                    validation_status: "validated",
                  },
                ],
              },
            },
          },
        },
      },
    },
    "/api/timesheets/admin/pending-validation": {
      get: {
        summary: "✨ Get Timesheets Pending Validation (Admin)",
        description:
          "Get all timesheets with client timesheets uploaded but pending validation",
        tags: ["📝 Timesheets"],
        parameters: [
          { name: "month", in: "query", schema: { type: "integer" } },
          { name: "year", in: "query", schema: { type: "integer" } },
          { name: "project_id", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Pending validations list",
            content: {
              "application/json": {
                example: [
                  {
                    employee_id: 5,
                    EmployeeNumber: "EMP005",
                    FirstName: "John",
                    project_name: "Client Portal",
                    total_days: 22,
                    internal_total_hours: 176,
                    client_file: "uploads/...",
                    validation_status: "pending_validation",
                  },
                ],
              },
            },
          },
        },
      },
    },
    "/api/timesheets/admin/validation-details/{employeeId}/{projectId}/{month}/{year}":
    {
      get: {
        summary: "✨ Get Validation Details (Admin)",
        description:
          "Get detailed comparison between internal and client timesheets for validation",
        tags: ["📝 Timesheets"],
        parameters: [
          {
            name: "employeeId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "month",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "year",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Validation details with comparison",
          },
        },
      },
    },
    "/api/timesheets/admin/validate": {
      post: {
        summary: "✨ Validate Timesheets (Admin)",
        description:
          "Validate or reject timesheets after comparing internal vs client data",
        tags: ["📝 Timesheets"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  employee_id: { type: "integer" },
                  project_id: { type: "integer" },
                  month: { type: "integer" },
                  year: { type: "integer" },
                  validation_status: {
                    type: "string",
                    enum: ["validated", "rejected", "mismatch"],
                    description:
                      "Validation status - validated (approved), rejected (discrepancies found), mismatch (hours don't match)",
                  },
                  remarks: { type: "string" },
                  client_hours: { type: "number" },
                },
                required: [
                  "employee_id",
                  "project_id",
                  "month",
                  "year",
                  "validation_status",
                ],
              },
              example: {
                employee_id: 5,
                project_id: 1,
                month: 12,
                year: 2025,
                validation_status: "validated",
                remarks: "Hours match perfectly",
                client_hours: 176,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Validation completed",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Timesheets validated successfully",
                },
              },
            },
          },
        },
      },
    },
    "/api/timesheets/admin/validation-stats": {
      get: {
        summary: "✨ Get Validation Statistics (Admin)",
        description: "Get overview statistics of timesheet validations",
        tags: ["📝 Timesheets"],
        parameters: [
          { name: "month", in: "query", schema: { type: "integer" } },
          { name: "year", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Validation statistics",
            content: {
              "application/json": {
                example: {
                  total_submissions: 45,
                  pending: 12,
                  validated: 30,
                  rejected: 3,
                },
              },
            },
          },
        },
      },
    },

    // ============ MANAGER ACTIONS ============
    "/api/leave-enhanced/approve/{leaveId}": {
      put: {
        summary: "Approve Leave Request (Manager/HR)",
        description:
          "Approve a leave request. Managers can only approve their team's leaves. HR/Admin can approve any leave.",
        tags: ["👔 Manager Actions"],
        parameters: [
          {
            name: "leaveId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Leave approved successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Leave approved successfully",
                },
              },
            },
          },
          403: {
            description: "Forbidden - Not authorized to approve this leave",
            content: {
              "application/json": {
                example: {
                  error: "You can only approve leaves for your direct reports",
                },
              },
            },
          },
        },
      },
    },
    "/api/leave-enhanced/reject/{leaveId}": {
      put: {
        summary: "Reject Leave Request (Manager/HR)",
        description:
          "Reject a leave request. Managers can only reject their team's leaves. HR/Admin can reject any leave.",
        tags: ["👔 Manager Actions"],
        parameters: [
          {
            name: "leaveId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  rejection_reason: {
                    type: "string",
                    example: "Insufficient staffing during requested period",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Leave rejected successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Leave rejected successfully",
                },
              },
            },
          },
          403: {
            description: "Forbidden - Not authorized to reject this leave",
          },
        },
      },
    },
    "/api/timesheet-enhanced/manager/pending-timesheets": {
      get: {
        summary: "Get Pending Timesheets (Manager)",
        description:
          "Get all pending (submitted) timesheets from direct reports. Filter by date range and timesheet type.",
        tags: ["👔 Manager Actions"],
        parameters: [
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
            example: "2025-12-01",
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
            example: "2025-12-31",
          },
          {
            name: "timesheet_type",
            in: "query",
            schema: {
              type: "string",
              enum: ["regular", "project"],
            },
            example: "regular",
          },
        ],
        responses: {
          200: {
            description: "List of pending timesheets",
            content: {
              "application/json": {
                example: [
                  {
                    id: 156,
                    employee_id: 885,
                    EmployeeNumber: "EMP001",
                    FirstName: "John",
                    LastName: "Doe",
                    WorkEmail: "john@company.com",
                    date: "2025-12-26",
                    timesheet_type: "regular",
                    total_hours: 8,
                    hours_breakdown: {
                      "09:00-13:00": 4,
                      "14:00-18:00": 4,
                    },
                    work_description: "Feature development",
                    status: "submitted",
                    submission_date: "2025-12-26T18:30:00",
                    project_name: null,
                    project_code: null,
                  },
                ],
              },
            },
          },
        },
      },
    },
    "/api/timesheet-enhanced/manager/team-timesheets/{employeeId}": {
      get: {
        summary: "Get Team Member's Timesheets (Manager)",
        description:
          "View timesheets of a specific team member. Only accessible for direct reports.",
        tags: ["👔 Manager Actions"],
        parameters: [
          {
            name: "employeeId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "month",
            in: "query",
            schema: { type: "integer" },
            example: 12,
          },
          {
            name: "year",
            in: "query",
            schema: { type: "integer" },
            example: 2025,
          },
        ],
        responses: {
          200: {
            description: "Team member's timesheets",
            content: {
              "application/json": {
                example: [
                  {
                    id: 156,
                    employee_id: 885,
                    date: "2025-12-26",
                    timesheet_type: "project",
                    project_id: 5,
                    project_name: "Client Portal",
                    project_code: "PRJ-2025-005",
                    client_name: "Acme Corp",
                    total_hours: 9,
                    status: "approved",
                    verified_by: 100,
                    verified_at: "2025-12-27T09:00:00",
                  },
                ],
              },
            },
          },
          403: {
            description: "Forbidden - Employee is not your direct report",
          },
        },
      },
    },
    "/api/timesheet-enhanced/manager/approve/{timesheetId}": {
      put: {
        summary: "Approve Timesheet (Manager/HR)",
        description:
          "Approve a submitted timesheet. Managers can only approve their team's timesheets. HR/Admin can approve any.",
        tags: ["👔 Manager Actions"],
        parameters: [
          {
            name: "timesheetId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Timesheet approved successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Timesheet approved successfully",
                },
              },
            },
          },
          403: {
            description: "Forbidden - Not authorized to approve this timesheet",
          },
        },
      },
    },
    "/api/timesheet-enhanced/manager/reject/{timesheetId}": {
      put: {
        summary: "Reject Timesheet (Manager/HR)",
        description:
          "Reject a submitted timesheet. Managers can only reject their team's timesheets. HR/Admin can reject any.",
        tags: ["👔 Manager Actions"],
        parameters: [
          {
            name: "timesheetId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  rejection_reason: {
                    type: "string",
                    example: "Hours mismatch with attendance records",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Timesheet rejected successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Timesheet rejected successfully",
                },
              },
            },
          },
          403: {
            description: "Forbidden - Not authorized to reject this timesheet",
          },
        },
      },
    },
    "/api/attendance-enhanced/report/team": {
      get: {
        summary: "Get Team Attendance Report (Manager)",
        description:
          "View attendance status for all direct reports for a specific date",
        tags: ["👔 Manager Actions"],
        parameters: [
          {
            name: "date",
            in: "query",
            schema: { type: "string", format: "date" },
            example: "2025-12-26",
          },
        ],
        responses: {
          200: {
            description: "Team attendance report",
            content: {
              "application/json": {
                example: {
                  team_members: [
                    {
                      id: 885,
                      EmployeeNumber: "EMP001",
                      FirstName: "John",
                      LastName: "Doe",
                      WorkEmail: "john@company.com",
                    },
                  ],
                  date: "2025-12-26",
                  attendance: [
                    {
                      id: 450,
                      employee_id: 885,
                      EmployeeNumber: "EMP001",
                      FirstName: "John",
                      LastName: "Doe",
                      attendance_date: "2025-12-26",
                      status: "present",
                      work_mode: "Office",
                      first_check_in: "09:15:00",
                      last_check_out: "18:30:00",
                      total_work_hours: 8.5,
                      total_punches: 4,
                    },
                  ],
                  summary: {
                    total_team: 15,
                    present: 13,
                    absent: 1,
                    on_leave: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/employees/reporting/{managerId}": {
      get: {
        summary: "Get Team Members (Manager)",
        description: "Get list of employees reporting to a specific manager with pagination support",
        tags: ["👔 Manager Actions"],
        parameters: [
          {
            name: "managerId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Manager ID",
          },
          {
            name: "page",
            in: "query",
            required: false,
            description: "Page number (default: 1)",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Records per page (default: 20, max: 100)",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: "List of team members",
            content: {
              "application/json": {
                example: {
                  data: [
                    {
                      id: 885,
                      EmployeeNumber: "EMP001",
                      FirstName: "John",
                      LastName: "Doe",
                      WorkEmail: "john@company.com",
                      Department: "Engineering",
                      Designation: "Senior Developer",
                      reporting_manager_id: 100,
                    },
                  ],
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 12,
                    totalPages: 1,
                  },
                },
              },
            },
          },
        },
      },
    },

    // ============ REPORTS ============
    "/api/reports/attendance": {
      get: {
        summary: "Attendance Report (HR)",
        tags: ["📊 Reports"],
        responses: {
          200: { description: "Attendance report" },
        },
      },
    },
    "/api/reports/leave": {
      get: {
        summary: "Leave Report (HR)",
        tags: ["📊 Reports"],
        responses: {
          200: { description: "Leave report" },
        },
      },
    },
    "/api/reports/payroll": {
      get: {
        summary: "Payroll Report (HR)",
        tags: ["📊 Reports"],
        responses: {
          200: { description: "Payroll report" },
        },
      },
    },
    "/api/reports/headcount": {
      get: {
        summary: "Headcount Report (HR)",
        tags: ["📊 Reports"],
        responses: {
          200: { description: "Headcount analysis" },
        },
      },
    },

    // ============ MASTER DATA ============
    "/api/locations": {
      get: {
        summary: "Get All Locations",
        tags: ["🏢 Master Data"],
        responses: {
          200: {
            description: "List of locations",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Location (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Mumbai Office" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Location created" },
        },
      },
    },
    "/api/locations/{id}": {
      delete: {
        summary: "Delete Location (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Location deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "locations deleted successfully",
                },
              },
            },
          },
          404: { description: "Location not found" },
          500: { description: "Failed to delete location" },
        },
      },
    },
    "/api/departments": {
      get: {
        summary: "Get All Departments",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of departments" },
        },
      },
      post: {
        summary: "Create Department (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Engineering" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Department created" },
        },
      },
    },
    "/api/departments/{id}": {
      delete: {
        summary: "Delete Department (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Department deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "departments deleted successfully",
                },
              },
            },
          },
          404: { description: "Department not found" },
          500: { description: "Failed to delete department" },
        },
      },
    },
    "/api/designations": {
      get: {
        summary: "Get All Designations",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of designations" },
        },
      },
      post: {
        summary: "Create Designation (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Senior Developer" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Designation created" },
        },
      },
    },
    "/api/designations/{id}": {
      delete: {
        summary: "Delete Designation (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Designation deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "designations deleted successfully",
                },
              },
            },
          },
          404: { description: "Designation not found" },
          500: { description: "Failed to delete designation" },
        },
      },
    },
    "/api/business-units": {
      get: {
        summary: "Get All Business Units",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of business units" },
        },
      },
      post: {
        summary: "Create Business Unit (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "IT Services" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Business unit created" },
        },
      },
    },
    "/api/business-units/{id}": {
      delete: {
        summary: "Delete Business Unit (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Business unit deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "business-units deleted successfully",
                },
              },
            },
          },
          404: { description: "Business unit not found" },
          500: { description: "Failed to delete business unit" },
        },
      },
    },
    "/api/legal-entities": {
      get: {
        summary: "Get All Legal Entities",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of legal entities" },
        },
      },
      post: {
        summary: "Create Legal Entity (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "ABC Technologies Pvt Ltd" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Legal entity created" },
        },
      },
    },
    "/api/legal-entities/{id}": {
      delete: {
        summary: "Delete Legal Entity (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Legal entity deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "legal-entities deleted successfully",
                },
              },
            },
          },
          404: { description: "Legal Entity not found" },
          500: { description: "Failed to delete legal-entity" },
        },
      },
    },
    "/api/cost-centers": {
      get: {
        summary: "Get All Cost Centers",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of cost centers" },
        },
      },
      post: {
        summary: "Create Cost Center (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code"],
                properties: {
                  code: { type: "string", example: "CC001" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Cost center created" },
        },
      },
    },
    "/api/cost-centers/{id}": {
      delete: {
        summary: "Delete Cost Center (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Cost center deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "cost-centers deleted successfully",
                },
              },
            },
          },
          404: { description: "Cost Center not found" },
          500: { description: "Failed to delete cost-center" },
        },
      },
    },
    "/api/sub-departments": {
      get: {
        summary: "Get All Sub-Departments",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of sub-departments" },
        },
      },
      post: {
        summary: "Create Sub-Department (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Backend Development" },
                  department_id: {
                    type: "integer",
                    example: 1,
                    description: "Parent department ID",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Sub-department created" },
        },
      },
    },
    "/api/sub-departments/{id}": {
      delete: {
        summary: "Delete Sub-Department (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Sub-department deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "sub-departments deleted successfully",
                },
              },
            },
          },
          404: { description: "Sub-Department not found" },
          500: { description: "Failed to delete sub-department" },
        },
      },
    },
    "/api/bands": {
      get: {
        summary: "Get All Bands",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of bands" },
        },
      },
      post: {
        summary: "Create Band (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Band A" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Band created" },
        },
      },
    },
    "/api/bands/{id}": {
      delete: {
        summary: "Delete Band (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Band deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "bands deleted successfully",
                },
              },
            },
          },
          404: { description: "Band not found" },
          500: { description: "Failed to delete band" },
        },
      },
    },
    "/api/pay-grades": {
      get: {
        summary: "Get All Pay Grades",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of pay grades" },
        },
      },
      post: {
        summary: "Create Pay Grade (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Grade 1" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Pay grade created" },
        },
      },
    },
    "/api/pay-grades/{id}": {
      delete: {
        summary: "Delete Pay Grade (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Pay grade deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "pay-grades deleted successfully",
                },
              },
            },
          },
          404: { description: "Pay Grade not found" },
          500: { description: "Failed to delete pay-grade" },
        },
      },
    },
    "/api/leave-plans": {
      get: {
        summary: "Get All Leave Plans",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of leave plans" },
        },
      },
      post: {
        summary: "Create Leave Plan (Admin)",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "Leave plan created" },
        },
      },
    },
    "/api/leave-plans/{id}": {
      delete: {
        summary: "Delete Leave Plan (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Leave plan deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "leave-plans deleted successfully",
                },
              },
            },
          },
          404: { description: "Leave Plan not found" },
          500: { description: "Failed to delete leave-plan" },
        },
      },
    },
    "/api/shift-policies": {
      get: {
        summary: "Get All Shift Policies",
        tags: ["🏢 Master Data"],
        description:
          "Retrieve all shift policies with timing details for regular timesheet creation",
        responses: {
          200: {
            description: "List of shift policies",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 1 },
                      name: { type: "string", example: "Day Shift" },
                      shift_type: {
                        type: "string",
                        enum: ["general", "night", "rotating", "flexible"],
                        example: "general",
                      },
                      start_time: {
                        type: "string",
                        format: "time",
                        example: "09:00:00",
                      },
                      end_time: {
                        type: "string",
                        format: "time",
                        example: "18:00:00",
                      },
                      break_duration_minutes: { type: "integer", example: 60 },
                      timezone: { type: "string", example: "UTC" },
                      description: {
                        type: "string",
                        example: "Standard 9-6 office hours",
                      },
                      is_active: { type: "integer", example: 1 },
                      created_at: { type: "string", format: "date-time" },
                      updated_at: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Shift Policy (Admin)",
        tags: ["🏢 Master Data"],
        description:
          "Create a new shift policy with timing details. Used for regular timesheet hourly breakdowns.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "start_time", "end_time"],
                properties: {
                  name: { type: "string", example: "Day Shift" },
                  shift_type: {
                    type: "string",
                    enum: ["general", "night", "rotating", "flexible"],
                    example: "general",
                  },
                  start_time: {
                    type: "string",
                    format: "time",
                    example: "09:00:00",
                  },
                  end_time: {
                    type: "string",
                    format: "time",
                    example: "18:00:00",
                  },
                  break_duration_minutes: {
                    type: "integer",
                    example: 60,
                    description: "Break duration in minutes (default: 60)",
                  },
                  timezone: {
                    type: "string",
                    example: "Asia/Kolkata",
                    description: "Timezone (default: UTC)",
                  },
                  description: {
                    type: "string",
                    example: "Standard 9-6 office hours with 1 hour break",
                  },
                  is_active: {
                    type: "integer",
                    example: 1,
                    description: "1 for active, 0 for inactive",
                  },
                },
              },
              examples: {
                dayShift: {
                  summary: "Day Shift Example",
                  value: {
                    name: "Day Shift",
                    shift_type: "general",
                    start_time: "09:00:00",
                    end_time: "18:00:00",
                    break_duration_minutes: 60,
                    timezone: "Asia/Kolkata",
                    description: "Standard 9-6 office hours",
                    is_active: 1,
                  },
                },
                nightShift: {
                  summary: "Night Shift Example",
                  value: {
                    name: "Night Shift",
                    shift_type: "night",
                    start_time: "21:00:00",
                    end_time: "06:00:00",
                    break_duration_minutes: 60,
                    timezone: "UTC",
                    description: "Night shift for 24/7 operations",
                    is_active: 1,
                  },
                },
                flexibleShift: {
                  summary: "Flexible Shift Example",
                  value: {
                    name: "Flexible Hours",
                    shift_type: "flexible",
                    start_time: "10:00:00",
                    end_time: "19:00:00",
                    break_duration_minutes: 60,
                    timezone: "Asia/Kolkata",
                    description: "Flexible working hours",
                    is_active: 1,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Shift policy created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    id: { type: "integer" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid input - missing required fields" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/shift-policies/{id}": {
      put: {
        summary: "Update Shift Policy (Admin)",
        tags: ["🏢 Master Data"],
        description:
          "Update an existing shift policy. All fields are optional.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Shift Policy ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  shift_type: {
                    type: "string",
                    enum: ["general", "night", "rotating", "flexible"],
                  },
                  start_time: { type: "string", format: "time" },
                  end_time: { type: "string", format: "time" },
                  break_duration_minutes: { type: "integer" },
                  timezone: { type: "string" },
                  description: { type: "string" },
                  is_active: { type: "integer" },
                },
              },
              example: {
                start_time: "09:30:00",
                end_time: "18:30:00",
                description: "Updated timing",
              },
            },
          },
        },
        responses: {
          200: { description: "Shift policy updated" },
          400: { description: "No fields to update" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/weekly-off-policies": {
      get: {
        summary: "Get All Weekly Off Policies (Enhanced)",
        tags: ["🏢 Master Data"],
        description:
          "Get all weekly off policies with full details including fixed days, patterns (2nd/4th Saturday), rules, and assignments",
        responses: {
          200: {
            description: "List of weekly off policies with full configuration",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 1 },
                      policy_code: { type: "string", example: "WOP001" },
                      name: { type: "string", example: "Standard 5-Day Week" },
                      description: {
                        type: "string",
                        example: "Monday-Friday work, Sat-Sun off",
                      },
                      effective_date: {
                        type: "string",
                        format: "date",
                        example: "2024-01-01",
                      },
                      end_date: {
                        type: "string",
                        format: "date",
                        nullable: true,
                      },
                      is_active: { type: "integer", example: 1 },
                      sunday_off: { type: "integer", example: 1 },
                      monday_off: { type: "integer", example: 0 },
                      tuesday_off: { type: "integer", example: 0 },
                      wednesday_off: { type: "integer", example: 0 },
                      thursday_off: { type: "integer", example: 0 },
                      friday_off: { type: "integer", example: 0 },
                      saturday_off: { type: "integer", example: 1 },
                      week_pattern: {
                        type: "object",
                        nullable: true,
                        example: { Sat: [2, 4], Sun: [1, 2, 3, 4, 5] },
                        description:
                          "JSON pattern for alternate weeks. Key = day abbrev, Value = array of week numbers (1-5)",
                      },
                      is_payable: { type: "integer", example: 1 },
                      holiday_overlap_rule: {
                        type: "string",
                        enum: ["ignore", "compensatory_off", "carry_forward"],
                        example: "ignore",
                      },
                      sandwich_rule: { type: "integer", example: 0 },
                      minimum_work_days: { type: "integer", example: 0 },
                      allow_half_day: { type: "integer", example: 0 },
                      half_day_pattern: { type: "object", nullable: true },
                      location_id: { type: "integer", nullable: true },
                      department_id: { type: "integer", nullable: true },
                      shift_policy_id: { type: "integer", nullable: true },
                      location_name: { type: "string", nullable: true },
                      department_name: { type: "string", nullable: true },
                      shift_policy_name: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Weekly Off Policy (Admin) - Enhanced",
        tags: ["🏢 Master Data"],
        description:
          "Create comprehensive week-off policy with fixed days, patterns (2nd/4th Saturday), sandwich rules, and scope assignment",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["policy_code", "name", "effective_date"],
                properties: {
                  policy_code: {
                    type: "string",
                    example: "WOP001",
                    description: "Unique policy code",
                  },
                  name: { type: "string", example: "Standard 5-Day Week" },
                  description: {
                    type: "string",
                    example: "Mon-Fri work, Sat-Sun off",
                  },
                  effective_date: {
                    type: "string",
                    format: "date",
                    example: "2024-01-01",
                  },
                  end_date: { type: "string", format: "date", nullable: true },
                  is_active: {
                    type: "integer",
                    example: 1,
                    description: "1=active, 0=inactive",
                  },

                  sunday_off: {
                    type: "integer",
                    example: 1,
                    description: "1=off, 0=working",
                  },
                  monday_off: { type: "integer", example: 0 },
                  tuesday_off: { type: "integer", example: 0 },
                  wednesday_off: { type: "integer", example: 0 },
                  thursday_off: { type: "integer", example: 0 },
                  friday_off: { type: "integer", example: 0 },
                  saturday_off: { type: "integer", example: 0 },

                  week_pattern: {
                    type: "object",
                    example: { Sat: [2, 4] },
                    description:
                      'Alternate week pattern. Example: {"Sat": [2, 4]} = 2nd & 4th Saturday off',
                  },

                  is_payable: {
                    type: "integer",
                    example: 1,
                    description: "1=paid, 0=unpaid",
                  },
                  holiday_overlap_rule: {
                    type: "string",
                    enum: ["ignore", "compensatory_off", "carry_forward"],
                    example: "ignore",
                    description:
                      "What happens when public holiday falls on week off",
                  },
                  sandwich_rule: {
                    type: "integer",
                    example: 0,
                    description: "1=count weekends in sandwiched leaves",
                  },
                  minimum_work_days: {
                    type: "integer",
                    example: 0,
                    description: "Min days to work to earn week off",
                  },

                  allow_half_day: { type: "integer", example: 0 },
                  half_day_pattern: { type: "object", nullable: true },

                  location_id: {
                    type: "integer",
                    nullable: true,
                    description: "NULL = applies to all locations",
                  },
                  department_id: {
                    type: "integer",
                    nullable: true,
                    description: "NULL = applies to all departments",
                  },
                  shift_policy_id: {
                    type: "integer",
                    nullable: true,
                    description: "NULL = applies to all shifts",
                  },
                },
              },
              examples: {
                standard_5_day: {
                  summary: "Standard 5-Day Week (Sat-Sun Off)",
                  value: {
                    policy_code: "WOP001",
                    name: "Standard 5-Day Week",
                    description:
                      "Monday to Friday working, Saturday and Sunday off",
                    effective_date: "2024-01-01",
                    is_active: 1,
                    sunday_off: 1,
                    monday_off: 0,
                    tuesday_off: 0,
                    wednesday_off: 0,
                    thursday_off: 0,
                    friday_off: 0,
                    saturday_off: 1,
                    is_payable: 1,
                    holiday_overlap_rule: "ignore",
                    sandwich_rule: 0,
                    minimum_work_days: 5,
                  },
                },
                alternate_saturday: {
                  summary: "Indian 2nd & 4th Saturday Off (Most Common)",
                  value: {
                    policy_code: "WOP002",
                    name: "2nd & 4th Saturday Off",
                    description:
                      "Every Sunday off, 2nd and 4th Saturday off (1st, 3rd, 5th Saturday working)",
                    effective_date: "2024-01-01",
                    is_active: 1,
                    sunday_off: 1,
                    monday_off: 0,
                    tuesday_off: 0,
                    wednesday_off: 0,
                    thursday_off: 0,
                    friday_off: 0,
                    saturday_off: 0,
                    week_pattern: { Sat: [2, 4] },
                    is_payable: 1,
                    holiday_overlap_rule: "compensatory_off",
                    sandwich_rule: 1,
                    minimum_work_days: 5,
                  },
                },
                six_day_week: {
                  summary: "6-Day Work Week (Only Sunday Off)",
                  value: {
                    policy_code: "WOP003",
                    name: "6-Day Work Week",
                    description:
                      "Monday to Saturday working, only Sunday off. Common for retail/manufacturing",
                    effective_date: "2024-01-01",
                    is_active: 1,
                    sunday_off: 1,
                    monday_off: 0,
                    tuesday_off: 0,
                    wednesday_off: 0,
                    thursday_off: 0,
                    friday_off: 0,
                    saturday_off: 0,
                    is_payable: 1,
                    holiday_overlap_rule: "compensatory_off",
                    sandwich_rule: 0,
                    minimum_work_days: 6,
                  },
                },
                alternate_all_saturdays: {
                  summary: "Alternate Saturdays Off (1st, 3rd, 5th Off)",
                  value: {
                    policy_code: "WOP004",
                    name: "1st, 3rd & 5th Saturday Off",
                    description: "Every Sunday and odd-week Saturdays off",
                    effective_date: "2024-01-01",
                    is_active: 1,
                    sunday_off: 1,
                    saturday_off: 0,
                    week_pattern: { Sat: [1, 3, 5] },
                    is_payable: 1,
                    holiday_overlap_rule: "carry_forward",
                    sandwich_rule: 1,
                    minimum_work_days: 5,
                  },
                },
                department_specific: {
                  summary: "Department-Specific Policy (IT Department)",
                  value: {
                    policy_code: "WOP005",
                    name: "IT Department Week Off",
                    description:
                      "Special week-off policy for IT department with flexible timing",
                    effective_date: "2024-01-01",
                    is_active: 1,
                    sunday_off: 1,
                    saturday_off: 1,
                    is_payable: 1,
                    holiday_overlap_rule: "compensatory_off",
                    sandwich_rule: 0,
                    minimum_work_days: 5,
                    department_id: 1,
                    location_id: null,
                    shift_policy_id: null,
                  },
                },
                half_day_saturday: {
                  summary: "Half Day on 1st & 3rd Saturday",
                  value: {
                    policy_code: "WOP006",
                    name: "Half Day Saturdays",
                    description:
                      "2nd & 4th Saturday full off, 1st & 3rd Saturday half day",
                    effective_date: "2024-01-01",
                    is_active: 1,
                    sunday_off: 1,
                    saturday_off: 0,
                    week_pattern: { Sat: [2, 4] },
                    allow_half_day: 1,
                    half_day_pattern: { Sat: [1, 3] },
                    is_payable: 1,
                    holiday_overlap_rule: "ignore",
                    sandwich_rule: 1,
                    minimum_work_days: 5,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Weekly off policy created successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Weekly off policy created successfully",
                  id: 1,
                },
              },
            },
          },
          400: { description: "Missing required fields" },
        },
      },
      put: {
        summary: "Update Weekly Off Policy (Admin)",
        tags: ["🏢 Master Data"],
        description: "Update any field of an existing weekly off policy",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  is_active: { type: "integer" },
                  sunday_off: { type: "integer" },
                  monday_off: { type: "integer" },
                  tuesday_off: { type: "integer" },
                  wednesday_off: { type: "integer" },
                  thursday_off: { type: "integer" },
                  friday_off: { type: "integer" },
                  saturday_off: { type: "integer" },
                  week_pattern: { type: "object" },
                  is_payable: { type: "integer" },
                  holiday_overlap_rule: { type: "string" },
                  sandwich_rule: { type: "integer" },
                  minimum_work_days: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Policy updated successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Weekly off policy updated successfully",
                },
              },
            },
          },
        },
      },
    },
    "/api/weekly-off-policies/{id}": {
      delete: {
        summary: "Delete Weekly Off Policy (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Weekly off policy deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Weekly off policy deleted successfully",
                },
              },
            },
          },
          404: { description: "Weekly Off Policy not found" },
          500: { description: "Failed to delete weekly-off-policy" },
        },
      },
    },
    "/api/attendance-policies": {
      get: {
        summary: "Get All Attendance Policies",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of attendance policies" },
        },
      },
      post: {
        summary: "Create Attendance Policy (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    example: "Standard Attendance Policy",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Attendance policy created" },
        },
      },
    },
    "/api/attendance-policies/{id}": {
      delete: {
        summary: "Delete Attendance Policy (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Attendance policy deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "attendance-policies deleted successfully",
                },
              },
            },
          },
          404: { description: "Attendance Policy not found" },
          500: { description: "Failed to delete attendance-policy" },
        },
      },
    },
    "/api/attendance-capture-schemes": {
      get: {
        summary: "Get All Attendance Capture Schemes",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of attendance capture schemes" },
        },
      },
      post: {
        summary: "Create Attendance Capture Scheme (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Biometric + Web Punch" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Attendance capture scheme created" },
        },
      },
    },
    "/api/attendance-capture-schemes/{id}": {
      delete: {
        summary: "Delete Attendance Capture Scheme (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Attendance capture scheme deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "attendance-capture-schemes deleted successfully",
                },
              },
            },
          },
          404: { description: "Attendance Capture Scheme not found" },
          500: { description: "Failed to delete attendance-capture-scheme" },
        },
      },
    },
    "/api/holiday-lists": {
      get: {
        summary: "Get All Holiday Lists",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of holiday lists" },
        },
      },
      post: {
        summary: "Create Holiday List (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "India Holidays 2025" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Holiday list created" },
        },
      },
    },
    "/api/holiday-lists/{id}": {
      delete: {
        summary: "Delete Holiday List (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Holiday list deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "holiday-lists deleted successfully",
                },
              },
            },
          },
          404: { description: "Holiday List not found" },
          500: { description: "Failed to delete holiday-list" },
        },
      },
    },
    "/api/expense-policies": {
      get: {
        summary: "Get All Expense Policies",
        tags: ["🏢 Master Data"],
        responses: {
          200: { description: "List of expense policies" },
        },
      },
      post: {
        summary: "Create Expense Policy (Admin)",
        tags: ["🏢 Master Data"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    example: "Travel & Expense Policy 2025",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Expense policy created" },
        },
      },
    },
    "/api/expense-policies/{id}": {
      delete: {
        summary: "Delete Expense Policy (Admin)",
        tags: ["🏢 Master Data"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: {
            description: "Expense policy deleted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "expense-policies deleted successfully",
                },
              },
            },
          },
          404: { description: "Expense Policy not found" },
          500: { description: "Failed to delete expense-policy" },
        },
      },
    },

    // ==================== PAYROLL MODULE ====================
    // Setup → Master Data → Processing → Reports
    // Use auth header: Authorization: Bearer <token>

    // ============ 1️⃣ PAYROLL SETUP (Quick Start) ============
    "/api/payroll-master/setup/defaults": {
      post: {
        summary: "Auto-Populate Complete Payroll Setup",
        description: "⚡ Complete setup: Creates templates, master components, structure compositions, AND assigns sample employees. Creates 3 templates (Standard/Senior/Manager), 21 components, composition mappings, and assigns first 3-5 active employees to templates. Everything ready to run payroll immediately!",
        tags: ["Payroll - Setup"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Complete payroll setup created successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  summary: {
                    templates: 3,
                    components: 21,
                    compositions: 21,
                    employee_structures: 3
                  },
                  templates: [
                    { id: 1, name: "Standard Employee Package", components: 6, master_structure_id: 1 },
                    { id: 2, name: "Senior Employee Package", components: 7, master_structure_id: 2 },
                    { id: 3, name: "Manager Package", components: 8, master_structure_id: 3 }
                  ],
                  employee_structures: [
                    { employee_id: 1, employee_name: "John Doe", structure_id: 4, template: "Standard Employee Package", ctc: 500000 },
                    { employee_id: 2, employee_name: "Jane Smith", structure_id: 5, template: "Senior Employee Package", ctc: 800000 },
                    { employee_id: 3, employee_name: "Bob Wilson", structure_id: 6, template: "Manager Package", ctc: 1200000 }
                  ],
                  message: "Successfully created complete payroll master data",
                  note: "Complete payroll setup ready. Templates, components, compositions, and sample employee structures created.",
                  next_steps: [
                    "1. Run payroll: POST /api/payroll/v2/run with year and month",
                    "2. View payslips: GET /api/payroll/v2/payslips/{employeeId}",
                    "3. Assign more employees: POST /api/payroll-master/structures"
                  ]
                }
              }
            }
          },
          400: {
            description: "Templates already exist",
            content: {
              "application/json": {
                example: {
                  error: "Default templates already exist. Clear existing templates first.",
                  existing_count: 3
                }
              }
            }
          },
          500: { description: "Server error" }
        }
      }
    },
    "/api/payroll-master/setup/clear": {
      delete: {
        summary: "Clear All Payroll Data",
        description: "⚠️ CAUTION: Deletes ALL payroll data - templates, components, structures, compositions, employee assignments. For testing/reset only. Use before re-populating defaults.",
        tags: ["Payroll - Setup"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "All payroll data cleared",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "All payroll master data cleared successfully",
                  deleted: {
                    templates: 3,
                    structures: 6,
                    components: 63,
                    compositions: 21
                  }
                }
              }
            }
          },
          500: { description: "Server error" }
        }
      }
    },

    // ============ 2️⃣ PAYROLL PROCESSING (Run & Calculate) ============
    "/api/payroll/v2/run": {
      post: {
        summary: "Run Payroll for Month",
        description: "Process payroll for all employees for a specific month. Calculates salaries, deductions, taxes, and generates payslips.",
        tags: ["Payroll - Processing"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  year: { type: "integer", example: 2026 },
                  month: { type: "integer", example: 2 }
                },
                required: ["year", "month"]
              },
            },
          },
        },
        responses: { 200: { description: "Payroll run started and processed" } },
      },
      get: {
        summary: "Get Payroll Run Summary",
        description: "Get aggregated payroll summary for a month (total employees, gross pay, net pay, status).",
        tags: ["Payroll - Processing"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "month", in: "query", required: true, schema: { type: "string", example: "2026-02" }, description: "Month in YYYY-MM format" }
        ],
        responses: { 200: { description: "Payroll run summary for month" } },
      },
    },

    // ============ 3️⃣ PAYROLL REPORTS (View & Download) ============
    "/api/payroll/v2/payslips/{employeeId}": {
      get: {
        summary: "List Employee Payslips",
        description: "Get all payslips for an employee (all months).",
        tags: ["Payroll - Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "employeeId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "List of payslips for employee" } },
      },
    },
    "/api/payroll/v2/payslips/{employeeId}/{year}/{month}": {
      get: {
        summary: "Get Payslip Details",
        description: "Get detailed payslip for an employee for a specific month (gross, deductions, net pay, breakdown).",
        tags: ["Payroll - Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
          { name: "year", in: "path", required: true, schema: { type: "integer" } },
          { name: "month", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: { 200: { description: "Payslip detail for employee" } },
      },
    },
    "/api/payroll/v2/earnings/{employeeId}": {
      get: {
        summary: "Get Earnings Breakdown",
        description: "Get detailed earnings breakdown (BASIC, HRA, Allowances, etc.) for an employee for a month.",
        tags: ["Payroll - Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
          { name: "month", in: "query", required: true, schema: { type: "string", example: "2026-02" } }
        ],
        responses: { 200: { description: "Earnings breakup for employee" } },
      },
    },
    "/api/payroll/v2/deductions/{employeeId}": {
      get: {
        summary: "Get Deductions Breakdown",
        description: "Get detailed deductions breakdown (PF, Tax, LOP, etc.) for an employee for a month.",
        tags: ["Payroll - Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
          { name: "month", in: "query", required: true, schema: { type: "string", example: "2026-02" } }
        ],
        responses: { 200: { description: "Deductions breakup for employee" } },
      },
    },
    "/api/payroll/v2/tax-summary/{employeeId}": {
      get: {
        summary: "Get Tax Summary",
        description: "Get annual tax summary for an employee (TDS, Professional Tax, etc.).",
        tags: ["Payroll - Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
          { name: "year", in: "query", required: true, schema: { type: "integer", example: 2026 } }
        ],
        responses: { 200: { description: "Tax summary for employee" } },
      },
    },
    "/api/payroll/v2/structure/{employeeId}": {
      get: {
        summary: "Get Salary Structure",
        description: "Get employee's current salary structure (CTC breakdown, components, percentages).",
        tags: ["Payroll - Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "employeeId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Employee salary structure details" } },
      },
    },
    "/api/payroll/v2/attendance-impact/{employeeId}": {
      get: {
        summary: "Get Attendance Impact",
        description: "Get attendance-based salary impact (LOP deductions, late arrival penalties) for a month.",
        tags: ["Payroll - Reports"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "employeeId", in: "path", required: true, schema: { type: "integer" } },
          { name: "year", in: "query", required: true, schema: { type: "integer", example: 2026 } },
          { name: "month", in: "query", required: true, schema: { type: "integer", example: 2 } }
        ],
        responses: { 200: { description: "Attendance impact details (deductions for absences/late arrival)" } },
      },
    },

    // ============ 4️⃣ MASTER DATA - Components ============
    "/api/payroll-master/components": {
      get: {
        summary: "List All Components",
        description: "Get all salary components (BASIC, HRA, PF, etc.) with their calculation types.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of salary components" } },
      },
      post: {
        summary: "Create Component",
        description: "Create a new salary component (earning or deduction) with calculation rules.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  structure_id: { type: "integer", description: "Reference to salary_structures.id", example: 1 },
                  code: { type: "string", description: "Component code (e.g., BASIC, HRA)", example: "BASIC" },
                  name: { type: "string", description: "Component name", example: "Basic Salary" },
                  component_type: { type: "string", enum: ["EARNING", "DEDUCTION"], description: "Type of component" },
                  calculation_type: { type: "string", enum: ["FIXED", "PERCENTAGE"], description: "How component is calculated" },
                  value: { type: "number", format: "float", description: "Fixed amount or percentage value", example: 40.00 },
                  percentage_of_code: { type: "string", description: "Code of base component for percentage calculation", example: "BASIC", nullable: true },
                  taxable: { type: "boolean", default: true, description: "Whether component is taxable" },
                  prorated: { type: "boolean", default: false, description: "Whether component is prorated" },
                  sequence: { type: "integer", default: 10, description: "Display order" },
                  notes: { type: "string", description: "Additional notes", nullable: true }
                },
                required: ["structure_id", "code", "name", "component_type", "calculation_type", "value"]
              },
            },
          },
        },
        responses: { 200: { description: "Component created" } },
      },
    },
    "/api/payroll-master/components/{component_id}": {
      get: {
        summary: "Get Component Details",
        description: "Get details of a specific salary component.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "component_id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Component details" } },
      },
      put: {
        summary: "Update Component",
        description: "Update an existing salary component.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "component_id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  code: { type: "string", description: "Component code (e.g., BASIC, HRA)", example: "BASIC" },
                  name: { type: "string", description: "Component name", example: "Basic Salary" },
                  component_type: { type: "string", enum: ["EARNING", "DEDUCTION"], description: "Type of component" },
                  calculation_type: { type: "string", enum: ["FIXED", "PERCENTAGE"], description: "How component is calculated" },
                  value: { type: "number", format: "float", description: "Fixed amount or percentage value", example: 40.00 },
                  percentage_of_code: { type: "string", description: "Code of base component for percentage calculation", example: "BASIC", nullable: true },
                  taxable: { type: "boolean", default: true, description: "Whether component is taxable" },
                  prorated: { type: "boolean", default: false, description: "Whether component is prorated" },
                  sequence: { type: "integer", default: 10, description: "Display order" },
                  notes: { type: "string", description: "Additional notes", nullable: true }
                },
                required: ["code", "name", "component_type", "calculation_type", "value"]
              },
            },
          },
        },
        responses: { 200: { description: "Component updated" } },
      },
      delete: {
        summary: "Delete Component",
        description: "Delete a salary component (only if not used in any template).",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "component_id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Component deleted" } },
      },
    },
    // ============ 5️⃣ MASTER DATA - Templates ============
    "/api/payroll-master/templates": {
      get: {
        summary: "List All Templates",
        description: "Get all salary structure templates (Standard, Senior, Manager packages).",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of salary templates" } },
      },
      post: {
        summary: "Create Template",
        description: "Create a new salary structure template (e.g., 'Intern Package', 'Director Package').",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  template_name: { type: "string", description: "Template name", example: "Senior Employee Package" },
                  description: { type: "string", description: "Template description", example: "Salary structure for senior employees", nullable: true },
                  created_by: { type: "integer", description: "User ID who created the template", example: 1 }
                },
                required: ["template_name", "created_by"]
              },
            },
          },
        },
        responses: { 200: { description: "Template created successfully" } },
      },
    },
    "/api/payroll-master/templates/{id}": {
      get: {
        summary: "Get Template Details",
        description: "Get details of a specific salary structure template.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Template details" } },
      },
      put: {
        summary: "Update Template",
        description: "Update a salary structure template.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "template_id from salary_structure_templates table" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  template_name: { type: "string", description: "Template name", example: "Senior Employee Package" },
                  description: { type: "string", description: "Template description", example: "Updated salary structure for senior employees", nullable: true }
                },
                required: ["template_name"]
              },
            },
          },
        },
        responses: { 200: { description: "Template updated successfully" } },
      },
      delete: {
        summary: "Delete Template",
        description: "Delete a salary structure template.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Template deleted" } },
      },
    },
    // ============ 6️⃣ MASTER DATA - Structures (Employee Assignments) ============
    "/api/payroll-master/structures": {
      get: {
        summary: "List All Structures",
        description: "Get all employee salary assignments (which employee has which template).",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of salary structures" } },
      },
      post: {
        summary: "Create Salary Structure",
        description: "Create a salary structure for an employee with CTC and components.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  employee_id: { type: "integer", description: "Employee ID from employees table", example: 1 },
                  structure_name: { type: "string", description: "Name of the salary structure", example: "2026 Annual Package" },
                  ctc_amount: { type: "number", format: "float", description: "Annual CTC amount", example: 800000 },
                  effective_from: { type: "string", format: "date", description: "Structure effective from date", example: "2026-01-01" },
                  effective_to: { type: "string", format: "date", description: "Structure effective to date (optional)", nullable: true, example: null },
                  is_active: { type: "boolean", default: true, description: "Whether structure is active" },
                  notes: { type: "string", description: "Additional notes", nullable: true },
                  created_by: { type: "integer", description: "User ID who created the structure", example: 1 },
                  components: {
                    type: "array",
                    description: "Array of salary components (optional)",
                    items: {
                      type: "object",
                      properties: {
                        code: { type: "string", example: "BASIC" },
                        name: { type: "string", example: "Basic Salary" },
                        component_type: { type: "string", enum: ["EARNING", "DEDUCTION"] },
                        calculation_type: { type: "string", enum: ["FIXED", "PERCENTAGE"] },
                        value: { type: "number", format: "float", example: 40.00 },
                        percentage_of_code: { type: "string", nullable: true },
                        taxable: { type: "boolean", default: true },
                        prorated: { type: "boolean", default: false },
                        sequence: { type: "integer", default: 10 },
                        notes: { type: "string", nullable: true }
                      },
                      required: ["code", "name", "component_type", "calculation_type", "value"]
                    }
                  }
                },
                required: ["employee_id", "structure_name", "ctc_amount", "effective_from"]
              },
            },
          },
        },
        responses: { 200: { description: "Salary structure created successfully" } },
      },
    },
    "/api/payroll-master/structures/{id}": {
      get: {
        summary: "Get Structure Details",
        description: "Get details of a specific employee salary structure.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Structure details" } },
      },
      put: {
        summary: "Update Salary Structure",
        description: "Update an employee's salary structure details.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "Structure ID from salary_structures table" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  structure_name: { type: "string", description: "Name of the salary structure", example: "2026 Updated Package" },
                  ctc_amount: { type: "number", format: "float", description: "Annual CTC amount", example: 850000 },
                  effective_from: { type: "string", format: "date", description: "Structure effective from date", example: "2026-01-01" },
                  effective_to: { type: "string", format: "date", description: "Structure effective to date (optional)", nullable: true },
                  is_active: { type: "boolean", description: "Whether structure is active" },
                  notes: { type: "string", description: "Additional notes", nullable: true }
                },
                required: ["structure_name", "ctc_amount", "effective_from"]
              },
            },
          },
        },
        responses: { 200: { description: "Salary structure updated successfully" } },
      },
      delete: {
        summary: "Remove Structure",
        description: "Remove a salary structure assignment from an employee.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Structure deleted" } },
      },
    },
    // ============ 7️⃣ MASTER DATA - Template Composition (Components in Template) ============
    "/api/payroll-master/templates/{template_id}/composition": {
      get: {
        summary: "List Template Components",
        description: "Get all components configured in a template (BASIC 40%, HRA 20%, etc.).",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "template_id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "List of structure compositions for template" } },
      },
      post: {
        summary: "Add Component to Template",
        description: "Add a salary component to a template with calculation formula/value.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "template_id", in: "path", required: true, schema: { type: "integer" }, description: "Template ID from salary_structure_templates table" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  component_id: { type: "integer", description: "Component ID from salary_components table", example: 1 },
                  formula_or_value: { type: "string", description: "Formula or fixed value (e.g., '40%', '50000')", example: "40%" },
                  created_by: { type: "integer", description: "User ID who created the composition", example: 1 }
                },
                required: ["component_id", "formula_or_value"]
              },
            },
          },
        },
        responses: { 200: { description: "Component added to template successfully" } },
      },
    },
    "/api/payroll-master/templates/{template_id}/composition/{composition_id}": {
      put: {
        summary: "Update Template Component",
        description: "Update a component in a template (change formula/value).",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "template_id", in: "path", required: true, schema: { type: "integer" }, description: "Template ID from salary_structure_templates table" },
          { name: "composition_id", in: "path", required: true, schema: { type: "integer" }, description: "Composition ID from structure_composition table" }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  formula_or_value: { type: "string", description: "Formula or fixed value (e.g., '45%', '60000')", example: "45%" }
                },
                required: ["formula_or_value"]
              },
            },
          },
        },
        responses: { 200: { description: "Template component updated successfully" } },
      },
      delete: {
        summary: "Remove Component",
        description: "Remove a component from a template.",
        tags: ["Payroll - Master Data"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "template_id", in: "path", required: true, schema: { type: "integer" } },
          { name: "composition_id", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: { 200: { description: "Component removed from template" } },
      },
    },

    // ============ HOLIDAYS ============
    "/api/holidays": {
      get: {
        summary: "Get All Holidays",
        tags: ["🎉 Holidays"],
        responses: {
          200: { description: "List of holidays" },
        },
      },
    },
    "/api/holidays/upcoming": {
      get: {
        summary: "Get Upcoming Holidays",
        tags: ["🎉 Holidays"],
        responses: {
          200: { description: "Upcoming holidays" },
        },
      },
    },

    // ============ ANNOUNCEMENTS ============
    "/api/announcements": {
      get: {
        summary: "Get Announcements",
        tags: ["📢 Announcements"],
        responses: {
          200: { description: "List of announcements" },
        },
      },
      post: {
        summary: "Create Announcement (Admin)",
        tags: ["📢 Announcements"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "body"],
                properties: {
                  title: { type: "string", example: "Company Holiday Notice" },
                  body: {
                    type: "string",
                    example: "Office will be closed on Dec 25th for Christmas",
                  },
                  starts_at: {
                    type: "string",
                    format: "date-time",
                    example: "2025-12-23T00:00:00Z",
                  },
                  ends_at: {
                    type: "string",
                    format: "date-time",
                    example: "2025-12-26T23:59:59Z",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Announcement created" },
        },
      },
    },

    // ============ SUPPORT ============
    "/api/support": {
      get: {
        summary: "Get All Tickets",
        tags: ["🎫 Support"],
        responses: {
          200: { description: "Support tickets" },
        },
      },
      post: {
        summary: "Create Support Ticket",
        tags: ["🎫 Support"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["subject", "message"],
                properties: {
                  subject: {
                    type: "string",
                    example: "Unable to access payroll",
                  },
                  message: {
                    type: "string",
                    example:
                      "I am getting an error when trying to view my payslip for December 2025",
                  },
                  priority: {
                    type: "string",
                    enum: ["Low", "Medium", "High", "Critical"],
                    default: "Medium",
                    example: "High",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Ticket created",
            content: {
              "application/json": { example: { success: true, ticket_id: 15 } },
            },
          },
        },
      },
    },
    "/api/support/my": {
      get: {
        summary: "Get My Tickets",
        tags: ["🎫 Support"],
        responses: {
          200: { description: "My tickets" },
        },
      },
    },

    // ============ BIRTHDAYS ============
    "/api/birthdays": {
      get: {
        summary: "Get Today's Birthdays",
        tags: ["🎂 Birthdays"],
        responses: {
          200: { description: "Today's birthdays" },
        },
      },
    },
    "/api/birthdays/wishes": {
      post: {
        summary: "Send Birthday Wish",
        tags: ["🎂 Birthdays"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["employee_id", "message"],
                properties: {
                  employee_id: { type: "integer", example: 5 },
                  message: {
                    type: "string",
                    example:
                      "Happy Birthday! Wishing you a wonderful year ahead!",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Wish sent",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Birthday wish sent successfully",
                },
              },
            },
          },
        },
      },
    },

    // ============ NOTIFICATIONS ============
    "/api/notifications": {
      get: {
        summary: "Get My Notifications",
        tags: ["🔔 Notifications"],
        responses: {
          200: { description: "Notifications" },
        },
      },
    },
    "/api/notifications/mark-read/{id}": {
      post: {
        summary: "Mark Notification as Read",
        tags: ["🔔 Notifications"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Notification ID",
          },
        ],
        responses: {
          200: { description: "Notification marked as read" },
        },
      },
    },
    "/api/notifications/unread/count": {
      get: {
        summary: "Get Unread Count",
        tags: ["🔔 Notifications"],
        responses: {
          200: { description: "Unread notification count" },
        },
      },
    },

    // ============ CANDIDATES & PRE-ONBOARDING ============
    "/api/candidates": {
      get: {
        summary: "Get All Candidates",
        description:
          "Retrieve list of all candidates with optional filters (status, joining date, department)",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "offered",
                "offer_accepted",
                "offer_declined",
                "documents_pending",
                "bgv_initiated",
                "bgv_completed",
                "ready_to_join",
                "joined",
                "dropped_out",
              ],
            },
            description: "Filter by candidate status",
          },
          {
            name: "joining_date_from",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Filter by joining date from",
          },
          {
            name: "joining_date_to",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Filter by joining date to",
          },
          {
            name: "department_id",
            in: "query",
            schema: { type: "integer" },
            description: "Filter by department",
          },
        ],
        responses: {
          200: {
            description:
              "List of candidates with department, designation, and location details",
            content: {
              "application/json": {
                example: [
                  {
                    id: 1,
                    candidate_id: "CAN001",
                    full_name: "Alice Johnson",
                    email: "alice@example.com",
                    position: "Software Engineer",
                    status: "offer_accepted",
                    joining_date: "2024-03-01",
                    department_name: "Engineering",
                    designation_name: "Senior Developer",
                  },
                ],
              },
            },
          },
          401: { description: "Unauthorized - HR access required" },
        },
      },
      post: {
        summary: "Create Candidate",
        description:
          "Add new candidate to the pre-onboarding pipeline (HR only)",
        tags: ["🎯 Candidates & Pre-onboarding"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["first_name", "last_name", "email", "position"],
                properties: {
                  first_name: { type: "string", example: "Alice" },
                  middle_name: { type: "string", example: "" },
                  last_name: { type: "string", example: "Johnson" },
                  full_name: {
                    type: "string",
                    example: "Alice Johnson",
                    description: "Auto-generated if not provided",
                  },
                  email: {
                    type: "string",
                    format: "email",
                    example: "alice@example.com",
                  },
                  phone: { type: "string", example: "1234567890" },
                  alternate_phone: { type: "string", example: "0987654321" },
                  date_of_birth: {
                    type: "string",
                    format: "date",
                    example: "1995-05-15",
                  },
                  gender: {
                    type: "string",
                    enum: ["Male", "Female", "Other"],
                    example: "Female",
                  },
                  position: { type: "string", example: "Software Engineer" },
                  designation_id: { type: "integer", example: 5 },
                  department_id: { type: "integer", example: 2 },
                  location_id: { type: "integer", example: 1 },
                  offered_ctc: { type: "number", example: 800000 },
                  joining_date: {
                    type: "string",
                    format: "date",
                    example: "2024-03-01",
                  },
                  reporting_manager_id: { type: "integer", example: 10 },
                  recruiter_name: { type: "string", example: "John HR" },
                  recruitment_source: { type: "string", example: "LinkedIn" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Candidate created successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  candidate_id: 1,
                  message: "Candidate created successfully",
                },
              },
            },
          },
          401: { description: "Unauthorized - HR access required" },
        },
      },
    },
    "/api/candidates/{id}": {
      get: {
        summary: "Get Candidate Details",
        description:
          "Retrieve comprehensive candidate details including documents, task progress, and completion percentage",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Candidate ID",
          },
        ],
        responses: {
          200: {
            description: "Complete candidate information",
            content: {
              "application/json": {
                example: {
                  candidate: {
                    id: 1,
                    candidate_id: "CAN001",
                    full_name: "Alice Johnson",
                    email: "alice@example.com",
                    status: "offer_accepted",
                    joining_date: "2024-03-01",
                    offered_ctc: 800000,
                    bgv_status: "not_started",
                    documents_submitted: 1,
                    documents_verified: 0,
                  },
                  documents: [
                    {
                      id: 1,
                      document_type: "resume",
                      document_name: "resume.pdf",
                      verified: 0,
                      uploaded_date: "2024-01-15",
                    },
                  ],
                  tasks: [
                    {
                      id: 1,
                      task_name: "Upload Photo",
                      status: "completed",
                      completed_date: "2024-01-16",
                    },
                    {
                      id: 2,
                      task_name: "Upload Resume",
                      status: "in_progress",
                    },
                  ],
                  completion_percentage: "50.00",
                },
              },
            },
          },
          404: { description: "Candidate not found" },
        },
      },
      put: {
        summary: "Update Candidate",
        description: "Update candidate information (HR only)",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                phone: "9876543210",
                joining_date: "2024-03-15",
                status: "ready_to_join",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Candidate updated",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Candidate updated successfully",
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/send-offer": {
      post: {
        summary: "Send Offer Letter",
        description: "Mark offer letter as sent to candidate (HR only)",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Offer sent",
            content: {
              "application/json": {
                example: { success: true, message: "Offer letter sent" },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/accept-offer": {
      post: {
        summary: "Accept Offer (Candidate Action)",
        description:
          "Candidate accepts the offer. Auto-assigns all pre-onboarding tasks with auto_assign=1. No authentication required - can be called from candidate portal.",
        tags: ["🎯 Candidates & Pre-onboarding"],
        security: [],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Offer accepted and tasks assigned",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Offer accepted, pre-onboarding tasks assigned",
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/decline-offer": {
      post: {
        summary: "Decline Offer (Candidate Action)",
        description:
          "Candidate declines the offer. No authentication required.",
        tags: ["🎯 Candidates & Pre-onboarding"],
        security: [],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason"],
                properties: {
                  reason: { type: "string", example: "Accepted another offer" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Offer declined",
            content: {
              "application/json": {
                example: { success: true, message: "Offer declined" },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/documents": {
      post: {
        summary: "Upload Candidate Document",
        description:
          "Upload document for candidate verification (photo, resume, id_proof, address_proof, education_certificate, etc.)",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "document_type"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "Document file",
                  },
                  document_type: {
                    type: "string",
                    enum: [
                      "photo",
                      "resume",
                      "offer_letter",
                      "id_proof",
                      "address_proof",
                      "pan_card",
                      "aadhar_card",
                      "education_certificate",
                      "experience_certificate",
                      "relieving_letter",
                      "salary_slip",
                      "bank_passbook",
                      "cancelled_cheque",
                      "other",
                    ],
                    example: "resume",
                  },
                  required: {
                    type: "integer",
                    enum: [0, 1],
                    example: 1,
                    description: "Is this document mandatory?",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Document uploaded",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Document uploaded successfully",
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/documents/{docId}/verify": {
      put: {
        summary: "Verify Document (HR)",
        description: "HR verifies submitted candidate document",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "docId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  remarks: {
                    type: "string",
                    example: "Document verified successfully",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Document verified",
            content: {
              "application/json": {
                example: { success: true, message: "Document verified" },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/bgv/initiate": {
      post: {
        summary: "Initiate Background Verification (HR)",
        description: "Start BGV process for candidate",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "BGV initiated",
            content: {
              "application/json": {
                example: { success: true, message: "BGV initiated" },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/bgv/status": {
      put: {
        summary: "Update BGV Status (HR)",
        description:
          "Update background verification status (not_started, initiated, in_progress, completed, failed)",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bgv_status"],
                properties: {
                  bgv_status: {
                    type: "string",
                    enum: [
                      "not_started",
                      "initiated",
                      "in_progress",
                      "completed",
                      "failed",
                    ],
                    example: "completed",
                  },
                  remarks: {
                    type: "string",
                    example: "All checks passed successfully",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "BGV status updated",
            content: {
              "application/json": {
                example: { success: true, message: "BGV status updated" },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/convert-to-employee": {
      post: {
        summary: "Convert Candidate to Employee (HR)",
        description:
          "Convert candidate to employee after completing pre-onboarding. Auto-creates employee record, user account (password: welcome123), and assigns onboarding steps.",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  employee_number: {
                    type: "string",
                    example: "EMP12345",
                    description: "Optional - auto-generated if not provided",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Candidate converted successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  employee_id: 100,
                  message: "Candidate converted to employee successfully",
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/stats/dashboard": {
      get: {
        summary: "Candidate Dashboard Statistics (HR)",
        description: "Get statistics for candidate pipeline (last 6 months)",
        tags: ["🎯 Candidates & Pre-onboarding"],
        responses: {
          200: {
            description: "Dashboard statistics",
            content: {
              "application/json": {
                example: {
                  total_candidates: 50,
                  offered: 15,
                  offer_accepted: 20,
                  in_bgv: 10,
                  ready_to_join: 3,
                  joined: 2,
                  declined_dropped: 0,
                },
              },
            },
          },
        },
      },
    },

    // ============ PRE-ONBOARDING TASKS ============
    "/api/preonboarding/tasks": {
      get: {
        summary: "Get Pre-onboarding Task Templates",
        description:
          "Retrieve all pre-onboarding task templates ordered by task_order",
        tags: ["🎯 Candidates & Pre-onboarding"],
        responses: {
          200: {
            description: "List of task templates",
            content: {
              "application/json": {
                example: [
                  {
                    id: 1,
                    task_name: "Upload Photo",
                    description: "Upload passport size photograph",
                    task_category: "document_submission",
                    is_mandatory: 1,
                    task_order: 1,
                    auto_assign: 1,
                    assigned_to_role: "candidate",
                  },
                ],
              },
            },
          },
        },
      },
      post: {
        summary: "Create Pre-onboarding Task Template (HR)",
        description: "Create new pre-onboarding task template",
        tags: ["🎯 Candidates & Pre-onboarding"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["task_name", "task_category"],
                properties: {
                  task_name: { type: "string", example: "Upload Passport" },
                  description: {
                    type: "string",
                    example: "Upload passport copy for international travel",
                  },
                  task_category: {
                    type: "string",
                    enum: [
                      "document_submission",
                      "form_filling",
                      "verification",
                      "system_setup",
                      "other",
                    ],
                    example: "document_submission",
                  },
                  is_mandatory: { type: "integer", enum: [0, 1], example: 0 },
                  task_order: { type: "integer", example: 20 },
                  auto_assign: {
                    type: "integer",
                    enum: [0, 1],
                    example: 1,
                    description: "Auto-assign when offer is accepted?",
                  },
                  assigned_to_role: {
                    type: "string",
                    enum: ["candidate", "hr", "manager", "admin"],
                    example: "candidate",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Task created",
            content: {
              "application/json": {
                example: {
                  success: true,
                  task_id: 10,
                  message: "Pre-onboarding task created",
                },
              },
            },
          },
        },
      },
    },
    "/api/preonboarding/tasks/{id}": {
      put: {
        summary: "Update Task Template (HR)",
        description: "Update pre-onboarding task template",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                task_name: "Upload Passport (Updated)",
                is_mandatory: 1,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Task updated",
            content: {
              "application/json": {
                example: { success: true, message: "Task template updated" },
              },
            },
          },
        },
      },
      delete: {
        summary: "Delete Task Template (Admin)",
        description: "Delete pre-onboarding task template",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Task deleted",
            content: {
              "application/json": {
                example: { success: true, message: "Task template deleted" },
              },
            },
          },
        },
      },
    },
    "/api/preonboarding/assign/{candidateId}": {
      post: {
        summary: "Assign Tasks to Candidate (HR)",
        description:
          "Assign specific pre-onboarding tasks to a candidate. If task_ids is empty, assigns all auto-assign tasks.",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "candidateId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  task_ids: {
                    type: "array",
                    items: { type: "integer" },
                    example: [1, 2, 3],
                    description:
                      "Array of task IDs to assign. Leave empty to assign all auto-assign tasks.",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Tasks assigned",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Tasks assigned to candidate",
                },
              },
            },
          },
        },
      },
    },
    "/api/preonboarding/progress/{candidateId}": {
      get: {
        summary: "Get Candidate Task Progress",
        description:
          "Retrieve candidate's pre-onboarding task progress with completion statistics",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "candidateId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Task progress with statistics",
            content: {
              "application/json": {
                example: {
                  tasks: [
                    {
                      id: 1,
                      task_name: "Upload Photo",
                      description: "Upload passport size photograph",
                      task_category: "document_submission",
                      is_mandatory: 1,
                      status: "completed",
                      assigned_date: "2024-01-15",
                      completed_date: "2024-01-16",
                    },
                    {
                      id: 2,
                      task_name: "Upload Resume",
                      status: "in_progress",
                    },
                  ],
                  stats: {
                    total: 10,
                    completed: 6,
                    pending: 4,
                    completion_percentage: "60.00",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/preonboarding/progress/{progressId}": {
      put: {
        summary: "Update Task Progress",
        description:
          "Update specific task progress status (not_started, in_progress, completed, blocked, skipped)",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "progressId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: [
                      "not_started",
                      "in_progress",
                      "completed",
                      "blocked",
                      "skipped",
                    ],
                    example: "completed",
                  },
                  remarks: {
                    type: "string",
                    example: "Document uploaded successfully",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Progress updated",
            content: {
              "application/json": {
                example: { success: true, message: "Task progress updated" },
              },
            },
          },
        },
      },
    },
    "/api/preonboarding/tasks/setup-defaults": {
      post: {
        summary: "🔥 Setup Default Pre-onboarding Tasks (Admin - Run Once)",
        description:
          "One-time setup to create 15 default pre-onboarding tasks including document submissions, form filling, and verification steps. Run this first before creating candidates!",
        tags: ["🎯 Candidates & Pre-onboarding"],
        responses: {
          200: {
            description: "Default tasks created",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "15 default pre-onboarding tasks created",
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/start-preonboarding": {
      post: {
        summary: "▶️ Start Pre-onboarding for Candidate",
        description:
          "HR/Executive starts pre-onboarding process. Displays candidate details with email and mobile. Status changes to 'documents_pending'.",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Candidate ID",
          },
        ],
        responses: {
          200: {
            description: "Pre-onboarding started",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Pre-onboarding started",
                  candidate: {
                    id: 1,
                    candidate_id: "CAN1735000001",
                    first_name: "John",
                    last_name: "Doe",
                    email: "john.doe@example.com",
                    phone: "9876543210",
                    status: "documents_pending",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/create-offer": {
      post: {
        summary:
          "📝 Create Offer (4 Workflows: Job → Compensation → Offer → Preview)",
        description:
          "Create/update offer details with 4-step workflow: Job Details, Compensation, Offer Details, Preview",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  position: { type: "string", example: "Software Engineer" },
                  designation_id: { type: "integer", example: 1 },
                  department_id: { type: "integer", example: 2 },
                  location_id: { type: "integer", example: 1 },
                  reporting_manager_id: { type: "integer", example: 5 },
                  joining_date: {
                    type: "string",
                    format: "date",
                    example: "2025-02-01",
                  },
                  offered_ctc: { type: "number", example: 800000 },
                  annual_salary: { type: "number", example: 800000 },
                  salary_breakup: {
                    type: "object",
                    example: { basic: 400000, hra: 200000, special: 200000 },
                  },
                  offer_validity_date: {
                    type: "string",
                    format: "date",
                    example: "2025-01-15",
                  },
                  probation_period: {
                    type: "integer",
                    example: 3,
                    description: "Months",
                  },
                  notice_period: {
                    type: "integer",
                    example: 2,
                    description: "Months",
                  },
                  work_mode: {
                    type: "string",
                    enum: ["Office", "WFH", "Hybrid", "Remote"],
                    example: "Hybrid",
                  },
                  special_terms: {
                    type: "string",
                    example: "Relocation assistance provided",
                  },
                  benefits: {
                    type: "string",
                    example: "Health insurance, meal coupons",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Offer details saved",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Offer details saved. Ready to preview and send.",
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/preview-send-offer": {
      post: {
        summary: "📧 Preview and Send Offer Letter",
        description:
          "Send offer letter to candidate via email with unique token link for approval/rejection",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Offer letter sent",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Offer letter sent to candidate email",
                  preview: {
                    candidate: {
                      id: 1,
                      full_name: "John Doe",
                      email: "john.doe@example.com",
                      position: "Software Engineer",
                      offered_ctc: 800000,
                      joining_date: "2025-02-01",
                    },
                    offer_details: {
                      annual_salary: 800000,
                      offer_validity_date: "2025-01-15",
                      work_mode: "Hybrid",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/view-offer/{token}": {
      get: {
        summary: "👁️ View Offer (Candidate Portal - No Auth)",
        description:
          "Candidate views offer letter using token link from email. Public access - no authentication required.",
        tags: ["🎯 Candidates & Pre-onboarding"],
        security: [],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Candidate ID token from email",
          },
        ],
        responses: {
          200: {
            description: "Offer details",
            content: {
              "application/json": {
                example: {
                  candidate: {
                    id: 1,
                    full_name: "John Doe",
                    email: "john.doe@example.com",
                    phone: "9876543210",
                    position: "Software Engineer",
                    department_name: "Engineering",
                    location_name: "Mumbai",
                    offered_ctc: 800000,
                    joining_date: "2025-02-01",
                    status: "offered",
                  },
                  offer_details: {
                    annual_salary: 800000,
                    offer_validity_date: "2025-01-15",
                    probation_period: 3,
                    work_mode: "Hybrid",
                  },
                  status: "offered",
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/approve-offer/{token}": {
      post: {
        summary: "✅ Approve Offer (Candidate Action - No Auth)",
        description:
          "Candidate approves/accepts offer. Auto-assigns pre-onboarding tasks. Status changes to 'offer_accepted'.",
        tags: ["🎯 Candidates & Pre-onboarding"],
        security: [],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Offer approved",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message:
                    "Offer approved successfully! Pre-onboarding tasks assigned.",
                  status: "Approved",
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/reject-offer/{token}": {
      post: {
        summary: "❌ Reject Offer (Candidate Action - No Auth)",
        description:
          "Candidate rejects/declines offer. Status changes to 'offer_declined'.",
        tags: ["🎯 Candidates & Pre-onboarding"],
        security: [],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: {
                    type: "string",
                    example: "Found another opportunity",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Offer rejected",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Offer rejected. Thank you for your time.",
                  status: "Rejected",
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/update-status": {
      post: {
        summary: "🔄 Update Candidate Status",
        description:
          "Update candidate status: offered, offer_accepted, offer_declined, documents_pending, bgv_initiated, bgv_completed, ready_to_join, joined, dropped_out",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: [
                      "offered",
                      "offer_accepted",
                      "offer_declined",
                      "documents_pending",
                      "bgv_initiated",
                      "bgv_completed",
                      "ready_to_join",
                      "joined",
                      "dropped_out",
                    ],
                    example: "bgv_completed",
                  },
                  remarks: {
                    type: "string",
                    example: "Background verification cleared",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Status updated",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Candidate status updated to bgv_completed",
                  status: "bgv_completed",
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/hire-as-employee": {
      post: {
        summary: "🎉 Hire as Employee (Ready to Join)",
        description:
          "Mark candidate as 'Ready to Join' after document verification. Prepares for onboarding on joining date.",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Candidate ready to join",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message:
                    "Candidate marked as 'Ready to Join'. Onboarding can now be initiated.",
                  next_step: "Convert to employee on joining date",
                },
              },
            },
          },
          400: {
            description: "Pending document verification",
            content: {
              "application/json": {
                example: {
                  error: "Cannot hire: Pending document verification",
                  pending_documents: 3,
                },
              },
            },
          },
        },
      },
    },
    "/api/candidates/{id}/put-on-hold": {
      post: {
        summary: "⏸️ Put Candidate on Hold",
        description: "Temporarily pause candidate process with reason",
        tags: ["🎯 Candidates & Pre-onboarding"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: {
                    type: "string",
                    example: "Delayed joining date - will resume next month",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Candidate on hold",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Candidate put on hold",
                  action: "Manual follow-up required",
                },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = swaggerSpec;

// Auto-merge any partial Swagger fragments placed in this folder.
// Files should export an object with optional `paths` and `components` properties.
try {
  const fs = require('fs');
  const path = require('path');
  const files = fs.readdirSync(__dirname);
  files.forEach((f) => {
    if (!f.endsWith('.partial.spec.js')) return;
    try {
      const partial = require(path.join(__dirname, f));
      if (!partial || typeof partial !== 'object') return;

      if (partial.paths && typeof partial.paths === 'object') {
        Object.assign(swaggerSpec.paths, partial.paths);
      }

      if (partial.components && typeof partial.components === 'object') {
        swaggerSpec.components = swaggerSpec.components || {};
        Object.keys(partial.components).forEach((compKey) => {
          swaggerSpec.components[compKey] = swaggerSpec.components[compKey] || {};
          Object.assign(swaggerSpec.components[compKey], partial.components[compKey]);
        });
      }
    } catch (e) {
      // ignore errors loading a single partial so other partials still load
      console.warn('Warning: failed to load swagger partial', f, e && e.message);
    }
  });
} catch (e) {
  // Ignore environment where filesystem is not available
}

// Ensure a top-level `Payroll` tag exists and assign it to payroll-related paths
// try {
//   swaggerSpec.tags = swaggerSpec.tags || [];
//   if (!swaggerSpec.tags.find(t => t.name === 'Payroll')) {
//     swaggerSpec.tags.push({ name: 'Payroll', description: 'Payroll and payslips APIs (v2 and legacy)' });
//   }

//   Object.keys(swaggerSpec.paths || {}).forEach((p) => {
//     if (p.includes('/payroll') || p.includes('/payslips') || p.includes('/payslip')) {
//       const ops = swaggerSpec.paths[p];
//       Object.keys(ops).forEach((m) => {
//         ops[m].tags = ops[m].tags || [];
//         // Only add Payroll tag to process endpoints, not Payroll Master endpoints
//         if (
//           !ops[m].tags.includes('Payroll') &&
//           !ops[m].tags.includes('Payroll Master') &&
//           !ops[m].tags.includes('📊 Reports') &&
//           !ops[m].tags.includes('📤 Upload')
//         ) {
//           ops[m].tags.unshift('Payroll');
//         }
//       });
//     }
//   });
// } catch (e) {
//   // ignore
// }

Object.assign(swaggerSpec.paths, {
  // ============================================
  // PROJECT MANAGEMENT APIs
  // ============================================
  "/api/projects": {
    get: {
      summary: "📋 List All Projects",
      description: "Get all projects with filters for status and client name",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["active", "on_hold", "completed", "cancelled"],
          },
        },
        { name: "client_name", in: "query", schema: { type: "string" } },
      ],
      responses: { 200: { description: "List of projects" } },
    },
    post: {
      summary: "➕ Create New Project",
      description: "Create a new project (HR/Admin only)",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "project_code",
                "project_name",
                "client_name",
                "start_date",
              ],
              properties: {
                project_code: { type: "string", example: "PRJ-2024-001" },
                project_name: {
                  type: "string",
                  example: "Customer Portal Development",
                },
                client_name: { type: "string", example: "ABC Corporation" },
                start_date: {
                  type: "string",
                  format: "date",
                  example: "2024-02-01",
                },
                end_date: {
                  type: "string",
                  format: "date",
                  example: "2024-08-31",
                },
                status: {
                  type: "string",
                  enum: ["active", "completed", "on_hold", "cancelled"],
                  example: "active",
                },
                description: {
                  type: "string",
                  example:
                    "Development of customer self-service portal with advanced features",
                },
                manager_id: { type: "integer", example: 1 },
              },
            },
            example: {
              project_code: "PRJ-2024-001",
              project_name: "Customer Portal Development",
              client_name: "ABC Corporation",
              start_date: "2024-02-01",
              end_date: "2024-08-31",
              status: "active",
              description:
                "Development of customer self-service portal with advanced features",
              manager_id: 1,
            },
          },
        },
      },
      responses: { 200: { description: "Project created successfully" } },
    },
  },
  "/api/projects/{id}": {
    get: {
      summary: "🔍 Get Project Details",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      responses: { 200: { description: "Project details" } },
    },
    put: {
      summary: "✏️ Update Project",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                project_code: { type: "string", example: "PRJ-2024-001" },
                project_name: {
                  type: "string",
                  example: "Customer Portal Development",
                },
                client_name: { type: "string", example: "ABC Corporation" },
                start_date: {
                  type: "string",
                  format: "date",
                  example: "2024-02-01",
                },
                end_date: {
                  type: "string",
                  format: "date",
                  example: "2024-08-31",
                },
                status: {
                  type: "string",
                  enum: ["active", "completed", "on_hold", "cancelled"],
                  example: "on_hold",
                },
                description: {
                  type: "string",
                  example: "Updated project description",
                },
                manager_id: { type: "integer", example: 1 },
              },
            },
            example: {
              status: "on_hold",
              description: "Project temporarily on hold due to client request",
            },
          },
        },
      },
      responses: { 200: { description: "Project updated" } },
    },
    delete: {
      summary: "🗑️ Close Project",
      description:
        "Mark project as completed (soft delete). Admin and HR can delete projects",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "Project ID",
        },
      ],
      responses: {
        200: {
          description: "Project marked as completed",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Project marked as completed",
                  },
                },
              },
            },
          },
        },
        404: {
          description: "Project not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: { type: "string", example: "Project not found" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/projects/{id}/shifts": {
    get: {
      summary: "⏰ Get Project Shifts",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      responses: { 200: { description: "List of shifts" } },
    },
    post: {
      summary: "➕ Add Shift",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "Project ID",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "shift_type",
                "shift_name",
                "start_time",
                "end_time",
                "timezone",
              ],
              properties: {
                shift_type: {
                  type: "string",
                  enum: ["day", "night", "flexible"],
                  example: "day",
                },
                shift_name: { type: "string", example: "Morning Shift" },
                start_time: {
                  type: "string",
                  pattern: "^([01]\\d|2[0-3]):([0-5]\\d):([0-5]\\d)$",
                  example: "09:00:00",
                },
                end_time: {
                  type: "string",
                  pattern: "^([01]\\d|2[0-3]):([0-5]\\d):([0-5]\\d)$",
                  example: "18:00:00",
                },
                timezone: { type: "string", example: "UTC" },
              },
            },
            example: {
              shift_type: "day",
              shift_name: "Morning Shift",
              start_time: "09:00:00",
              end_time: "18:00:00",
              timezone: "UTC",
            },
          },
        },
      },
      responses: { 200: { description: "Shift added" } },
    },
  },
  "/api/projects/shifts/{shiftId}": {
    put: {
      summary: "✏️ Update Shift",
      description: "Update an existing project shift (HR/Admin only)",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "shiftId",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "Shift ID",
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                shift_type: {
                  type: "string",
                  enum: ["day", "night", "flexible"],
                  example: "night",
                },
                shift_name: { type: "string", example: "Night Shift" },
                start_time: { type: "string", example: "21:00:00" },
                end_time: { type: "string", example: "06:00:00" },
                timezone: { type: "string", example: "UTC" },
                is_active: { type: "boolean", example: true },
              },
            },
            example: {
              shift_name: "Night Shift",
              start_time: "21:00:00",
              end_time: "06:00:00",
              is_active: true,
            },
          },
        },
      },
      responses: {
        200: {
          description: "Shift updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Shift updated successfully",
                  },
                },
              },
            },
          },
        },
        400: { description: "Bad request" },
        404: { description: "Shift not found" },
      },
    },
    delete: {
      summary: "🗑️ Delete Shift",
      description:
        "Delete a project shift. Cannot delete if shift is assigned to active employees (HR/Admin only)",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "shiftId",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "Shift ID to delete",
        },
      ],
      responses: {
        200: {
          description: "Shift deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Shift deleted successfully",
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Cannot delete shift - assigned to active employees",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: false },
                  message: {
                    type: "string",
                    example:
                      "Cannot delete shift. It is assigned to active employees.",
                  },
                },
              },
            },
          },
        },
        404: { description: "Shift not found" },
      },
    },
  },
  "/api/projects/{id}/assignments": {
    get: {
      summary: "👥 Get Project Team",
      description:
        "Get employees assigned to a project. Returns only active assignments by default. Use status query parameter to get all or specific status.",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "Project ID",
        },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["active", "completed", "on_hold"] },
          description: "Filter by assignment status (defaults to 'active')",
        },
      ],
      responses: { 200: { description: "Team assignments" } },
    },
    post: {
      summary: "➕ Assign Employee",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "Project ID",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "employee_id",
                "role_in_project",
                "allocation_percentage",
                "assignment_start_date",
              ],
              properties: {
                employee_id: { type: "integer", example: 5 },
                role_in_project: {
                  type: "string",
                  example: "Full Stack Developer",
                },
                allocation_percentage: {
                  type: "integer",
                  minimum: 0,
                  maximum: 100,
                  example: 100,
                },
                shift_id: { type: "integer", nullable: true, example: 1 },
                assignment_start_date: {
                  type: "string",
                  format: "date",
                  example: "2024-02-01",
                },
                assignment_end_date: {
                  type: "string",
                  format: "date",
                  nullable: true,
                  example: "2024-08-31",
                },
              },
            },
            example: {
              employee_id: 5,
              role_in_project: "Full Stack Developer",
              allocation_percentage: 100,
              shift_id: 1,
              assignment_start_date: "2024-02-01",
              assignment_end_date: "2024-08-31",
            },
          },
        },
      },
      responses: { 200: { description: "Employee assigned" } },
    },
  },
  "/api/projects/assignments/{assignmentId}": {
    put: {
      summary: "✏️ Update Assignment",
      description: "Update employee assignment details (HR/Admin only)",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "assignmentId",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "Assignment ID",
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                role_in_project: {
                  type: "string",
                  example: "Senior Full Stack Developer",
                },
                allocation_percentage: {
                  type: "integer",
                  minimum: 0,
                  maximum: 100,
                  example: 80,
                },
                shift_id: { type: "integer", nullable: true, example: 2 },
                assignment_start_date: {
                  type: "string",
                  format: "date",
                  example: "2024-02-01",
                },
                assignment_end_date: {
                  type: "string",
                  format: "date",
                  nullable: true,
                  example: "2024-09-30",
                },
                status: {
                  type: "string",
                  enum: ["active", "completed", "on_hold"],
                  example: "active",
                },
              },
            },
            example: {
              role_in_project: "Senior Full Stack Developer",
              allocation_percentage: 80,
              shift_id: 2,
              assignment_end_date: "2024-09-30",
            },
          },
        },
      },
      responses: {
        200: {
          description: "Assignment updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Assignment updated successfully",
                  },
                },
              },
            },
          },
        },
        404: { description: "Assignment not found" },
      },
    },
    delete: {
      summary: "🗑️ Remove Employee",
      description:
        "Remove employee from project (marks assignment as completed). HR/Admin only",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "assignmentId",
          in: "path",
          required: true,
          schema: { type: "integer" },
          description: "Assignment ID",
        },
      ],
      responses: {
        200: {
          description: "Employee removed from project",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Employee removed from project",
                  },
                },
              },
            },
          },
        },
        404: { description: "Assignment not found" },
      },
    },
  },
  "/api/projects/employee/{employeeId}/projects": {
    get: {
      summary: "📋 Get Employee Projects",
      tags: ["🚀 Projects"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "employeeId",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: { 200: { description: "Employee's projects" } },
    },
  },

  // ASSET MANAGEMENT APIs
  "/api/assets": {
    get: {
      summary: "📦 List Assets",
      tags: ["💼 Assets"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "status", in: "query", schema: { type: "string" } },
        { name: "asset_type", in: "query", schema: { type: "string" } },
      ],
      responses: { 200: { description: "Asset list" } },
    },
  },
  "/api/assets/allocate": {
    post: {
      summary: "➕ Allocate Asset",
      tags: ["💼 Assets"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "employee_id",
                "asset_type",
                "asset_name",
                "allocated_date",
              ],
            },
          },
        },
      },
      responses: { 200: { description: "Asset allocated" } },
    },
  },
  "/api/assets/employee/{id}": {
    get: {
      summary: "👤 Employee Assets",
      tags: ["💼 Assets"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      responses: { 200: { description: "Employee assets" } },
    },
  },
  "/api/assets/{id}": {
    get: {
      summary: "🔍 Asset Details",
      tags: ["💼 Assets"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      responses: { 200: { description: "Asset details" } },
    },
  },
  "/api/assets/{id}/return": {
    put: {
      summary: "↩️ Return Asset",
      tags: ["💼 Assets"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["returned_date", "condition_at_return"],
            },
          },
        },
      },
      responses: { 200: { description: "Asset returned" } },
    },
  },
  "/api/assets/{id}/status": {
    put: {
      summary: "✏️ Update Status",
      tags: ["💼 Assets"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", required: ["status"] },
          },
        },
      },
      responses: { 200: { description: "Status updated" } },
    },
  },
  "/api/assets/reports": {
    get: {
      summary: "📊 Asset Reports",
      tags: ["💼 Assets"],
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Asset reports" } },
    },
  },

  // DASHBOARD & ANALYTICS APIs
  "/api/dashboard/admin": {
    get: {
      summary: "👑 Admin Dashboard",
      tags: ["📊 Dashboard"],
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Admin dashboard data" } },
    },
  },
  "/api/dashboard/hr": {
    get: {
      summary: "👥 HR Dashboard",
      tags: ["📊 Dashboard"],
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "HR dashboard data" } },
    },
  },
  "/api/dashboard/manager": {
    get: {
      summary: "👔 Manager Dashboard",
      tags: ["📊 Dashboard"],
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Manager dashboard" } },
    },
  },
  "/api/dashboard/employee": {
    get: {
      summary: "🧑‍💼 Employee Dashboard",
      tags: ["📊 Dashboard"],
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Employee dashboard" } },
    },
  },
  "/api/dashboard/analytics/attendance": {
    get: {
      summary: "📈 Attendance Analytics",
      tags: ["📊 Dashboard"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "start_date",
          in: "query",
          schema: { type: "string", format: "date" },
        },
        {
          name: "end_date",
          in: "query",
          schema: { type: "string", format: "date" },
        },
      ],
      responses: { 200: { description: "Attendance analytics" } },
    },
  },
  "/api/dashboard/analytics/leaves": {
    get: {
      summary: "🏖️ Leave Analytics",
      tags: ["📊 Dashboard"],
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "year", in: "query", schema: { type: "integer" } }],
      responses: { 200: { description: "Leave analytics" } },
    },
  },
  "/api/dashboard/analytics/timesheets": {
    get: {
      summary: "⏱️ Timesheet Analytics",
      tags: ["📊 Dashboard"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "month", in: "query", schema: { type: "integer" } },
        { name: "year", in: "query", schema: { type: "integer" } },
      ],
      responses: { 200: { description: "Timesheet analytics" } },
    },
  },
  "/api/dashboard/analytics/payroll": {
    get: {
      summary: "💰 Payroll Analytics",
      tags: ["📊 Dashboard"],
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "year", in: "query", schema: { type: "integer" } }],
      responses: { 200: { description: "Payroll analytics" } },
    },
  },

  // CLIENT TIMESHEET VERIFICATION APIs
  "/api/admin/timesheet/verification-queue": {
    get: {
      summary: "⏳ Verification Queue",
      tags: ["✅ Verification"],
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "status", in: "query", schema: { type: "string" } }],
      responses: { 200: { description: "Pending verifications" } },
    },
  },
  "/api/admin/timesheet/verify": {
    post: {
      summary: "✅ Verify Timesheet",
      tags: ["✅ Verification"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["workUpdateId", "verificationStatus"],
            },
          },
        },
      },
      responses: { 200: { description: "Verified successfully" } },
    },
  },
  "/api/admin/timesheet/dashboard": {
    get: {
      summary: "🚦 Compliance Dashboard",
      tags: ["✅ Verification"],
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Traffic light dashboard" } },
    },
  },
  "/api/admin/timesheet/comparison/{workUpdateId}": {
    get: {
      summary: "🔍 Compare Timesheets",
      tags: ["✅ Verification"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "workUpdateId",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: { 200: { description: "Comparison data" } },
    },
  },
  "/api/admin/timesheet/bulk-verify": {
    post: {
      summary: "✅ Bulk Verify",
      tags: ["✅ Verification"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["workUpdateIds", "verificationStatus"],
            },
          },
        },
      },
      responses: { 200: { description: "Bulk verified" } },
    },
  },
  "/api/admin/timesheet/lock-payroll-period": {
    post: {
      summary: "🔒 Lock Payroll Period",
      tags: ["✅ Verification"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", required: ["payrollPeriod"] },
          },
        },
      },
      responses: { 200: { description: "Period locked" } },
    },
  },

  // ============ COMPLIANCE TRACKING & ENFORCEMENT ============
  "/api/compliance/my-status": {
    get: {
      summary: "📊 Get My Compliance Status",
      description:
        "Get today's timesheet compliance status for logged-in employee",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Compliance status retrieved",
          content: {
            "application/json": {
              example: {
                success: true,
                compliance: {
                  date: "2026-01-05",
                  submitted: true,
                  timesheet_id: 125,
                  submission_time: "2026-01-05T14:30:00",
                  hours: 8,
                  reminder_count: 1,
                  last_reminder_sent: "2026-01-05T16:00:00",
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/compliance/my-history": {
    get: {
      summary: "📅 Get My Compliance History",
      description: "Get compliance history with optional date range filtering",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "start_date",
          in: "query",
          schema: { type: "string", format: "date" },
          example: "2026-01-01",
        },
        {
          name: "end_date",
          in: "query",
          schema: { type: "string", format: "date" },
          example: "2026-01-31",
        },
      ],
      responses: {
        200: {
          description: "Compliance history retrieved",
          content: {
            "application/json": {
              example: {
                success: true,
                history: [
                  {
                    date: "2026-01-05",
                    submitted: true,
                    hours: 8,
                    reminder_count: 1,
                  },
                  {
                    date: "2026-01-04",
                    submitted: true,
                    hours: 8,
                    reminder_count: 0,
                  },
                  {
                    date: "2026-01-03",
                    submitted: false,
                    hours: 0,
                    reminder_count: 3,
                  },
                ],
                stats: {
                  total_days: 3,
                  days_submitted: 2,
                  compliance_rate: 66.67,
                  total_hours: 16,
                  avg_hours: 5.33,
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/compliance/admin/dashboard": {
    get: {
      summary: "📊 Admin Compliance Dashboard",
      description: "Get comprehensive compliance metrics for admin dashboard",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Dashboard data retrieved",
          content: {
            "application/json": {
              example: {
                success: true,
                dashboard: {
                  today: {
                    date: "2026-01-05",
                    total_employees: 150,
                    submitted_count: 142,
                    non_compliant_count: 8,
                    compliance_rate: 94.67,
                    non_compliant_employees: [
                      {
                        id: 45,
                        name: "John Doe",
                        EmployeeNumber: "EMP001",
                        department: "Engineering",
                        reminder_count: 2,
                        last_reminder_sent: "2026-01-05T18:00:00",
                      },
                    ],
                  },
                  this_week: {
                    avg_compliance_rate: 92.5,
                    total_submitted: 950,
                    reminders_sent: 45,
                    auto_reminders: 40,
                  },
                  this_month: {
                    working_days: 3,
                    completed_days: 2,
                    avg_compliance_rate: 93.2,
                  },
                  weekly_trends: [
                    {
                      date: "2026-01-05",
                      submitted: 142,
                      total: 150,
                      rate: 94.67,
                    },
                    {
                      date: "2026-01-04",
                      submitted: 145,
                      total: 150,
                      rate: 96.67,
                    },
                  ],
                  pending_validations: {
                    count: 5,
                    items: [
                      {
                        type: "timesheet",
                        employee_name: "Jane Smith",
                        date: "2026-01-04",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/compliance/admin/non-compliant": {
    get: {
      summary: "🚨 Get Non-Compliant Employees",
      description:
        "Get list of employees who haven't submitted timesheets for a specific date",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "date",
          in: "query",
          schema: { type: "string", format: "date" },
          example: "2026-01-05",
        },
      ],
      responses: {
        200: {
          description: "Non-compliant employees list",
          content: {
            "application/json": {
              example: {
                success: true,
                date: "2026-01-05",
                count: 8,
                employees: [
                  {
                    id: 45,
                    name: "John Doe",
                    EmployeeNumber: "EMP001",
                    email: "john.doe@company.com",
                    department: "Engineering",
                    manager_name: "Jane Manager",
                    reminder_count: 2,
                    last_reminder_sent: "2026-01-05T18:00:00",
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
  "/api/compliance/admin/send-reminders": {
    post: {
      summary: "📧 Send Compliance Reminders",
      description:
        "Send reminders to specific employees or all non-compliant employees",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  format: "date",
                  description: "Date to check compliance (defaults to today)",
                },
                employee_ids: {
                  type: "array",
                  items: { type: "integer" },
                  description:
                    "Specific employee IDs (optional, sends to all if not provided)",
                },
              },
            },
            examples: {
              "Send to All": {
                value: {
                  date: "2026-01-05",
                },
              },
              "Send to Specific": {
                value: {
                  date: "2026-01-05",
                  employee_ids: [45, 67, 89],
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Reminders sent successfully",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "Reminders sent to 8 employees",
                reminders_sent: 8,
                employees: ["John Doe", "Jane Smith"],
              },
            },
          },
        },
      },
    },
  },
  "/api/compliance/admin/bulk-approve": {
    post: {
      summary: "✅ Bulk Approve Timesheets",
      description: "Approve multiple timesheets at once",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["timesheet_ids"],
              properties: {
                timesheet_ids: {
                  type: "array",
                  items: { type: "integer" },
                },
                notes: {
                  type: "string",
                  description: "Optional approval notes",
                },
              },
            },
            example: {
              timesheet_ids: [125, 126, 127, 128],
              notes: "Bulk approved for payroll processing",
            },
          },
        },
      },
      responses: {
        200: {
          description: "Timesheets approved",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "4 timesheets approved successfully",
                approved_count: 4,
                failed_count: 0,
              },
            },
          },
        },
      },
    },
  },
  "/api/compliance/admin/bulk-validate-client-timesheets": {
    post: {
      summary: "✅ Bulk Validate Client Timesheets",
      description: "Validate multiple client timesheet uploads at once",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["validations"],
              properties: {
                validations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      employee_id: { type: "integer" },
                      month: { type: "integer" },
                      year: { type: "integer" },
                      status: {
                        type: "string",
                        enum: ["approved", "rejected"],
                      },
                      notes: { type: "string" },
                    },
                  },
                },
              },
            },
            example: {
              validations: [
                {
                  employee_id: 45,
                  month: 12,
                  year: 2025,
                  status: "approved",
                  notes: "Verified with client records",
                },
                {
                  employee_id: 67,
                  month: 12,
                  year: 2025,
                  status: "approved",
                },
              ],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Client timesheets validated",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "2 client timesheets validated",
                validated_count: 2,
                failed_count: 0,
              },
            },
          },
        },
      },
    },
  },
  "/api/compliance/admin/close-month": {
    post: {
      summary: "🔒 Close Month",
      description:
        "Lock a month's timesheets to prevent further edits (for payroll processing)",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["month", "year"],
              properties: {
                month: {
                  type: "integer",
                  minimum: 1,
                  maximum: 12,
                },
                year: {
                  type: "integer",
                },
              },
            },
            example: {
              month: 12,
              year: 2025,
            },
          },
        },
      },
      responses: {
        200: {
          description: "Month closed successfully",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "December 2025 closed successfully",
                period: "2025-12",
                locked_at: "2026-01-05T10:30:00",
              },
            },
          },
        },
      },
    },
  },
  "/api/compliance/admin/reopen-month": {
    post: {
      summary: "🔓 Reopen Month",
      description: "Unlock a previously closed month with reason tracking",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["month", "year", "reason"],
              properties: {
                month: { type: "integer", minimum: 1, maximum: 12 },
                year: { type: "integer" },
                reason: { type: "string" },
              },
            },
            example: {
              month: 12,
              year: 2025,
              reason:
                "Correction needed for employee EMP045 - client verification mismatch",
            },
          },
        },
      },
      responses: {
        200: {
          description: "Month reopened",
          content: {
            "application/json": {
              example: {
                success: true,
                message: "December 2025 reopened successfully",
                period: "2025-12",
              },
            },
          },
        },
      },
    },
  },
  "/api/compliance/period-status/:month/:year": {
    get: {
      summary: "🔍 Check Period Status",
      description: "Check if a specific month is locked or open",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "month",
          in: "path",
          required: true,
          schema: { type: "integer" },
          example: 12,
        },
        {
          name: "year",
          in: "path",
          required: true,
          schema: { type: "integer" },
          example: 2025,
        },
      ],
      responses: {
        200: {
          description: "Period status",
          content: {
            "application/json": {
              example: {
                success: true,
                period: "2025-12",
                is_locked: true,
                locked_at: "2026-01-05T10:30:00",
                locked_by: "Admin User",
              },
            },
          },
        },
      },
    },
  },
  "/api/compliance/admin/monthly-report": {
    get: {
      summary: "📊 Monthly Compliance Report",
      description: "Generate comprehensive compliance report for a month",
      tags: ["🎯 Compliance"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "month",
          in: "query",
          schema: { type: "integer" },
          example: 12,
        },
        {
          name: "year",
          in: "query",
          schema: { type: "integer" },
          example: 2025,
        },
      ],
      responses: {
        200: {
          description: "Monthly report",
          content: {
            "application/json": {
              example: {
                success: true,
                report: {
                  period: "2025-12",
                  total_employees: 150,
                  working_days: 22,
                  total_submissions: 3245,
                  expected_submissions: 3300,
                  compliance_rate: 98.33,
                  department_breakdown: [
                    {
                      department: "Engineering",
                      employees: 50,
                      submissions: 1095,
                      compliance_rate: 99.5,
                    },
                    {
                      department: "Sales",
                      employees: 30,
                      submissions: 645,
                      compliance_rate: 97.7,
                    },
                  ],
                  reminders_sent: 125,
                  auto_reminders: 110,
                  manual_reminders: 15,
                  client_uploads: {
                    submitted: 148,
                    validated: 145,
                    pending: 3,
                    rejected: 0,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
