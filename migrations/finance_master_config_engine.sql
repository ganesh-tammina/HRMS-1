-- ============================================
-- FINANCE MASTER CONFIGURATION ENGINE
-- Database Schema (DDL)
-- ============================================

-- ============================================
-- 1. FOUNDATIONAL MASTERS
-- ============================================

-- Accounting Entities (Legal entities, divisions, branches)
CREATE TABLE IF NOT EXISTS accounting_entities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  entity_type ENUM('LEGAL_ENTITY', 'DIVISION', 'BRANCH', 'DEPARTMENT') DEFAULT 'LEGAL_ENTITY',
  legal_entity_id INT,
  country_code VARCHAR(5) DEFAULT 'IN',
  currency_code VARCHAR(3) DEFAULT 'INR',
  financial_year_start_month INT DEFAULT 4,
  
  -- Compliance & Regulatory
  pan_number VARCHAR(50),
  gst_registration_number VARCHAR(50),
  
  -- Status Management
  is_active TINYINT(1) DEFAULT 1,
  status ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED') DEFAULT 'ACTIVE',
  effective_from DATE NOT NULL DEFAULT CURDATE(),
  effective_to DATE,
  
  -- Audit Trail
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_entity_code (code),
  KEY idx_legal_entity (legal_entity_id),
  KEY idx_status (status, is_active),
  FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- General Ledger Accounts Master
