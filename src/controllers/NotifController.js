const NotificationModel = require('../models/NotificationModel');

class NotifController {
  /* GET /notif/count — fragment badge (HTMX polling) */
  static async count(req, res) {
    const user = req.session.user;
    if (!user) return res.send('');
    const n = await NotificationModel.countUnread(user.id);
    res.render('partials/notif-badge', { layout: false, count: n });
  }

  /* GET /notif/list — dropdown (chargé au clic) */
  static async list(req, res) {
    const user = req.session.user;
    if (!user) return res.send('');

    const rows = await NotificationModel.findByUser(user.id, 10);
    const fallback = user.role === 'admin' ? '/admin'
                   : user.role === 'citizen' ? '/citizen'
                   : '/worker';
    const items = rows.map(r => ({
      id:      r.id,
      body:    r.message,
      date:    r.created_at,
      urgent:  r.message.includes('[URGENT]'),
      link:    r.link || fallback,
      is_read: r.is_read,
    }));

    res.render('partials/notif-list', { layout: false, items, role: user.role });
  }

  /* POST /notif/mark-read — marque toutes lues (tous rôles) */
  static async markRead(req, res) {
    const user = req.session.user;
    if (user) {
      await NotificationModel.markAllRead(user.id);
    }
    res.send('');
  }
}

module.exports = NotifController;
