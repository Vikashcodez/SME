/**
 * ForeignKeyResolver - Smart lookup helper for Excel imports.
 * Resolves natural names, PAN, GSTIN, Code, or Email into primary key IDs.
 */

export const resolveVendorId = async (client, companyId, identifier) => {
    if (!identifier) return null;
    const key = String(identifier).trim();
    if (!key || key === 'null' || key === 'undefined') return null;

    const res = await client.query(`
        SELECT vendor_id FROM vendors
        WHERE (company_id = $1 OR company_id IS NULL)
          AND (vendor_id::TEXT = $2 OR vendor_code = $2 OR vendor_name ILIKE $2 OR gstin = $2 OR pan = $2)
        ORDER BY (vendor_code = $2) DESC, (gstin = $2) DESC, vendor_id ASC
        LIMIT 1
    `, [companyId, key]);

    return res.rows[0]?.vendor_id || null;
};

export const resolveCustomerId = async (client, companyId, identifier) => {
    if (!identifier) return null;
    const key = String(identifier).trim();
    if (!key || key === 'null' || key === 'undefined') return null;

    const res = await client.query(`
        SELECT customer_id FROM customer_profiles
        WHERE (company_id = $1 OR company_id IS NULL)
          AND (customer_id::TEXT = $2 OR customer_code = $2 OR trade_name ILIKE $2 OR legal_name ILIKE $2 OR gstin = $2 OR pan = $2)
        ORDER BY (customer_code = $2) DESC, (gstin = $2) DESC, customer_id ASC
        LIMIT 1
    `, [companyId, key]);

    return res.rows[0]?.customer_id || null;
};

export const resolveDepartmentId = async (client, companyId, identifier) => {
    if (!identifier) return null;
    const key = String(identifier).trim();
    if (!key || key === 'null' || key === 'undefined') return null;

    let res = await client.query(`
        SELECT department_id FROM departments
        WHERE (company_id = $1 OR company_id IS NULL)
          AND (department_id::TEXT = $2 OR department_name ILIKE $2)
        LIMIT 1
    `, [companyId, key]);

    if (res.rows.length > 0) return res.rows[0].department_id;

    // Auto-create department if provided by name
    if (isNaN(Number(key)) && companyId) {
        const createRes = await client.query(`
            INSERT INTO departments (company_id, department_name, is_active)
            VALUES ($1, $2, TRUE) RETURNING department_id
        `, [companyId, key]);
        return createRes.rows[0].department_id;
    }

    return null;
};

export const resolveRoleId = async (client, companyId, identifier) => {
    if (!identifier) return null;
    const key = String(identifier).trim();
    if (!key || key === 'null' || key === 'undefined') return null;

    let res = await client.query(`
        SELECT role_id FROM roles
        WHERE (company_id = $1 OR company_id IS NULL)
          AND (role_id::TEXT = $2 OR role_name ILIKE $2)
        LIMIT 1
    `, [companyId, key]);

    if (res.rows.length > 0) return res.rows[0].role_id;

    // Auto-create role if provided by name
    if (isNaN(Number(key)) && companyId) {
        const createRes = await client.query(`
            INSERT INTO roles (company_id, role_name, is_active)
            VALUES ($1, $2, TRUE) RETURNING role_id
        `, [companyId, key]);
        return createRes.rows[0].role_id;
    }

    return null;
};

export const resolveBranchId = async (client, companyId, identifier) => {
    if (!identifier) return null;
    const key = String(identifier).trim();
    if (!key || key === 'null' || key === 'undefined') return null;

    const res = await client.query(`
        SELECT branch_id FROM branches
        WHERE (company_id = $1 OR company_id IS NULL)
          AND (branch_id::TEXT = $2 OR branch_code = $2 OR branch_name ILIKE $2)
        LIMIT 1
    `, [companyId, key]);

    return res.rows[0]?.branch_id || null;
};

export const resolveEmployeeId = async (client, companyId, identifier) => {
    if (!identifier) return null;
    const key = String(identifier).trim();
    if (!key || key === 'null' || key === 'undefined') return null;

    const res = await client.query(`
        SELECT employee_id FROM employees
        WHERE (company_id = $1 OR company_id IS NULL)
          AND (employee_id::TEXT = $2 OR employee_code = $2 OR email ILIKE $2 OR first_name ILIKE $2 OR (first_name || ' ' || COALESCE(last_name, '')) ILIKE $2)
        LIMIT 1
    `, [companyId, key]);

    return res.rows[0]?.employee_id || null;
};

export const resolveProductId = async (client, companyId, identifier) => {
    if (!identifier) return null;
    const key = String(identifier).trim();
    if (!key || key === 'null' || key === 'undefined') return null;

    const res = await client.query(`
        SELECT product_id FROM products
        WHERE (company_id = $1 OR company_id IS NULL)
          AND (product_id::TEXT = $2 OR product_code = $2 OR product_name ILIKE $2)
        LIMIT 1
    `, [companyId, key]);

    return res.rows[0]?.product_id || null;
};

export const resolveAccountGroupId = async (client, companyId, identifier) => {
    if (!identifier) return null;
    const key = String(identifier).trim();
    if (!key || key === 'null' || key === 'undefined') return null;

    const res = await client.query(`
        SELECT group_id FROM account_groups
        WHERE (company_id = $1 OR company_id IS NULL)
          AND (group_id::TEXT = $2 OR group_code = $2 OR group_name ILIKE $2)
        LIMIT 1
    `, [companyId, key]);

    return res.rows[0]?.group_id || null;
};

export const resolveRawMaterialId = async (client, companyId, identifier) => {
    if (!identifier) return null;
    const key = String(identifier).trim();
    if (!key || key === 'null' || key === 'undefined') return null;

    const res = await client.query(`
        SELECT material_id FROM raw_materials
        WHERE (company_id = $1 OR company_id IS NULL)
          AND (material_id::TEXT = $2 OR material_code = $2 OR material_name ILIKE $2)
        LIMIT 1
    `, [companyId, key]);

    return res.rows[0]?.material_id || null;
};
