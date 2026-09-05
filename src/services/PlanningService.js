const TourModel             = require('../models/TourModel');
const SettingsService       = require('./SettingsService');
const NotificationService   = require('./NotificationService');
const LogService            = require('./LogService');

class PlanningService {
  static async getToursForDate(date) {
    return TourModel.findByDate(date);
  }

  static async getAll({ page = 1, limit } = {}) {
    if (!limit) limit = await SettingsService.getPageSize();
    const [tours, total] = await Promise.all([
      TourModel.findForPlanning({ page, limit }),
      TourModel.countAll(),
    ]);
    return { tours, total, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return TourModel.findById(id);
  }

  static async update(id, data) {
    const old = await TourModel.findById(id);
    await TourModel.update(id, data);
    const updated = await TourModel.findById(id);

    const statusLabel = { planned: 'Planifiée', active: 'En cours', done: 'Terminée', cancelled: 'Annulée' };
    const statusChanged  = old?.status !== data.status;
    const workerChanged  = String(old?.worker_id) !== String(data.worker_id);
    const districtChanged = String(old?.district_id) !== String(data.district_id);

    /* ── Admins ── */
    if (statusChanged) {
      NotificationService.notifyAllAdmins(
        `Tournée #${id} (${updated?.district_name}) — statut : ${statusLabel[old?.status] ?? old?.status} → ${statusLabel[data.status] ?? data.status}`,
        data.changed_by ?? null,
        `/admin/planning/${id}`
      ).catch(err => console.error("[notif]", err.message));
    } else if (workerChanged) {
      NotificationService.notifyAllAdmins(
        `Tournée #${id} (${updated?.district_name}) — éboueur réassigné : ${updated?.worker_name}`,
        data.changed_by ?? null,
        `/admin/planning/${id}`
      ).catch(err => console.error("[notif]", err.message));
    }

    /* ── Éboueur ── */
    if (statusChanged && updated?.worker_id) {
      /* L'éboueur actuel est informé du nouveau statut */
      NotificationService.notify(
        updated.worker_id,
        `Votre tournée #${id} (${updated.district_name}) est passée à l'état : ${statusLabel[data.status] ?? data.status}.`,
        data.changed_by ?? null,
        '/worker/schedule'
      ).catch(err => console.error("[notif]", err.message));
    }
    if (workerChanged) {
      /* L'ancien éboueur perd la tournée */
      if (old?.worker_id) {
        NotificationService.notify(
          old.worker_id,
          `La tournée #${id} (${updated?.district_name}) ne vous est plus assignée.`,
          data.changed_by ?? null,
          '/worker/schedule'
        ).catch(err => console.error("[notif]", err.message));
      }
      /* Le nouvel éboueur reçoit la tournée */
      if (updated?.worker_id) {
        const dt  = new Date(data.scheduled_at || updated.scheduled_at);
        const fmt = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        NotificationService.notify(
          updated.worker_id,
          `Vous avez été assigné à la tournée de ${updated.district_name} le ${fmt}.`,
          data.changed_by ?? null,
          '/worker/schedule'
        ).catch(err => console.error("[notif]", err.message));
      }
    }

    /* ── Citoyens du quartier ── */
    if (statusChanged) {
      const districtId = updated?.district_id ?? old?.district_id;
      if (data.status === 'active') {
        NotificationService.notifyDistrict(
          districtId,
          `Le camion de collecte est maintenant en route dans votre quartier (${updated?.district_name}). Soyez prêts !`,
          data.changed_by ?? null,
          '/citizen'
        ).catch(err => console.error("[notif]", err.message));
      } else if (data.status === 'cancelled') {
        NotificationService.notifyDistrict(
          districtId,
          `La tournée de collecte prévue dans votre quartier (${updated?.district_name}) a été annulée.`,
          data.changed_by ?? null,
          '/citizen'
        ).catch(err => console.error("[notif]", err.message));
      } else if (data.status === 'done') {
        NotificationService.notifyDistrict(
          districtId,
          `La collecte dans votre quartier (${updated?.district_name}) est terminée. Merci de votre coopération !`,
          data.changed_by ?? null,
          '/citizen'
        ).catch(err => console.error("[notif]", err.message));
      }
    }
    if (districtChanged && updated?.district_id) {
      /* Le nouveau quartier est informé qu'une tournée le concerne désormais */
      const dt  = new Date(data.scheduled_at || updated.scheduled_at);
      const fmt = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      NotificationService.notifyDistrict(
        updated.district_id,
        `Un passage de collecte a été planifié dans votre quartier (${updated.district_name}) le ${fmt}.`,
        data.changed_by ?? null,
        '/citizen'
      ).catch(err => console.error("[notif]", err.message));
    }

    LogService.log({
      table_name: 'tours', record_id: id, action: 'update',
      old_value:  { status: old?.status },
      new_value:  { status: data.status },
      changed_by: data.changed_by ?? null,
    });
  }

  static async create(data) {
    const id   = await TourModel.create(data);
    const tour = await TourModel.findById(id);

    /* BF12 — notifier les citoyens du quartier */
    const dt  = new Date(data.scheduled_at);
    const fmt = dt.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    });
    const msg = `Le camion passera dans votre quartier (${tour.district_name}) le ${fmt}. Préparez vos déchets.`;
    NotificationService.notifyDistrict(data.district_id, msg, data.created_by, '/citizen').catch(err => console.error("[notif]", err.message));

    /* Notifier tous les admins de la nouvelle assignation */
    NotificationService.notifyAllAdmins(
      `Nouvelle tournée créée — ${tour.worker_name} → ${tour.district_name} le ${fmt}`,
      data.created_by,
      `/admin/planning/${id}`
    ).catch(err => console.error("[notif]", err.message));

    /* Notifier l'éboueur assigné */
    NotificationService.notify(
      data.worker_id,
      `Vous avez été assigné à la tournée de ${tour.district_name} le ${fmt}.`,
      data.created_by,
      '/worker/schedule'
    ).catch(err => console.error("[notif]", err.message));

    /* BF16 — journaliser */
    LogService.log({
      table_name: 'tours', record_id: id, action: 'create',
      new_value:  { district: tour.district_name, worker: tour.worker_name, scheduled_at: data.scheduled_at },
      changed_by: data.created_by,
    });

    return id;
  }
}

module.exports = PlanningService;
