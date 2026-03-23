/**
 * FINANCE MASTER CONFIGURATION ENGINE - Service Layer
 * Handles business logic for all finance master operations
 * Ensures data integrity and audit trail tracking
 */

const { db } = require('../config/database');

// ============================================
// 1. ACCOUNTING ENTITIES SERVICE
// ============================================

class AccountingEntityService {
  async listEntities(filters = {}) {
    try {
      const c = await db();
      let query = 'SELECT * FROM accounting_entities WHERE 1=1';
      let params = [];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active ? 1 : 0);
      }
      if (filters.search) {
        query += ' AND (name LIKE ? OR code LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ' ORDER BY created_at DESC LIMIT 100';
      const [rows] = await c.query(query, params);
      c.end();
      return { success: true, data: rows, count: rows.length };
    } catch (error) {
      throw new Error(`Failed to list entities: ${error.message}`);
    }
  }

  async createEntity(data) {
    const c = await db();
    await c.beginTransaction();
    try {
      const requiredFields = ['name', 'code', 'entity_type', 'currency_code'];
      for (const field of requiredFields) {
        if (!data[field]) throw new Error(`Missing required field: ${field}`);
      }

      const [result] = await c.query(
        `INSERT INTO accounting_entities 
         (name, code, entity_type, legal_entity_id, country_code, currency_code, 
          financial_year_start_month, is_active, status, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.name, data.code, data.entity_type, data.legal_entity_id || null,
         data.country_code || 'IN', data.currency_code, 
         data.financial_year_start_month || 4, 1, 'ACTIVE', data.created_by]
      );

      // Audit log
      await this._auditLog(c, 'accounting_entities', result.insertId, 'CREATE', 
                          null, JSON.stringify(data), 'Entity created', data.created_by);

      await c.commit();
      c.end();
      return { success: true, id: result.insertId };
    } catch (error) {
      await c.rollback();
      c.end();
      throw error;
    }
  }

  async updateEntity(entityId, data, auditNote, userId) {
    const c = await db();
    await c.beginTransaction();
    try {
      // Get existing data for audit
      const [existing] = await c.query(
        'SELECT * FROM accounting_entities WHERE id = ?', [entityId]
      );
      if (existing.length === 0) throw new Error('Entity not found');

      const beforeValue = JSON.stringify(existing[0]);
      const allowedFields = ['name', 'entity_type', 'currency_code', 'is_active', 'status', 'updated_by'];
      const updateObj = {};
      
      for (const field of allowedFields) {
        if (data[field] !== undefined) updateObj[field] = data[field];
      }

      if (Object.keys(updateObj).length === 0) throw new Error('No valid fields to update');

      const [result] = await c.query(
        'UPDATE accounting_entities SET ? WHERE id = ?',
        [updateObj, entityId]
      );

      // Audit log
      await this._auditLog(c, 'accounting_entities', entityId, 'UPDATE',
                          beforeValue, JSON.stringify(updateObj), auditNote, userId);

      await c.commit();
      c.end();
      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      await c.rollback();
      c.end();
      throw error;
    }
  }

  async _auditLog(connection, entityType, entityId, operation, beforeValue, afterValue, reason, userId) {
    await connection.query(
      `INSERT INTO configuration_audit_log 
       (entity_type, entity_id, operation_type, before_value, after_value, change_reason, changed_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entityType, entityId, operation, beforeValue, afterValue, reason, userId]
    );
  }
}

// ============================================
// 2. GL ACCOUNTS SERVICE
// ============================================

