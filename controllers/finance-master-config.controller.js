/**
 * FINANCE MASTER CONFIGURATION ENGINE - Controllers
 * Handles HTTP request/response logic for finance master operations
 */

const {
  AccountingEntityService,
  GLAccountService,
  TaxMasterService,
  WageComponentGLMappingService,
  AuditLogService,
  FinanceConfigValidationService
} = require('../services/finance-master-config.service');

// Service instantiation
const entityService = new AccountingEntityService();
const glService = new GLAccountService();
const taxService = new TaxMasterService();
const mappingService = new WageComponentGLMappingService();
const auditService = new AuditLogService();
const validationService = new FinanceConfigValidationService();

// ============================================
// ACCOUNTING ENTITIES CONTROLLERS
// ============================================

exports.listEntities = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      search: req.query.search,
      is_active: req.query.is_active !== 'false'
    };
    const result = await entityService.listEntities(filters);
    res.json(result);
  } catch (error) {
    console.error('[listEntities] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createEntity = async (req, res) => {
  try {
    const data = {
      ...req.body,
      created_by: req.user.id
    };
    const result = await entityService.createEntity(data);
    res.status(201).json(result);
  } catch (error) {
    console.error('[createEntity] Error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.updateEntity = async (req, res) => {
  try {
    const { entityId } = req.params;
    const { audit_note } = req.body;
    
    if (!audit_note) {
      return res.status(400).json({ error: 'audit_note is required for tracking changes' });
    }

    const result = await entityService.updateEntity(entityId, req.body, audit_note, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('[updateEntity] Error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ============================================
// GL ACCOUNTS CONTROLLERS
// ============================================

exports.listGLAccounts = async (req, res) => {
  try {
    const { entityId } = req.params;
    const filters = {
      account_type: req.query.account_type,
      status: req.query.status,
      search: req.query.search
    };
    const result = await glService.listGLAccounts(entityId, filters);
    res.json(result);
  } catch (error) {
    console.error('[listGLAccounts] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createGLAccount = async (req, res) => {
  try {
    const { entityId } = req.params;

    // Validate input
    const validation = validationService.validateGLAccount(req.body);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    const result = await glService.createGLAccount(entityId, req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    console.error('[createGLAccount] Error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.getGLAccountHierarchy = async (req, res) => {
  try {
    const { entityId } = req.params;
    const result = await glService.getGLAccountHierarchy(entityId);
    res.json(result);
  } catch (error) {
    console.error('[getGLAccountHierarchy] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// TAX MASTER CONTROLLERS
// ============================================

exports.listTaxMasters = async (req, res) => {
  try {
    const { entityId } = req.params;
    const filters = {
      tax_type: req.query.tax_type,
      status: req.query.status
    };
    const result = await taxService.listTaxMasters(entityId, filters);
    res.json(result);
  } catch (error) {
    console.error('[listTaxMasters] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createTaxMaster = async (req, res) => {
  try {
    const { entityId } = req.params;

    // Validate input
    const validation = validationService.validateTaxConfiguration(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    const result = await taxService.createTaxMaster(entityId, req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    console.error('[createTaxMaster] Error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.getTaxSlabs = async (req, res) => {
  try {
    const { taxMasterId } = req.params;
    const result = await taxService.getTaxSlabs(taxMasterId);
    res.json(result);
  } catch (error) {
    console.error('[getTaxSlabs] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.addTaxSlab = async (req, res) => {
  try {
    const { taxMasterId } = req.params;

    // Validate
    const validation = validationService.validateTaxSlab(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validation.errors
      });
    }

    const result = await taxService.addTaxSlab(taxMasterId, req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    console.error('[addTaxSlab] Error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ============================================
// WAGE COMPONENT GL MAPPING CONTROLLERS
// ============================================

exports.listWageComponentMappings = async (req, res) => {
  try {
    const { entityId } = req.params;
    const result = await mappingService.listMappings(entityId);
    res.json(result);
  } catch (error) {
    console.error('[listWageComponentMappings] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createWageComponentMapping = async (req, res) => {
  try {
    const { entityId } = req.params;
    const result = await mappingService.createMapping(entityId, req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    console.error('[createWageComponentMapping] Error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ============================================
// AUDIT LOG CONTROLLERS
// ============================================

exports.getAuditLogs = async (req, res) => {
  try {
    const { entityId } = req.params;
    const filters = {
      entity_type: req.query.entity_type,
      operation_type: req.query.operation_type,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };
    const result = await auditService.getAuditLogs(entityId, filters);
    res.json(result);
  } catch (error) {
    console.error('[getAuditLogs] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// VALIDATION & SIMULATION CONTROLLERS
// ============================================

exports.validateGLAccountConfig = async (req, res) => {
  try {
    const validation = validationService.validateGLAccount(req.body);
    res.json(validation);
  } catch (error) {
    console.error('[validateGLAccountConfig] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.validateTaxConfiguration = async (req, res) => {
  try {
    const validation = validationService.validateTaxConfiguration(req.body);
    res.json(validation);
  } catch (error) {
    console.error('[validateTaxConfiguration] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// INTEGRATION HELPERS (Non-breaking integration)
// ============================================

/**
 * Get active GL accounts for a given entity
 * Used by payroll module to post transactions
 */
exports.getActiveGLAccountsForPayroll = async (req, res) => {
  try {
    const { entityId } = req.params;
    const result = await glService.listGLAccounts(entityId, { 
      status: 'ACTIVE',
      in_active: false
    });
    res.json(result);
  } catch (error) {
    console.error('[getActiveGLAccountsForPayroll] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get wage component mappings for payroll posting
 * Non-breaking integration with payroll engine
 */
exports.getWageComponentMappingsForPayroll = async (req, res) => {
  try {
    const { entityId } = req.params;
    const result = await mappingService.listMappings(entityId);
    
    // Transform for payroll consumption
    const mappingsByComponent = {};
    for (const mapping of result.data) {
      if (!mappingsByComponent[mapping.salary_component_id]) {
        mappingsByComponent[mapping.salary_component_id] = [];
      }
      mappingsByComponent[mapping.salary_component_id].push({
        gl_account_id: mapping.gl_account_id,
        account_code: mapping.account_code,
        posting_mode: mapping.posting_mode,
        sequence: mapping.posting_sequence
      });
    }

    res.json({
      success: true,
      data: mappingsByComponent,
      note: 'Ready for payroll GL posting'
    });
  } catch (error) {
    console.error('[getWageComponentMappingsForPayroll] Error:', error);
    res.status(500).json({ error: error.message });
  }
};
