const pool = require('../config/database');

class TruckModel {
  static async findAll({ page = 1, limit = 10 } = {}) {
    const [rows] = await pool.query(
      'SELECT * FROM trucks ORDER BY plate LIMIT ? OFFSET ?',
      [limit, (page - 1) * limit]
    );
    return rows;
  }

  static async count() {
    const [rows] = await pool.query('SELECT COUNT(*) AS n FROM trucks');
    return rows[0].n;
  }

  static async findAvailable() {
    const [rows] = await pool.query(
      "SELECT id, plate FROM trucks WHERE status != 'maintenance' ORDER BY plate"
    );
    return rows;
  }

  static async countByStatus() {
    const [rows] = await pool.query(
      'SELECT status, COUNT(*) AS n FROM trucks GROUP BY status'
    );
    return rows.reduce((acc, r) => ({ ...acc, [r.status]: r.n }), {});
  }

  static async create({ plate, capacity_t, fill_level, status, created_by }) {
    const [result] = await pool.query(
      'INSERT INTO trucks (plate, capacity_t, fill_level, status, created_by) VALUES (?,?,?,?,?)',
      [plate, capacity_t, fill_level ?? 0, status || 'available', created_by]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM trucks WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async findAllSimple() {
    const [rows] = await pool.query('SELECT id, plate FROM trucks ORDER BY plate');
    return rows;
  }

  static async update(id, { plate, capacity_t, status }) {
    await pool.query(
      'UPDATE trucks SET plate=?, capacity_t=?, status=? WHERE id=?',
      [plate, capacity_t, status, id]
    );
  }

  static async updateFillLevel(id, fill_level) {
    await pool.query('UPDATE trucks SET fill_level=? WHERE id=?', [fill_level, id]);
  }

  static async delete(id) {
    await pool.query('DELETE FROM trucks WHERE id = ?', [id]);
  }
}

module.exports = TruckModel;
