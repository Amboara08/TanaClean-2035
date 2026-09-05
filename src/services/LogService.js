const pool = require('../config/database');

class LogService {
  static log({ table_name, record_id, action, old_value = null, new_value = null, changed_by = null }) {
    pool.query(
      'INSERT INTO historique (table_name, record_id, action, old_value, new_value, changed_by) VALUES (?,?,?,?,?,?)',
      [
        table_name,
        record_id,
        action,
        old_value  ? JSON.stringify(old_value)  : null,
        new_value  ? JSON.stringify(new_value)  : null,
        changed_by ?? null,
      ]
    ).catch(() => {});
  }
}

module.exports = LogService;
