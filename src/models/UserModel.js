const pool = require('../config/database');

class UserModel {
  static async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async countByRole(role) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS n FROM users WHERE role = ?', [role]
    );
    return rows[0].n;
  }

  static async findByRole(role) {
    const [rows] = await pool.query(
      'SELECT id, name, email FROM users WHERE role = ? ORDER BY name', [role]
    );
    return rows;
  }

  static async findWorkersWithDistrict({ page = 1, limit = 10 } = {}) {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at, d.name AS district_name
      FROM users u
      LEFT JOIN districts d ON u.district_id = d.id
      WHERE u.role = 'worker'
      ORDER BY u.name
      LIMIT ? OFFSET ?
    `, [limit, (page - 1) * limit]);
    return rows;
  }

  static async countWorkers() {
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE role = 'worker'");
    return rows[0].n;
  }

  static async findWorkerById(id) {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.district_id, u.created_at,
             d.name AS district_name
      FROM users u
      LEFT JOIN districts d ON u.district_id = d.id
      WHERE u.id = ? AND u.role = 'worker'
    `, [id]);
    return rows[0] || null;
  }

  static async updateWorker(id, { name, email, district_id }) {
    await pool.query(
      'UPDATE users SET name=?, email=?, district_id=? WHERE id=?',
      [name, email, district_id || null, id]
    );
  }

  static async create({ name, email, password, role, district_id, created_by }) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, district_id, created_by) VALUES (?,?,?,?,?,?)',
      [name, email, password, role, district_id || null, created_by]
    );
    return result.insertId;
  }
}

module.exports = UserModel;
