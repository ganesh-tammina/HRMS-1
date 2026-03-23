/**
 * FINANCE MASTER CONFIGURATION ENGINE - Routes
 * REST API endpoints for finance master configuration
 * 
 * Base URL: /api/finance-config
 * Authorization: Finance role required for most operations
 */

const express = require('express');
const router = express.Router();
const { auth, finance, admin } = require('../middleware/auth');
const financeCtrl = require('../controllers/finance-master-config.controller');

// ============================================
// MIDDLEWARE
// ============================================

// Finance access control - can be overridden by admin
const financeAccess = (req, res, next) => {
  const role = (req.user.role || '').toLowerCase();
  if (role === 'admin' || role === 'finance') {
    return next();
  }
  res.status(403).json({ error: 'Finance configuration access required' });
};

// ============================================
// ACCOUNTING ENTITIES ROUTES
// ============================================

/**
 * GET /api/finance-config/entities
 * List all accounting entities
 */
router.get('/entities', auth, financeAccess, financeCtrl.listEntities);

/**
 * POST /api/finance-config/entities
 * Create new accounting entity
 */
router.post('/entities', auth, financeAccess, financeCtrl.createEntity);

/**
 * PUT /api/finance-config/entities/:entityId
 * Update accounting entity
 */
router.put('/entities/:entityId', auth, financeAccess, financeCtrl.updateEntity);

// ============================================
// GL ACCOUNTS ROUTES
// ============================================

/**
 * GET /api/finance-config/entities/:entityId/gl-accounts
 * List all GL accounts for an entity
 * Query params: account_type, status, search
 */
router.get('/entities/:entityId/gl-accounts', auth, financeAccess, financeCtrl.listGLAccounts);

/**
 * POST /api/finance-config/entities/:entityId/gl-accounts
 * Create new GL account
 */
router.post('/entities/:entityId/gl-accounts', auth, financeAccess, financeCtrl.createGLAccount);

/**
 * GET /api/finance-config/entities/:entityId/gl-accounts/hierarchy
 * Get GL accounts in hierarchical structure
 */
router.get('/entities/:entityId/gl-accounts/hierarchy', auth, financeAccess, financeCtrl.getGLAccountHierarchy);

// ============================================
// TAX MASTER ROUTES
// ============================================

/**
 * GET /api/finance-config/entities/:entityId/tax-master
 * List all tax masters for an entity
 * Query params: tax_type, status
 */
router.get('/entities/:entityId/tax-master', auth, financeAccess, financeCtrl.listTaxMasters);

/**
 * POST /api/finance-config/entities/:entityId/tax-master
 * Create new tax master
 */
router.post('/entities/:entityId/tax-master', auth, financeAccess, financeCtrl.createTaxMaster);

/**
 * GET /api/finance-config/tax-master/:taxMasterId/slabs
 * Get tax slabs for a tax master
 */
router.get('/tax-master/:taxMasterId/slabs', auth, financeAccess, financeCtrl.getTaxSlabs);

/**
 * POST /api/finance-config/tax-master/:taxMasterId/slabs
 * Add tax slab to a tax master
 */
router.post('/tax-master/:taxMasterId/slabs', auth, financeAccess, financeCtrl.addTaxSlab);

// ============================================
// WAGE COMPONENT GL MAPPING ROUTES
// ============================================

/**
 * GET /api/finance-config/entities/:entityId/wage-component-mappings
 * List all wage component to GL mappings for an entity
 */
router.get('/entities/:entityId/wage-component-mappings', auth, financeAccess, financeCtrl.listWageComponentMappings);

/**
 * POST /api/finance-config/entities/:entityId/wage-component-mappings
 * Create new wage component to GL mapping
 */
router.post('/entities/:entityId/wage-component-mappings', auth, financeAccess, financeCtrl.createWageComponentMapping);

// ============================================
// AUDIT LOG ROUTES
// ============================================

/**
 * GET /api/finance-config/entities/:entityId/audit-logs
 * Get audit logs for an accounting entity
 * Query params: entity_type, operation_type, from_date, to_date
 */
router.get('/entities/:entityId/audit-logs', auth, financeAccess, financeCtrl.getAuditLogs);

// ============================================
// VALIDATION & SIMULATION ROUTES
// ============================================

/**
 * POST /api/finance-config/validation/gl-account
 * Validate GL account configuration without saving
 */
router.post('/validation/gl-account', auth, financeAccess, financeCtrl.validateGLAccountConfig);

/**
 * POST /api/finance-config/validation/tax-configuration
 * Validate tax configuration without saving
 */
router.post('/validation/tax-configuration', auth, financeAccess, financeCtrl.validateTaxConfiguration);

// ============================================
// PAYROLL INTEGRATION ROUTES (Non-breaking)
// ============================================

/**
 * GET /api/finance-config/payroll/gl-accounts/:entityId
 * Get active GL accounts for payroll posting
 * Accessible by payroll module
 */
router.get('/payroll/gl-accounts/:entityId', auth, (req, res, next) => {
  // Allow payroll and finance roles to access
  const role = (req.user.role || '').toLowerCase();
  if (role === 'admin' || role === 'finance' || role === 'hr') {
    return next();
  }
  res.status(403).json({ error: 'Insufficient permissions' });
}, financeCtrl.getActiveGLAccountsForPayroll);

/**
 * GET /api/finance-config/payroll/wage-component-mappings/:entityId
 * Get wage component GL mappings for payroll posting
 */
router.get('/payroll/wage-component-mappings/:entityId', auth, (req, res, next) => {
  const role = (req.user.role || '').toLowerCase();
  if (role === 'admin' || role === 'finance' || role === 'hr') {
    return next();
  }
  res.status(403).json({ error: 'Insufficient permissions' });
}, financeCtrl.getWageComponentMappingsForPayroll);

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/finance-config/health
 * Health check for finance master configuration engine
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Finance Master Configuration Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
