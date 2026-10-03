const { pool } = require('../config/database');

const LabTest = {
  /**
   * Check if lab_tests table exists in database
   */
  async checkTableExists() {
    try {
      const res = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'lab_tests'
        )
      `);
      return res.rows[0]?.exists === true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Fetch lab tests catalog with pagination, search, category & active filter
   */
  async getAll({ page = 1, limit = 20, search = '', category = '', activeOnly = false }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];

    if (activeOnly) {
      values.push(true);
      conditions.push(`is_active = $${values.length}`);
    }

    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(name ILIKE $${values.length} OR code ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM lab_tests ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(
      `SELECT * FROM lab_tests ${whereClause} 
       ORDER BY category ASC, name ASC 
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return {
      tests: dataRes.rows,
      total
    };
  },

  /**
   * Find lab test by ID
   */
  async findById(id) {
    const res = await pool.query(`SELECT * FROM lab_tests WHERE id = $1`, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find lab test by code
   */
  async findByCode(code) {
    if (!code) return null;
    const res = await pool.query(`SELECT * FROM lab_tests WHERE LOWER(code) = LOWER($1)`, [code]);
    return res.rows[0] || null;
  },

  /**
   * Find lab test by exact name (case-insensitive)
   */
  async findByName(name) {
    if (!name) return null;
    const res = await pool.query(`SELECT * FROM lab_tests WHERE LOWER(name) = LOWER($1)`, [name]);
    return res.rows[0] || null;
  },

  /**
   * Create a new lab test
   */
  async create({
    name,
    code,
    category,
    description,
    price,
    sampleType,
    preparationInstructions,
    turnaroundHours,
    unit,
    normalMin,
    normalMax,
    normalText
  }) {
    const res = await pool.query(
      `INSERT INTO lab_tests (
        name, code, category, description, price, sample_type, preparation_instructions,
        turnaround_hours, unit, normal_min, normal_max, normal_text, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
      RETURNING *`,
      [
        name,
        code || null,
        category,
        description || null,
        price,
        sampleType || null,
        preparationInstructions || null,
        turnaroundHours || null,
        unit || null,
        normalMin !== undefined && normalMin !== '' ? normalMin : null,
        normalMax !== undefined && normalMax !== '' ? normalMax : null,
        normalText || null
      ]
    );
    return res.rows[0];
  },

  /**
   * Update existing lab test
   */
  async update(id, {
    name,
    code,
    category,
    description,
    price,
    sampleType,
    preparationInstructions,
    turnaroundHours,
    unit,
    normalMin,
    normalMax,
    normalText,
    isActive
  }) {
    const res = await pool.query(
      `UPDATE lab_tests SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        category = COALESCE($3, category),
        description = COALESCE($4, description),
        price = COALESCE($5, price),
        sample_type = COALESCE($6, sample_type),
        preparation_instructions = COALESCE($7, preparation_instructions),
        turnaround_hours = COALESCE($8, turnaround_hours),
        unit = COALESCE($9, unit),
        normal_min = $10,
        normal_max = $11,
        normal_text = COALESCE($12, normal_text),
        is_active = COALESCE($13, is_active),
        updated_at = NOW()
      WHERE id = $14
      RETURNING *`,
      [
        name,
        code,
        category,
        description,
        price,
        sampleType,
        preparationInstructions,
        turnaroundHours,
        unit,
        normalMin !== undefined && normalMin !== '' ? normalMin : null,
        normalMax !== undefined && normalMax !== '' ? normalMax : null,
        normalText,
        isActive,
        id
      ]
    );
    return res.rows[0] || null;
  },

  /**
   * Check if lab test is used in any orders (prevent deletion if used)
   */
  async hasOrders(id) {
    const res = await pool.query(`SELECT EXISTS (SELECT 1 FROM lab_orders WHERE test_id = $1)`, [id]);
    return res.rows[0]?.exists === true;
  }
};

module.exports = LabTest;
