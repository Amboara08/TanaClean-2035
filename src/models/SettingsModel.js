const db = require('../config/database');

class SettingsModel {
  static async get(key) {
    const [rows] = await db.execute('SELECT value FROM settings WHERE `key` = ?', [key]);
    return rows[0]?.value ?? null;
  }

  static async set(key, value) {
    await db.execute(
      'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
      [key, String(value)]
    );
  }
}

module.exports = SettingsModel;