CREATE TABLE IF NOT EXISTS gl_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accounting_entity_id INT NOT NULL,
  
  -- Account Hierarchy
  parent_id INT,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(150) NOT NULL,
  account_type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COST_OF_SALES') NOT NULL,
  
  -- Account Classification
  account_group VARCHAR(50),
  sub_group VARCHAR(50),
  
  -- GL Posting Rules
  can_post_directly TINYINT(1) DEFAULT 1,
  requires_cost_center TINYINT(1) DEFAULT 0,
  requires_profit_center TINYINT(1) DEFAULT 0,
  requires_department TINYINT(1) DEFAULT 0,
  requires_employee_id TINYINT(1) DEFAULT 0,
  
  -- Control & Status
  is_active TINYINT(1) DEFAULT 1,
  status ENUM('DRAFT', 'ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  effective_from DATE NOT NULL DEFAULT CURDATE(),
  effective_to DATE,
  
  -- Description & Notes
  description TEXT,
  notes TEXT,
  
  -- Audit Trail
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_entity_account_code (accounting_entity_id, account_code),
  KEY idx_account_type (account_type),
  KEY idx_entity_id (accounting_entity_id),
  KEY idx_parent_id (parent_id),
  KEY idx_status (status, is_active),
  FOREIGN KEY (accounting_entity_id) REFERENCES accounting_entities(id),
  FOREIGN KEY (parent_id) REFERENCES gl_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cost Centers Extended (linked to GL accounts)
CREATE TABLE IF NOT EXISTS cost_centers_extended (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accounting_entity_id INT NOT NULL,
  cost_center_id INT NOT NULL,
  
  -- Accounting Link
  profit_center_id INT,
  allocation_percentage DECIMAL(5,2) DEFAULT 100.00,
  
  -- GL Account Linking
  cost_center_gl_account_id INT,
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  effective_from DATE NOT NULL DEFAULT CURDATE(),
  effective_to DATE,
  
  -- Audit
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_entity_cc (accounting_entity_id, cost_center_id),
  KEY idx_entity_id (accounting_entity_id),
  KEY idx_cc_id (cost_center_id),
  FOREIGN KEY (accounting_entity_id) REFERENCES accounting_entities(id),
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
  FOREIGN KEY (cost_center_gl_account_id) REFERENCES gl_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profit Centers
CREATE TABLE IF NOT EXISTS profit_centers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accounting_entity_id INT NOT NULL,
  
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- GL Linking
  profit_center_gl_account_id INT,
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  effective_from DATE NOT NULL DEFAULT CURDATE(),
  effective_to DATE,
  
  -- Audit
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_entity_id (accounting_entity_id),
  KEY idx_code (code),
  KEY idx_status (status),
  FOREIGN KEY (accounting_entity_id) REFERENCES accounting_entities(id),
  FOREIGN KEY (profit_center_gl_account_id) REFERENCES gl_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. TAX & COMPLIANCE MASTERS
-- ============================================

-- Tax Master (defines tax types and their calculation methods)
CREATE TABLE IF NOT EXISTS tax_master (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accounting_entity_id INT NOT NULL,
  
  -- Tax Definition
  tax_code VARCHAR(20) NOT NULL,
  tax_name VARCHAR(100) NOT NULL,
  tax_type ENUM('PIT', 'HST', 'EST', 'ESI', 'PT', 'GST', 'TDS', 'OTHER') NOT NULL,
  
  -- Calculation Method
  calculation_mode ENUM('FIXED_AMOUNT', 'PERCENTAGE', 'SLAB_BASED', 'RULE_BASED') DEFAULT 'PERCENTAGE',
  
  -- Default Values (used if no slab/rule matches)
  default_rate DECIMAL(8,4),
  default_amount DECIMAL(12,2),
  
  -- Flags & Rules
  is_mandatory TINYINT(1) DEFAULT 1,
  is_cumulative TINYINT(1) DEFAULT 0, -- multiple tax rules apply
  rebate_applicable TINYINT(1) DEFAULT 0,
  
  -- Configuration
  min_salary_threshold DECIMAL(12,2),
  max_salary_threshold DECIMAL(12,2),
  
  -- GL Linking
  tax_liability_gl_account_id INT,
  tax_expense_gl_account_id INT,
  
  -- Status & Dates
  is_active TINYINT(1) DEFAULT 1,
  status ENUM('DRAFT', 'ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  effective_from DATE NOT NULL DEFAULT CURDATE(),
  effective_to DATE,
  
  -- Audit
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_entity_tax_code (accounting_entity_id, tax_code),
  KEY idx_entity_id (accounting_entity_id),
  KEY idx_tax_type (tax_type),
  KEY idx_status (status),
  FOREIGN KEY (accounting_entity_id) REFERENCES accounting_entities(id),
  FOREIGN KEY (tax_liability_gl_account_id) REFERENCES gl_accounts(id),
  FOREIGN KEY (tax_expense_gl_account_id) REFERENCES gl_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tax Slabs (for slab-based tax calculations)
CREATE TABLE IF NOT EXISTS tax_slabs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tax_master_id INT NOT NULL,
  
  -- Slab Definition
  slab_number INT NOT NULL,
  from_amount DECIMAL(12,2) NOT NULL,
  to_amount DECIMAL(12,2),
  fixed_amount DECIMAL(12,2),
  percentage_rate DECIMAL(8,4),
  
  -- Adjustment (rebates, surcharges)
  surcharge_percentage DECIMAL(8,4),
  rebate_amount DECIMAL(12,2),
  
  -- Conditions
  condition_description VARCHAR(255),
  condition_code VARCHAR(50), -- for rule engine
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  effective_from DATE NOT NULL DEFAULT CURDATE(),
  effective_to DATE,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_tax_slab (tax_master_id, slab_number),
  KEY idx_tax_master (tax_master_id),
  KEY idx_from_to (from_amount, to_amount),
  FOREIGN KEY (tax_master_id) REFERENCES tax_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tax Rules (advanced rule-based calculations)
CREATE TABLE IF NOT EXISTS tax_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tax_master_id INT NOT NULL,
  
  -- Rule Definition
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  rule_name VARCHAR(150) NOT NULL,
  rule_description TEXT,
  
  -- Conditions (JSON or comma-separated)
  condition_json TEXT, -- JSON format: {"attribute": "age", "operator": ">", "value": 60}
  
  -- Actions
  action_type ENUM('FIXED_DEDUCTION', 'PERCENTAGE_DEDUCTION', 'REBATE', 'SURCHARGE', 'EXEMPTION') NOT NULL,
  action_value DECIMAL(12,2),
  action_percentage DECIMAL(8,4),
  
  -- Execution
  rule_sequence INT DEFAULT 10,
  is_exclusive TINYINT(1) DEFAULT 0, -- if true, other rules don't apply
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  effective_from DATE NOT NULL DEFAULT CURDATE(),
  effective_to DATE,
  
  -- Audit
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_tax_master (tax_master_id),
  KEY idx_rule_sequence (rule_sequence),
  KEY idx_status (is_active),
  FOREIGN KEY (tax_master_id) REFERENCES tax_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. COMPLIANCE & STATUTORY MASTERS
-- ============================================

-- Statutory Configurations (ESI, PF, PT thresholds)
CREATE TABLE IF NOT EXISTS statutory_configurations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accounting_entity_id INT NOT NULL,
  
  -- Configuration Type
  statute_code VARCHAR(20) NOT NULL,
  statute_name VARCHAR(100) NOT NULL,
  statute_type ENUM('PF', 'ESI', 'PT', 'GRATUITY', 'BONUS', 'OTHER') NOT NULL,
  
  -- Parameters
  applicable_from DATE NOT NULL DEFAULT CURDATE(),
  applicable_to DATE,
  
  -- Thresholds
  minimum_monthly_wage DECIMAL(12,2),
  maximum_monthly_wage DECIMAL(12,2),
  eligibility_days INT DEFAULT 240, -- days worked for eligibility
  
  -- Calculation Parameters
  norms_parameter_json TEXT, -- JSON for flexible parameters
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_entity_statute (accounting_entity_id, statute_code),
  KEY idx_entity_id (accounting_entity_id),
  FOREIGN KEY (accounting_entity_id) REFERENCES accounting_entities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compliance Parameters (Regulatory limits & thresholds)
CREATE TABLE IF NOT EXISTS compliance_parameters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accounting_entity_id INT NOT NULL,
  
  -- Parameter Definition
  parameter_code VARCHAR(50) UNIQUE NOT NULL,
  parameter_name VARCHAR(150) NOT NULL,
  parameter_type ENUM('AMOUNT', 'PERCENTAGE', 'COUNT', 'DATE', 'TEXT') DEFAULT 'AMOUNT',
  
  -- Value
  parameter_value VARCHAR(100),
  parameter_numeric_value DECIMAL(12,2),
  parameter_date_value DATE,
  
  -- Regulatory Context
  regulation_year INT, -- Financial year
  regulation_reference VARCHAR(255),
  applicable_entity_types VARCHAR(255), -- comma-separated
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  effective_from DATE NOT NULL DEFAULT CURDATE(),
  effective_to DATE,
  
  -- Audit
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_entity_id (accounting_entity_id),
  KEY idx_param_code (parameter_code),
  KEY idx_regulation_year (regulation_year),
  FOREIGN KEY (accounting_entity_id) REFERENCES accounting_entities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. INTEGRATION BRIDGES
-- ============================================

-- Wage Component to GL Account Mapping
CREATE TABLE IF NOT EXISTS wage_component_gl_mapping (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accounting_entity_id INT NOT NULL,
  
  -- Mapping
  salary_component_id INT NOT NULL,
  gl_account_id INT NOT NULL,
  
  -- Posting Configuration
  posting_mode ENUM('CREDIT', 'DEBIT', 'BOTH') DEFAULT 'CREDIT',
  posting_sequence INT DEFAULT 10,
  
  -- Conditions for mapping (optional)
  condition_json TEXT, -- e.g., {"if_salary_structure": 5}
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  effective_from DATE NOT NULL DEFAULT CURDATE(),
  effective_to DATE,
  
  -- Audit
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_mapping (accounting_entity_id, salary_component_id, gl_account_id),
  KEY idx_entity_id (accounting_entity_id),
  KEY idx_component_id (salary_component_id),
  KEY idx_gl_account_id (gl_account_id),
  FOREIGN KEY (accounting_entity_id) REFERENCES accounting_entities(id),
  FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tax Transaction Mapping (tax rule → GL posting)
CREATE TABLE IF NOT EXISTS tax_transaction_mapping (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accounting_entity_id INT NOT NULL,
  tax_master_id INT NOT NULL,
  
  -- Transaction Details
  transaction_type ENUM('PAYROLL_DEDUCTION', 'REMITTANCE', 'REVERSAL_CORRECTION') DEFAULT 'PAYROLL_DEDUCTION',
  
  -- GL Accounts Involved
  debit_gl_account_id INT,
  credit_gl_account_id INT,
  offset_gl_account_id INT, -- for double entry
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  effective_from DATE NOT NULL DEFAULT CURDATE(),
  effective_to DATE,
  
  -- Audit
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_entity_id (accounting_entity_id),
  KEY idx_tax_master (tax_master_id),
  FOREIGN KEY (accounting_entity_id) REFERENCES accounting_entities(id),
  FOREIGN KEY (tax_master_id) REFERENCES tax_master(id),
  FOREIGN KEY (debit_gl_account_id) REFERENCES gl_accounts(id),
  FOREIGN KEY (credit_gl_account_id) REFERENCES gl_accounts(id),
  FOREIGN KEY (offset_gl_account_id) REFERENCES gl_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. AUDIT & OPERATIONAL MASTERS
-- ============================================

-- Configuration Audit Log (complete change tracking)
CREATE TABLE IF NOT EXISTS configuration_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Entity Being Changed
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  accounting_entity_id INT,
  
  -- Change Details
  operation_type ENUM('CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'INACTIVATE') NOT NULL,
  field_name VARCHAR(100),
  before_value TEXT,
  after_value TEXT,
  
  -- Metadata
  change_reason VARCHAR(500),
  change_category VARCHAR(50), -- e.g., 'TAX_UPDATE', 'GL_REORG', 'COMPLIANCE'
  approver_id INT,
  approval_required TINYINT(1) DEFAULT 0,
  approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED',
  
  -- Tracking
  changed_by INT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50),
  
  KEY idx_entity (entity_type, entity_id),
  KEY idx_entity_accounting (accounting_entity_id),
  KEY idx_operation (operation_type),
  KEY idx_changed_at (changed_at),
  KEY idx_changed_by (changed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exchange Rates (for multi-currency support)
CREATE TABLE IF NOT EXISTS forex_rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accounting_entity_id INT NOT NULL,
  
  -- Currency Pair
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  
  -- Rate
  exchange_rate DECIMAL(12,6) NOT NULL,
  
  -- Date
  rate_date DATE NOT NULL DEFAULT CURDATE(),
  
  -- Rounding
  rounding_rule VARCHAR(50), -- ROUND_UP, ROUND_DOWN, NEAREST
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  source VARCHAR(50), -- RBI, ECB, MANUAL
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_forex (accounting_entity_id, from_currency, to_currency, rate_date),
  KEY idx_entity_id (accounting_entity_id),
  KEY idx_rate_date (rate_date),
  FOREIGN KEY (accounting_entity_id) REFERENCES accounting_entities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Financial Period Closing Configuration
CREATE TABLE IF NOT EXISTS financial_period_closing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accounting_entity_id INT NOT NULL,
  
  -- Period
  financial_year INT NOT NULL,
  period_month INT NOT NULL,
  
  -- Closing Details
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  closing_status ENUM('OPEN', 'CLOSING_IN_PROGRESS', 'CLOSED', 'FINALIZED') DEFAULT 'OPEN',
  
  -- Thresholds & Flags
  allow_transactions TINYINT(1) DEFAULT 1,
  locked_date DATETIME,
  locked_by INT,
  finalized_date DATETIME,
  finalized_by INT,
  
  -- Notes
  closing_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_period (accounting_entity_id, financial_year, period_month),
  KEY idx_entity_id (accounting_entity_id),
  KEY idx_status (closing_status),
  FOREIGN KEY (accounting_entity_id) REFERENCES accounting_entities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_gl_entity_active ON gl_accounts(accounting_entity_id, is_active, status);
CREATE INDEX idx_tax_entity_active ON tax_master(accounting_entity_id, is_active, status);
CREATE INDEX idx_cost_center_entity_active ON cost_centers_extended(accounting_entity_id, is_active, status);

-- Audit log queries
CREATE INDEX idx_audit_entity_date ON configuration_audit_log(entity_type, accounting_entity_id, changed_at DESC);

-- ============================================
-- 7. VIEWS FOR BUSINESS QUERIES
-- ============================================

-- Active GL Chart of Accounts per Entity
CREATE OR REPLACE VIEW v_active_gl_accounts AS
SELECT 
  g.id,
  g.accounting_entity_id,
  ae.code as entity_code,
  g.account_code,
  g.account_name,
  g.account_type,
  g.account_group,
  g.can_post_directly,
  g.requires_cost_center,
  g.requires_profit_center,
  g.status,
  g.effective_from,
  g.effective_to
FROM gl_accounts g
INNER JOIN accounting_entities ae ON g.accounting_entity_id = ae.id
WHERE g.is_active = 1 
  AND g.status = 'ACTIVE'
  AND DATE(g.effective_from) <= CURDATE()
  AND (g.effective_to IS NULL OR DATE(g.effective_to) >= CURDATE());

-- Active Tax Masters with Combined Configuration
CREATE OR REPLACE VIEW v_active_tax_masters AS
SELECT 
  t.id,
  t.accounting_entity_id,
  ae.code as entity_code,
  t.tax_code,
  t.tax_name,
  t.tax_type,
  t.calculation_mode,
  t.default_rate,
  t.is_mandatory,
  COUNT(DISTINCT s.id) as slab_count,
  COUNT(DISTINCT r.id) as rule_count,
  t.status
FROM tax_master t
INNER JOIN accounting_entities ae ON t.accounting_entity_id = ae.id
LEFT JOIN tax_slabs s ON t.id = s.tax_master_id AND s.is_active = 1
LEFT JOIN tax_rules r ON t.id = r.tax_master_id AND r.is_active = 1
WHERE t.is_active = 1 AND t.status = 'ACTIVE'
GROUP BY t.id;
