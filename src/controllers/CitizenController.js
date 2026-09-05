const DashboardService       = require('../services/DashboardService');
const ComplaintService       = require('../services/ComplaintService');
const NotificationService    = require('../services/NotificationService');
const DistrictModel          = require('../models/DistrictModel');
const ComplaintResponseModel = require('../models/ComplaintResponseModel');

class CitizenController {
  static async dashboard(req, res) {
    const { id: citizenId, district_id: districtId } = req.session.user;
    const today = new Date().toISOString().slice(0, 10);

    const data = await DashboardService.getCitizenDashboard(citizenId, districtId, today);

    res.render('citizen/dashboard', {
      title: 'Tableau de bord',
      activePage: 'dashboard',
      ...data,
    });
  }

  static async complaints(req, res) {
    const page      = Math.max(1, parseInt(req.query.page) || 1);
    const citizenId = req.session.user.id;

    const [{ complaints, total, totalPages }, districts] = await Promise.all([
      ComplaintService.getByCitizen(citizenId, { page }),
      DistrictModel.findAll(),
    ]);

    const ids       = complaints.map(c => c.id);
    const responses = await ComplaintResponseModel.findByComplaintIds(ids);

    res.render('citizen/complaints', {
      title: 'Mes réclamations', activePage: 'complaints',
      complaints, districts, responses,
      success: req.query.success,
      currentPage: page, totalPages, total, baseParams: '',
    });
  }

  static async createComplaint(req, res) {
    const { district_id, content, is_urgent } = req.body;
    if (!content?.trim()) return res.redirect('/citizen/complaints');

    await ComplaintService.create({
      citizen_id:  req.session.user.id,
      district_id,
      content:     content.trim(),
      is_urgent,
      created_by:  req.session.user.id,
    });
    res.redirect('/citizen/complaints?success=1');
  }

  static async notificationsFragment(req, res) {
    const notifications = await NotificationService.getAndMarkRead(req.session.user.id);
    res.render('citizen/notifications-fragment', { notifications, layout: false });
  }

  static async markAllRead(req, res) {
    await NotificationService.markAllRead(req.session.user.id);
    res.redirect('/citizen');
  }
}

module.exports = CitizenController;
