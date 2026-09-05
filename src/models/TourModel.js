const pool = require('../config/database');

const JOIN_BASE = `
  FROM tours t
  JOIN users     u  ON t.worker_id   = u.id
  JOIN trucks    tk ON t.truck_id    = tk.id
  JOIN districts d  ON t.district_id = d.id
`;

class TourModel {
  static async findByDate(date) {
    const [rows] = await pool.query(`
      SELECT t.id, t.scheduled_at, t.status, t.note,
             u.name AS worker_name,
             tk.plate AS truck_plate, ROUND(tk.fill_level * 100) AS fill_pct,
             d.name AS district_name, d.priority
      ${JOIN_BASE}
      WHERE DATE(t.scheduled_at) = ?
      ORDER BY d.priority DESC, t.scheduled_at ASC
    `, [date]);
    return rows;
  }

  static async countByDate(date) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS n FROM tours WHERE DATE(scheduled_at) = ?', [date]
    );
    return rows[0].n;
  }

  static async countActiveByDate(date) {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS n FROM tours WHERE status = 'active' AND DATE(scheduled_at) = ?",
      [date]
    );
    return rows[0].n;
  }

  static async countActiveWorkersByDate(date) {
    const [rows] = await pool.query(
      "SELECT COUNT(DISTINCT worker_id) AS n FROM tours WHERE status = 'active' AND DATE(scheduled_at) = ?",
      [date]
    );
    return rows[0].n;
  }

  static async findForPlanning({ page = 1, limit = 10 } = {}) {
    const [rows] = await pool.query(`
      SELECT t.id, t.scheduled_at, t.status, t.note,
             u.name AS worker_name,
             tk.plate AS truck_plate,
             d.name AS district_name, d.priority
      ${JOIN_BASE}
      ORDER BY t.scheduled_at DESC
      LIMIT ? OFFSET ?
    `, [limit, (page - 1) * limit]);
    return rows;
  }

  static async countAll() {
    const [rows] = await pool.query('SELECT COUNT(*) AS n FROM tours');
    return rows[0].n;
  }

  static async findByWorkerAndDate(workerId, date) {
    const [rows] = await pool.query(`
      SELECT t.id, t.scheduled_at, t.status, t.note,
             d.name AS district_name, d.priority,
             t.truck_id,
             tk.plate AS truck_plate, tk.fill_level, tk.capacity_t
      ${JOIN_BASE}
      WHERE t.worker_id = ? AND DATE(t.scheduled_at) = ?
      ORDER BY t.scheduled_at ASC
    `, [workerId, date]);
    return rows;
  }

  static async updateWorkerStatus(id, workerId, status) {
    const VALID = ['active', 'done'];
    if (!VALID.includes(status)) throw new Error('Statut invalide');
    await pool.query(
      'UPDATE tours SET status=? WHERE id=? AND worker_id=?',
      [status, id, workerId]
    );
  }

  static async findByWorker(workerId, { page = 1, limit = 10 } = {}) {
    const [rows] = await pool.query(`
      SELECT t.id, t.scheduled_at, t.status, t.note,
             d.name AS district_name, d.priority,
             tk.plate AS truck_plate, ROUND(tk.fill_level * 100) AS fill_pct
      ${JOIN_BASE}
      WHERE t.worker_id = ?
      ORDER BY t.scheduled_at DESC
      LIMIT ? OFFSET ?
    `, [workerId, limit, (page - 1) * limit]);
    return rows;
  }

  static async countByWorker(workerId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS n FROM tours WHERE worker_id = ?', [workerId]
    );
    return rows[0].n;
  }

  static async findNextForDistrict(districtId, date) {
    const [rows] = await pool.query(`
      SELECT t.scheduled_at, d.name AS district_name,
             tk.plate AS truck_plate, u.name AS worker_name
      ${JOIN_BASE}
      WHERE t.district_id = ? AND DATE(t.scheduled_at) = ?
        AND t.status IN ('planned', 'active')
      ORDER BY t.scheduled_at ASC
      LIMIT 1
    `, [districtId, date]);
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await pool.query(`
      SELECT t.*,
             u.name AS worker_name,
             tk.plate AS truck_plate,
             d.name AS district_name, d.priority
      ${JOIN_BASE}
      WHERE t.id = ?
    `, [id]);
    return rows[0] || null;
  }

  static async update(id, { worker_id, truck_id, district_id, scheduled_at, status, note }) {
    await pool.query(
      'UPDATE tours SET worker_id=?, truck_id=?, district_id=?, scheduled_at=?, status=?, note=? WHERE id=?',
      [worker_id, truck_id, district_id, scheduled_at, status, note || null, id]
    );
  }

  static async create({ worker_id, truck_id, district_id, scheduled_at, note, created_by }) {
    const [result] = await pool.query(
      'INSERT INTO tours (worker_id, truck_id, district_id, scheduled_at, note, created_by) VALUES (?,?,?,?,?,?)',
      [worker_id, truck_id, district_id, scheduled_at, note || null, created_by]
    );
    return result.insertId;
  }
}

module.exports = TourModel;
