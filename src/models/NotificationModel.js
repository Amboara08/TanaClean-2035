const pool = require('../config/database');

class NotificationModel {
  static async findByUser(userId, limit = 10) {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE citizen_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return rows;
  }

  /* Alias conservé pour compatibilité */
  static findByCitizen(citizenId, limit = 10) {
    return NotificationModel.findByUser(citizenId, limit);
  }

  static async countUnread(citizenId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS n FROM notifications WHERE citizen_id = ? AND is_read = 0',
      [citizenId]
    );
    return rows[0].n;
  }

  static async markAllRead(citizenId) {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE citizen_id = ? AND is_read = 0',
      [citizenId]
    );
  }

  static async create({ citizen_id, message, link = null, created_by }) {
    const [result] = await pool.query(
      'INSERT INTO notifications (citizen_id, message, link, created_by) VALUES (?,?,?,?)',
      [citizen_id, message, link, created_by]
    );
    return result.insertId;
  }
}

module.exports = NotificationModel;