class GLAccountService {
  async listGLAccounts(accountingEntityId, filters = {}) {
    try {
      const c = await db();
      let query = `
        SELECT * FROM gl_accounts 
        WHERE accounting_entity_id = ? AND 1=1
      `;
      let params = [accountingEntityId];

      if (filters.account_type) {
        query += ' AND account_type = ?';
        params.push(filters.account_type);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.search) {
        query += ' AND (account_code LIKE ? OR account_name LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ' ORDER BY account_code LIMIT 500';
      const [rows] = await c.query(query, params);
      c.end();
      return { success: true, data: rows, count: rows.length };
    } catch (error) {
      throw new Error(`Failed to list GL accounts: ${error.message}`);
    }
  }

  async createGLAccount(accountingEntityId, data, userId) {
    const c = await db();
    await c.beginTransaction();
    try {
      // Validation
      const requiredFields = ['account_code', 'account_name', 'account_type'];
      for (const field of requiredFields) {
        if (!data[field]) throw new Error(`Missing required field: ${field}`);
      }

      // Check uniqueness of account code per entity
      const [existing] = await c.query(
        'SELECT id FROM gl_accounts WHERE accounting_entity_id = ? AND account_code = ?',
        [accountingEntityId, data.account_code]
      );
      if (existing.length > 0) {
        throw new Error('Account code already exists for this entity');
      }

      const [result] = await c.query(
        `INSERT INTO gl_accounts 
         (accounting_entity_id, account_code, account_name, account_type, account_group,
          can_post_directly, requires_cost_center, requires_profit_center,
          is_active, status, created_by, description, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [accountingEntityId, data.account_code, data.account_name, data.account_type,
         data.account_group || null, data.can_post_directly !== false ? 1 : 0,
         data.requires_cost_center ? 1 : 0, data.requires_profit_center ? 1 : 0,
         1, 'ACTIVE', userId, data.description || null, data.notes || null]
      );

      // Audit
      await this._auditLog(c, 'gl_accounts', result.insertId, 'CREATE',
                          null, JSON.stringify(data), 'GL Account created', userId);

      await c.commit();
      c.end();
      return { success: true, id: result.insertId };
    } catch (error) {
      await c.rollback();
      c.end();
      throw error;
    }
  }

  async getGLAccountHierarchy(accountingEntityId) {
    try {
      const c = await db();
      const [accounts] = await c.query(
        `SELECT id, parent_id, account_code, account_name, account_type, is_active
         FROM gl_accounts 
         WHERE accounting_entity_id = ? AND is_active = 1
         ORDER BY parent_id, account_code`,
        [accountingEntityId]
      );
      c.end();

      // Build hierarchy
      const hierarchy = this._buildHierarchy(accounts);
      return { success: true, data: hierarchy };
    } catch (error) {
      throw new Error(`Failed to get GL hierarchy: ${error.message}`);
    }
  }

  _buildHierarchy(accounts, parentId = null) {
    return accounts
      .filter(a => a.parent_id === parentId)
      .map(a => ({
        ...a,
        children: this._buildHierarchy(accounts, a.id)
      }));
  }

  async _auditLog(connection, entityType, entityId, operation, beforeValue, afterValue, reason, userId) {
    await connection.query(
      `INSERT INTO configuration_audit_log 
       (entity_type, entity_id, operation_type, before_value, after_value, change_reason, changed_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entityType, entityId, operation, beforeValue, afterValue, reason, userId]
    );
  }
}

// ============================================
// 3. TAX MASTER SERVICE
// ============================================

class TaxMasterService {
  async listTaxMasters(accountingEntityId, filters = {}) {
    try {
      const c = await db();
      let query = `
        SELECT t.*, 
               COUNT(DISTINCT ts.id) as slab_count,
               COUNT(DISTINCT tr.id) as rule_count
        FROM tax_master t
        LEFT JOIN tax_slabs ts ON t.id = ts.tax_master_id AND ts.is_active = 1
        LEFT JOIN tax_rules tr ON t.id = tr.tax_master_id AND tr.is_active = 1
        WHERE t.accounting_entity_id = ? AND 1=1
      `;
      let params = [accountingEntityId];

      if (filters.tax_type) {
        query += ' AND t.tax_type = ?';
        params.push(filters.tax_type);
      }
      if (filters.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }

      query += ' GROUP BY t.id ORDER BY t.tax_code';
      const [rows] = await c.query(query, params);
      c.end();
      return { success: true, data: rows, count: rows.length };
    } catch (error) {
      throw new Error(`Failed to list tax masters: ${error.message}`);
    }
  }

  async createTaxMaster(accountingEntityId, data, userId) {
    const c = await db();
    await c.beginTransaction();
    try {
      const requiredFields = ['tax_code', 'tax_name', 'tax_type', 'calculation_mode'];
      for (const field of requiredFields) {
        if (!data[field]) throw new Error(`Missing required field: ${field}`);
      }

      // Validate tax code uniqueness
      const [existing] = await c.query(
        'SELECT id FROM tax_master WHERE accounting_entity_id = ? AND tax_code = ?',
        [accountingEntityId, data.tax_code]
      );
      if (existing.length > 0) throw new Error('Tax code already exists for this entity');

      const [result] = await c.query(
        `INSERT INTO tax_master
         (accounting_entity_id, tax_code, tax_name, tax_type, calculation_mode,
          default_rate, is_mandatory, is_cumulative, min_salary_threshold, 
          max_salary_threshold, is_active, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [accountingEntityId, data.tax_code, data.tax_name, data.tax_type, data.calculation_mode,
         data.default_rate || null, data.is_mandatory !== false ? 1 : 0,
         data.is_cumulative ? 1 : 0, data.min_salary_threshold || null,
         data.max_salary_threshold || null, 1, 'ACTIVE', userId]
      );

      // Audit
      await this._auditLog(c, 'tax_master', result.insertId, 'CREATE',
                          null, JSON.stringify(data), 'Tax master created', userId);

      await c.commit();
      c.end();
      return { success: true, id: result.insertId };
    } catch (error) {
      await c.rollback();
      c.end();
      throw error;
    }
  }

  async addTaxSlab(taxMasterId, data, userId) {
    const c = await db();
    await c.beginTransaction();
    try {
      // Get tax master to verify existence
      const [taxMasters] = await c.query(
        'SELECT * FROM tax_master WHERE id = ?', [taxMasterId]
      );
      if (taxMasters.length === 0) throw new Error('Tax master not found');

      // Validate slab ranges
      if (!data.from_amount && data.from_amount !== 0) throw new Error('from_amount required');

      const [result] = await c.query(
        `INSERT INTO tax_slabs
         (tax_master_id, slab_number, from_amount, to_amount, fixed_amount, 
          percentage_rate, surcharge_percentage, rebate_amount, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [taxMasterId, data.slab_number || 1, data.from_amount, data.to_amount || null,
         data.fixed_amount || null, data.percentage_rate || null,
         data.surcharge_percentage || null, data.rebate_amount || null, 1, userId]
      );

      // Audit
      await this._auditLog(c, 'tax_slabs', result.insertId, 'CREATE',
                          null, JSON.stringify(data), 'Tax slab added', userId);

      await c.commit();
      c.end();
      return { success: true, id: result.insertId };
    } catch (error) {
      await c.rollback();
      c.end();
      throw error;
    }
  }

  async getTaxSlabs(taxMasterId) {
    try {
      const c = await db();
      const [slabs] = await c.query(
        `SELECT * FROM tax_slabs 
         WHERE tax_master_id = ? AND is_active = 1
         ORDER BY slab_number`,
        [taxMasterId]
      );
      c.end();
      return { success: true, data: slabs };
    } catch (error) {
      throw new Error(`Failed to get tax slabs: ${error.message}`);
    }
  }

  async _auditLog(connection, entityType, entityId, operation, beforeValue, afterValue, reason, userId) {
    await connection.query(
      `INSERT INTO configuration_audit_log 
       (entity_type, entity_id, operation_type, before_value, after_value, change_reason, changed_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entityType, entityId, operation, beforeValue, afterValue, reason, userId]
    );
  }
}

// ============================================
// 4. WAGE COMPONENT GL MAPPING SERVICE
// ============================================

class WageComponentGLMappingService {
  async listMappings(accountingEntityId) {
    try {
      const c = await db();
      const [mappings] = await c.query(
        `SELECT m.*, sc.code as component_code, sc.name as component_name,
                gl.account_code, gl.account_name
         FROM wage_component_gl_mapping m
         LEFT JOIN salary_components sc ON m.salary_component_id = sc.id
         LEFT JOIN gl_accounts gl ON m.gl_account_id = gl.id
         WHERE m.accounting_entity_id = ? AND m.is_active = 1
         ORDER BY m.posting_sequence`,
        [accountingEntityId]
      );
      c.end();
      return { success: true, data: mappings, count: mappings.length };
    } catch (error) {
      throw new Error(`Failed to list mappings: ${error.message}`);
    }
  }

  async createMapping(accountingEntityId, data, userId) {
    const c = await db();
    await c.beginTransaction();
    try {
      const requiredFields = ['salary_component_id', 'gl_account_id'];
      for (const field of requiredFields) {
        if (!data[field]) throw new Error(`Missing required field: ${field}`);
      }

      // Check for duplicate mapping
      const [existing] = await c.query(
        `SELECT id FROM wage_component_gl_mapping 
         WHERE accounting_entity_id = ? AND salary_component_id = ? AND gl_account_id = ?`,
        [accountingEntityId, data.salary_component_id, data.gl_account_id]
      );
      if (existing.length > 0) throw new Error('Mapping already exists');

      const [result] = await c.query(
        `INSERT INTO wage_component_gl_mapping
         (accounting_entity_id, salary_component_id, gl_account_id, posting_mode, 
          posting_sequence, is_active, status, created_by, condition_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [accountingEntityId, data.salary_component_id, data.gl_account_id,
         data.posting_mode || 'CREDIT', data.posting_sequence || 10, 1, 'ACTIVE', userId,
         data.condition_json || null]
      );

      await c.commit();
      c.end();
      return { success: true, id: result.insertId };
    } catch (error) {
      await c.rollback();
      c.end();
      throw error;
    }
  }
}

// ============================================
// 5. AUDIT LOG SERVICE
// ============================================

class AuditLogService {
  async getAuditLogs(accountingEntityId, filters = {}) {
    try {
      const c = await db();
      let query = `
        SELECT * FROM configuration_audit_log 
        WHERE accounting_entity_id = ? AND 1=1
      `;
      let params = [accountingEntityId];

      if (filters.entity_type) {
        query += ' AND entity_type = ?';
        params.push(filters.entity_type);
      }
      if (filters.operation_type) {
        query += ' AND operation_type = ?';
        params.push(filters.operation_type);
      }
      if (filters.from_date) {
        query += ' AND DATE(changed_at) >= ?';
        params.push(filters.from_date);
      }
      if (filters.to_date) {
        query += ' AND DATE(changed_at) <= ?';
        params.push(filters.to_date);
      }

      query += ' ORDER BY changed_at DESC LIMIT 500';
      const [logs] = await c.query(query, params);
      c.end();
      return { success: true, data: logs, count: logs.length };
    } catch (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }
  }
}

// ============================================
// 6. VALIDATION SERVICE
// ============================================

class FinanceConfigValidationService {
  /**
   * Validate GL account configuration
   */
  validateGLAccount(accountData) {
    const errors = [];
    const warnings = [];

    if (!accountData.account_code || accountData.account_code.length < 3) {
      errors.push('Account code must be at least 3 characters');
    }
    if (!/^[A-Z0-9\-_]{3,20}$/.test(accountData.account_code)) {
      errors.push('Account code must contain only alphanumeric characters, hyphens, and underscores');
    }
    if (!accountData.account_name || accountData.account_name.length < 5) {
      errors.push('Account name must be at least 5 characters');
    }
    if (!['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(accountData.account_type)) {
      errors.push('Invalid account type');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate tax configuration
   */
  validateTaxConfiguration(taxData) {
    const errors = [];
    const warnings = [];

    if (!taxData.tax_code || taxData.tax_code.length < 3) {
      errors.push('Tax code required and must be min 3 chars');
    }
    if (!['FIXED_AMOUNT', 'PERCENTAGE', 'SLAB_BASED', 'RULE_BASED'].includes(taxData.calculation_mode)) {
      errors.push('Invalid calculation mode');
    }
    if (taxData.calculation_mode === 'PERCENTAGE' && (taxData.default_rate < 0 || taxData.default_rate > 100)) {
      errors.push('Percentage rate must be between 0-100');
    }
    if (taxData.default_rate && taxData.default_rate < 0) {
      errors.push('Tax rate cannot be negative');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate tax slab configuration
   */
  validateTaxSlab(slabData) {
    const errors = [];

    if (slabData.from_amount === undefined || slabData.from_amount === null) {
      errors.push('from_amount is required');
    }
    if (slabData.from_amount < 0) {
      errors.push('from_amount cannot be negative');
    }
    if (slabData.to_amount && slabData.from_amount >= slabData.to_amount) {
      errors.push('from_amount must be less than to_amount');
    }

    return { valid: errors.length === 0, errors };
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  AccountingEntityService,
  GLAccountService,
  TaxMasterService,
  WageComponentGLMappingService,
  AuditLogService,
  FinanceConfigValidationService
};
