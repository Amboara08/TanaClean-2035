const ComplaintModel         = require('../models/ComplaintModel');
const ComplaintResponseModel = require('../models/ComplaintResponseModel');
const NotificationService    = require('./NotificationService');
const SettingsService        = require('./SettingsService');
const LogService             = require('./LogService');

class ComplaintService {
  static async getAll(filters = {}, { page = 1, limit } = {}) {
    if (!limit) limit = await SettingsService.getPageSize();
    const [complaints, total] = await Promise.all([
      ComplaintModel.findAll({ ...filters, page, limit }),
      ComplaintModel.count(filters),
    ]);
    return { complaints, total, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return ComplaintModel.findById(id);
  }

  static async getRecent() {
    return ComplaintModel.findRecent();
  }

  static async getByCitizen(citizenId, { page = 1 } = {}) {
    const limit = await SettingsService.getPageSize();
    const [complaints, total] = await Promise.all([
      ComplaintModel.findByCitizen(citizenId, { page, limit }),
      ComplaintModel.countByCitizen(citizenId),
    ]);
    return { complaints, total, totalPages: Math.ceil(total / limit) };
  }

  static async updateStatus(id, status, changed_by = null) {
    const old = await ComplaintModel.findById(id);
    await ComplaintModel.updateStatus(id, status);

    const statusLabel = { open: 'Ouverte', processing: 'En traitement', closed: 'Fermée' };
    const label = statusLabel[status] ?? status;

    /* Notifier tous les admins */
    NotificationService.notifyAllAdmins(
      `Réclamation #${id} — statut changé : ${statusLabel[old?.status] ?? old?.status} → ${label}`,
      changed_by,
      `/admin/complaints/${id}`
    ).catch(err => console.error("[notif]", err.message));

    /* Notifier le citoyen qui a déposé la réclamation */
    if (old?.citizen_id) {
      const citizenMsgs = {
        processing: `Votre réclamation #${id} est maintenant prise en charge par notre équipe.`,
        closed:     `Votre réclamation #${id} a été clôturée. Merci de votre signalement.`,
        open:       `Votre réclamation #${id} a été réouverte.`,
      };
      const msg = citizenMsgs[status] ?? `Votre réclamation #${id} est passée à l'état : ${label}.`;
      NotificationService.notify(old.citizen_id, msg, changed_by, '/citizen/complaints').catch(err => console.error("[notif]", err.message));
    }

    LogService.log({
      table_name: 'complaints', record_id: id, action: 'update',
      old_value:  { status: old?.status },
      new_value:  { status },
      changed_by,
    });
  }

  static async getResponses(complaint_id) {
    return ComplaintResponseModel.findByComplaint(complaint_id);
  }

  static async respond(complaint_id, { author_id, content }) {
    const id = await ComplaintResponseModel.create({ complaint_id, author_id, content });
    const complaint = await ComplaintModel.findById(complaint_id);
    if (complaint) {
      await NotificationService.notify(
        complaint.citizen_id,
        `L'administration a répondu à votre réclamation #${complaint_id}.`,
        author_id,
        '/citizen/complaints'
      );
    }
    LogService.log({
      table_name: 'complaints', record_id: complaint_id, action: 'update',
      new_value:  { response: content },
      changed_by: author_id,
    });
    return id;
  }

  static async create(data) {
    const id = await ComplaintModel.create(data);

    const urgentLabel = data.is_urgent ? ' [URGENT]' : '';
    const excerpt     = data.content.length > 60 ? data.content.slice(0, 60) + '…' : data.content;
    NotificationService.notifyAllAdmins(
      `Nouvelle réclamation${urgentLabel} — "${excerpt}"`,
      data.created_by,
      `/admin/complaints/${id}`
    ).catch(err => console.error("[notif]", err.message));

    LogService.log({
      table_name: 'complaints', record_id: id, action: 'create',
      new_value:  { content: data.content, is_urgent: data.is_urgent },
      changed_by: data.created_by,
    });
    return id;
  }
}

module.exports = ComplaintService;
