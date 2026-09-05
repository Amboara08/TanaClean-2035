const pool = require('../config/database');

const JOIN_BASE = `
  FROM complaints c
  JOIN users     u ON c.citizen_id  = u.id
  JOIN districts d ON c.district_id = d.id
`;

class ComplaintModel {
  static async findAll({ status, districtId, page = 1, limit = 10 } = {}) {
    const conditions = ['1=1'];
    const params = [];

    if (status)     { conditions.push('c.status = ?');      params.push(status); }
    if (districtId) { conditions.push('c.district_id = ?'); params.push(districtId); }

    const [rows] = await pool.query(`
      SELECT c.id, c.content, c.is_urgent, c.status, c.created_at,
             u.name AS citizen_name, d.name AS district_name, d.id AS district_id
      ${JOIN_BASE}
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.is_urgent DESC, c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, (page - 1) * limit]);
    return rows;
  }

  static async count({ status, districtId } = {}) {
    const conditions = ['1=1'];
    const params = [];

    if (status)     { conditions.push('status = ?');      params.push(status); }
    if (districtId) { conditions.push('district_id = ?'); params.push(districtId); }

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n FROM complaints WHERE ${conditions.join(' AND ')}`,
      params
    );
    return rows[0].n;
  }

  static async findRecent(limit = 5) {
    const [rows] = await pool.query(`
      SELECT c.id, c.content, c.is_urgent, c.status, c.created_at,
             u.name AS citizen_name, d.name AS district_name
      ${JOIN_BASE}
      ORDER BY c.created_at DESC
      LIMIT ?
    `, [limit]);
    return rows;
  }

  static async countOpen() {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS n FROM complaints WHERE status = 'open'"
    );
    return rows[0].n;
  }

  static async countUrgentOpen() {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS n FROM complaints WHERE status = 'open' AND is_urgent = 1"
    );
    return rows[0].n;
  }

  static async findByCitizen(citizenId, { page = 1, limit = 10 } = {}) {
    const [rows] = await pool.query(`
      SELECT c.*, d.name AS district_name
      FROM complaints c
      JOIN districts d ON c.district_id = d.id
      WHERE c.citizen_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [citizenId, limit, (page - 1) * limit]);
    return rows;
  }

  static async countByCitizen(citizenId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS n FROM complaints WHERE citizen_id = ?', [citizenId]
    );
    return rows[0].n;
  }

  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT c.*, u.name AS citizen_name, d.name AS district_name
      ${JOIN_BASE}
      WHERE c.id = ?
    `, [id]);
    return rows[0] || null;
  }

  static async updateStatus(id, status) {
    await pool.query('UPDATE complaints SET status = ? WHERE id = ?', [status, id]);
  }

  static async create({ citizen_id, district_id, content, is_urgent, created_by }) {
    const [result] = await pool.query(
      'INSERT INTO complaints (citizen_id, district_id, content, is_urgent, created_by) VALUES (?,?,?,?,?)',
      [citizen_id, district_id, content, is_urgent ? 1 : 0, created_by]
    );
    return result.insertId;
  }
}

module.exports = ComplaintModel;
