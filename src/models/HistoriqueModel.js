const pool = require('../config/database');

class HistoriqueModel {
  static _buildWhere({ table_name, action, date_from, date_to }, prefix = 'h.') {
    const conditions = [];
    const params     = [];
    if (table_name) { conditions.push(`${prefix}table_name = ?`);                   params.push(table_name); }
    if (action)     { conditions.push(`${prefix}action = ?`);                        params.push(action); }
    if (date_from)  { conditions.push(`DATE(${prefix}changed_at) >= ?`);             params.push(date_from); }
    if (date_to)    { conditions.push(`DATE(${prefix}changed_at) <= ?`);             params.push(date_to); }
    return { where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params };
  }

  static async findAll({ page = 1, limit = 20, table_name = null, action = null, date_from = null, date_to = null } = {}) {
    const { where, params } = HistoriqueModel._buildWhere({ table_name, action, date_from, date_to });
    const [rows] = await pool.query(`
      SELECT h.id, h.table_name, h.record_id, h.action,
             h.old_value, h.new_value, h.changed_at,
             u.name AS changed_by_name
      FROM historique h
      LEFT JOIN users u ON h.changed_by = u.id
      ${where}
      ORDER BY h.changed_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, (page - 1) * limit]);
    return rows;
  }

  static async count({ table_name = null, action = null, date_from = null, date_to = null } = {}) {
    const { where, params } = HistoriqueModel._buildWhere({ table_name, action, date_from, date_to }, '');
    const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM historique ${where}`, params);
    return n;
  }

  static async distinctTables() {
    const [rows] = await pool.query('SELECT DISTINCT table_name FROM historique ORDER BY table_name');
    return rows.map(r => r.table_name);
  }
}

module.exports = HistoriqueModel;
