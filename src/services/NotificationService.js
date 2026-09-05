const pool              = require('../config/database');
const NotificationModel = require('../models/NotificationModel');

class NotificationService {
  static async getAndMarkRead(userId) {
    const notifications = await NotificationModel.findByUser(userId);
    await NotificationModel.markAllRead(userId);
    return notifications;
  }

  static async markAllRead(userId) {
    return NotificationModel.markAllRead(userId);
  }

  /* Notifie un seul utilisateur */
  static async notify(user_id, message, created_by = null, link = null) {
    return NotificationModel.create({ citizen_id: user_id, message, link, created_by });
  }

  /* Notifie tous les admins */
  static async notifyAllAdmins(message, created_by = null, link = null) {
    const [admins] = await pool.query(
      'SELECT id FROM users WHERE role = ?',
      ['admin']
    );
    for (const { id } of admins) {
      await NotificationModel.create({ citizen_id: id, message, link, created_by });
    }
    return admins.length;
  }

  /* BF12 — Notifie tous les citoyens d'un quartier */
  static async notifyDistrict(district_id, message, created_by, link = null) {
    const [citizens] = await pool.query(
      'SELECT id FROM users WHERE role = ? AND district_id = ?',
      ['citizen', district_id]
    );
    for (const { id } of citizens) {
      await NotificationModel.create({ citizen_id: id, message, link, created_by });
    }
    return citizens.length;
  }
}

module.exports = NotificationService;
