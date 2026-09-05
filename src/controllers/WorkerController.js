const DashboardService      = require('../services/DashboardService');
const TourModel             = require('../models/TourModel');
const TruckModel            = require('../models/TruckModel');
const SettingsService       = require('../services/SettingsService');
const LogService            = require('../services/LogService');
const NotificationService   = require('../services/NotificationService');

class WorkerController {
  static async dashboard(req, res) {
    const today = new Date().toISOString().slice(0, 10);
    const { myTours, activeTour } = await DashboardService.getWorkerDashboard(
      req.session.user.id,
      today
    );

    const currentTruck = activeTour
      ? {
          id:         activeTour.truck_id,
          plate:      activeTour.truck_plate,
          fill_level: activeTour.fill_level,
          capacity_t: activeTour.capacity_t,
        }
      : null;

    res.render('worker/dashboard', {
      title: 'Tableau de bord',
      activePage: 'dashboard',
      myTours,
      currentTruck,
    });
  }

  static async schedule(req, res) {
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const workerId = req.session.user.id;
    const limit    = await SettingsService.getPageSize();

    const [tours, total] = await Promise.all([
      TourModel.findByWorker(workerId, { page, limit }),
      TourModel.countByWorker(workerId),
    ]);

    res.render('worker/schedule', {
      title: 'Mon planning', activePage: 'schedule',
      tours, currentPage: page,
      totalPages: Math.ceil(total / limit),
      total, baseParams: '',
    });
  }

  /* POST /worker/schedule/:id/status
     Appelé via HTMX (dashboard) ou formulaire classique (schedule) */
  static async updateTourStatus(req, res) {
    const tourId   = parseInt(req.params.id);
    const workerId = req.session.user.id;
    const { status } = req.body;

    if (!['active', 'done'].includes(status)) {
      return res.status(400).send('Statut invalide');
    }

    const tourBefore = await TourModel.findById(tourId);
    await TourModel.updateWorkerStatus(tourId, workerId, status);
    LogService.log({ table_name: 'tours', record_id: tourId, action: 'update', new_value: { status }, changed_by: workerId });

    const statusLabel  = { active: 'En cours', done: 'Terminée' };
    const workerName   = req.session.user.name;
    const districtName = tourBefore?.district_name ?? `#${tourId}`;
    const districtId   = tourBefore?.district_id;

    /* Admins */
    NotificationService.notifyAllAdmins(
      `Tournée ${districtName} — ${workerName} a marqué la tournée comme : ${statusLabel[status] ?? status}`,
      workerId,
      `/admin/planning/${tourId}`
    ).catch(err => console.error("[notif]", err.message));

    /* Citoyens du quartier */
    if (districtId) {
      if (status === 'active') {
        NotificationService.notifyDistrict(
          districtId,
          `Le camion de collecte est maintenant en route dans votre quartier (${districtName}). Soyez prêts !`,
          workerId,
          '/citizen'
        ).catch(err => console.error("[notif]", err.message));
      } else if (status === 'done') {
        NotificationService.notifyDistrict(
          districtId,
          `La collecte dans votre quartier (${districtName}) est terminée. Merci de votre coopération !`,
          workerId,
          '/citizen'
        ).catch(err => console.error("[notif]", err.message));
      }
    }

    // Requête HTMX → retourner le fragment du panneau des tournées du jour
    if (req.headers['hx-request']) {
      const today = new Date().toISOString().slice(0, 10);
      const { myTours, activeTour } = await DashboardService.getWorkerDashboard(workerId, today);
      const currentTruck = activeTour
        ? {
            id:         activeTour.truck_id,
            plate:      activeTour.truck_plate,
            fill_level: activeTour.fill_level,
            capacity_t: activeTour.capacity_t,
          }
        : null;
      return res.render('worker/fragments/tours-today', {
        layout: false, myTours, currentTruck,
      });
    }

    // Formulaire classique → rediriger
    res.redirect('/worker/schedule');
  }

  /* POST /worker/truck/:id/fill
     Met à jour le remplissage du camion (slider 0-100 → 0.00-1.00 en DB) */
  static async updateFillLevel(req, res) {
    const truckId  = parseInt(req.params.id);
    const workerId = req.session.user.id;

    // Vérification : ce camion est-il bien assigné à cet éboueur aujourd'hui ?
    const today   = new Date().toISOString().slice(0, 10);
    const myTours = await TourModel.findByWorkerAndDate(workerId, today);
    if (!myTours.some(t => t.truck_id === truckId)) {
      return res.status(403).send('');
    }

    const raw = parseFloat(req.body.fill_level);
    if (isNaN(raw) || raw < 0 || raw > 100) return res.status(400).send('');

    await TruckModel.updateFillLevel(truckId, raw / 100);

    const truck = await TruckModel.findById(truckId);

    /* Alerter les admins si remplissage critique (≥ 80 %) */
    if (raw >= 80) {
      const pct = Math.round(raw);
      NotificationService.notifyAllAdmins(
        `Camion ${truck.plate} — taux de remplissage critique : ${pct} %`,
        workerId,
        `/admin/trucks/${truckId}`
      ).catch(err => console.error("[notif]", err.message));
    }
    return res.render('worker/fragments/fill-widget', {
      layout: false,
      currentTruck: {
        id:         truck.id,
        plate:      truck.plate,
        fill_level: truck.fill_level,
        capacity_t: truck.capacity_t,
      },
    });
  }
}

module.exports = WorkerController;
