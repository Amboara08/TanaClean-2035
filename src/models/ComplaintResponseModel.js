const pool = require('../config/database');

class ComplaintResponseModel {
  static async create({ complaint_id, author_id, content }) {
    const [result] = await pool.query(
      'INSERT INTO complaint_responses (complaint_id, author_id, content) VALUES (?,?,?)',
      [complaint_id, author_id, content]
    );
    return result.insertId;
  }

  static async findByComplaint(complaint_id) {
    const [rows] = await pool.query(`
      SELECT cr.id, cr.content, cr.created_at, u.name AS author_name, u.role AS author_role
      FROM complaint_responses cr
      JOIN users u ON cr.author_id = u.id
      WHERE cr.complaint_id = ?
      ORDER BY cr.created_at ASC
    `, [complaint_id]);
    return rows;
  }

  /* Charge toutes les réponses pour une liste de réclamations en une seule requête */
  static async findByComplaintIds(ids) {
    if (!ids.length) return new Map();
    const [rows] = await pool.query(`
      SELECT cr.complaint_id, cr.id, cr.content, cr.created_at,
             u.name AS author_name, u.role AS author_role
      FROM complaint_responses cr
      JOIN users u ON cr.author_id = u.id
      WHERE cr.complaint_id IN (?)
      ORDER BY cr.created_at ASC
    `, [ids]);
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.complaint_id)) map.set(row.complaint_id, []);
      map.get(row.complaint_id).push(row);
    }
    return map;
  }
}

module.exports = ComplaintResponseModel;
