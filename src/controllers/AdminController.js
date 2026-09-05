const HistoriqueModel    = require('../models/HistoriqueModel');
const DashboardService   = require('../services/DashboardService');
const PlanningService    = require('../services/PlanningService');
const ComplaintService   = require('../services/ComplaintService');
const TruckService       = require('../services/TruckService');
const StaffService       = require('../services/StaffService');
const SettingsService    = require('../services/SettingsService');
const LogService         = require('../services/LogService');
const DistrictModel      = require('../models/DistrictModel');
const TourModel          = require('../models/TourModel');
const { dijkstra }       = require('../algorithms/dijkstra');
const { greedySchedule } = require('../algorithms/greedy');
const { UnionFind }      = require('../algorithms/union-find');

class AdminController {
  static async dashboard(req, res) {
    const today = new Date().toISOString().slice(0, 10);

    const [stats, toursToday, recentComplaints] = await Promise.all([
      DashboardService.getAdminStats(today),
      PlanningService.getToursForDate(today),
      ComplaintService.getRecent(),
    ]);

    res.render('admin/dashboard', {
      title: 'Tableau de bord',
      activePage: 'dashboard',
      stats,
      toursToday,
      recentComplaints,
    });
  }

  static async map(req, res) {
    const [districts, edges] = await Promise.all([
      DistrictModel.findAllWithCoords(),
      DistrictModel.findEdges(),
    ]);
    res.render('admin/map', {
      title: 'Carte', activePage: 'map',
      districts, edges,
      districtsJson: JSON.stringify(districts),
      edgesJson:     JSON.stringify(edges),
    });
  }

  static async calculateRoute(req, res) {
    const from = parseInt(req.body.from);
    const to   = parseInt(req.body.to);

    if (!from || !to) {
      return res.render('admin/fragments/map-result', {
        layout: false, error: 'Veuillez sélectionner un quartier de départ et d\'arrivée.', result: null,
      });
    }
    if (from === to) {
      return res.render('admin/fragments/map-result', {
        layout: false, error: 'Le départ et l\'arrivée sont identiques.', result: null,
      });
    }

    const [graph, districts] = await Promise.all([
      DistrictModel.buildGraph(),
      DistrictModel.findAllWithCoords(),
    ]);

    const nameMap   = new Map(districts.map(d => [d.id, d.name]));
    const coordsMap = new Map(districts.map(d => [d.id, { lat: d.lat, lng: d.lng }]));
    const { distance, path } = dijkstra(graph, from, to);

    if (distance === null) {
      return res.render('admin/fragments/map-result', {
        layout: false,
        error: `Aucun chemin trouvé entre ${nameMap.get(from)} et ${nameMap.get(to)}.`,
        result: null,
      });
    }

    const pathNodes = path.map(id => ({
      id,
      name: nameMap.get(id),
      lat:  coordsMap.get(id)?.lat,
      lng:  coordsMap.get(id)?.lng,
    }));

    res.render('admin/fragments/map-result', {
      layout: false,
      error: null,
      result: { distance, path: pathNodes, from: nameMap.get(from), to: nameMap.get(to) },
    });
  }

  /* GET /admin/planning/optimize — Glouton HTMX */
  static async optimizePlanning(req, res) {
    const today = new Date().toISOString().slice(0, 10);

    const [tours, graph, districtRows] = await Promise.all([
      TourModel.findByDate(today),
      DistrictModel.buildGraph(),
      DistrictModel.findAll(),
    ]);

    const planned = tours.filter(t => t.status === 'planned');
    const nameMap = new Map(districtRows.map(d => [d.id, d]));
    const DEPOT   = 1; // Analakely = dépôt de référence

    // Pour chaque tournée planifiée, calcule la distance depuis le dépôt
    const withDist = planned.map(t => {
      const { distance } = dijkstra(graph, DEPOT, t.district_id);
      return {
        ...t,
        distance: distance ?? 999,
        priority: nameMap.get(t.district_id)?.priority ?? 1,
      };
    });

    const ordered = greedySchedule(withDist);

    // Sectorisation Union-Find : regroupe les districts par composant connexe
    const uf = new UnionFind(districtRows.length);
    for (const [, neighbors] of graph) {
      for (const { to } of neighbors) {
        // (union par from_id — on parcourt les edges)
      }
    }
    // Union sur toutes les arêtes (pour la sectorisation)
    for (const [nodeId, neighbors] of graph) {
      for (const { to } of neighbors) {
        uf.union(nodeId, to);
      }
    }
    const districtIds   = districtRows.map(d => d.id);
    const sectors       = uf.getSectors(districtIds);
    const sectorCount   = sectors.size;

    res.render('admin/fragments/optimize-result', {
      layout: false,
      tours:       ordered,
      sectorCount,
      totalTours:  planned.length,
    });
  }

  static async planning(req, res) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = res.locals.pageSize;
    const [{ tours, total, totalPages }, workers, trucks, districts] = await Promise.all([
      PlanningService.getAll({ page, limit }),
      StaffService.getWorkers(),
      TruckService.getAvailable(),
      DistrictModel.findAllByPriority(),
    ]);
    res.render('admin/planning', {
      title: 'Planning',
      activePage: 'planning',
      tours, workers, trucks, districts,
      currentPage: page, totalPages, total, baseParams: '',
      autoOpen: req.query.open || null,
    });
  }

  static async complaints(req, res) {
    const { status, district, page: pageStr, open } = req.query;
    const page = Math.max(1, parseInt(pageStr) || 1);
    const filters = { status, districtId: district };
    const { page: _p, open: _o, ...rest } = req.query;

    const limit = res.locals.pageSize;
    const [{ complaints, total, totalPages }, districts] = await Promise.all([
      ComplaintService.getAll(filters, { page, limit }),
      DistrictModel.findAll(),
    ]);

    const hxConfig = { hxGet: '/admin/complaints-fragment', hxTarget: '#complaints-list' };

    res.render('admin/complaints', {
      title: 'Réclamations', activePage: 'complaints',
      complaints, districts,
      filters: { status, district },
      currentPage: page, totalPages, total,
      baseParams: new URLSearchParams(rest).toString(),
      hxConfig,
      autoOpen: open || null,
    });
  }

  static async complaintsFragment(req, res) {
    const { status, district, page: pageStr } = req.query;
    const page = Math.max(1, parseInt(pageStr) || 1);
    const filters = { status, districtId: district };
    const { page: _p, ...rest } = req.query;

    const limit = res.locals.pageSize;
    const { complaints, total, totalPages } = await ComplaintService.getAll(filters, { page, limit });

    const hxConfig = { hxGet: '/admin/complaints-fragment', hxTarget: '#complaints-list' };

    res.render('admin/complaints-fragment', {
      complaints, layout: false,
      currentPage: page, totalPages, total,
      baseParams: new URLSearchParams(rest).toString(),
      hxConfig,
    });
  }

  static async workers(req, res) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = res.locals.pageSize;
    const [{ workers, total, totalPages }, districts] = await Promise.all([
      StaffService.getWorkersWithDistrict({ page, limit }),
      DistrictModel.findAll(),
    ]);
    res.render('admin/workers', {
      title: 'Éboueurs', activePage: 'workers',
      workers, districts,
      currentPage: page, totalPages, total, baseParams: '',
      autoOpen: req.query.open || null,
    });
  }

  static async trucks(req, res) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = res.locals.pageSize;
    const { trucks, total, totalPages } = await TruckService.getAll({ page, limit });
    res.render('admin/trucks', {
      title: 'Camions', activePage: 'trucks',
      trucks,
      currentPage: page, totalPages, total, baseParams: '',
      autoOpen: req.query.open || null,
    });
  }

  static async createTour(req, res) {
    const { worker_id, truck_id, district_id, scheduled_at, note } = req.body;
    await PlanningService.create({
      worker_id, truck_id, district_id, scheduled_at,
      note, created_by: req.session.user.id,
    });
    res.redirect('/admin/planning');
  }

  static async updateComplaintStatus(req, res) {
    await ComplaintService.updateStatus(req.params.id, req.body.status, req.session.user.id);
    res.redirect('/admin/complaints');
  }

  static async createTruck(req, res) {
    const { plate, capacity_t, status } = req.body;
    await TruckService.create({
      plate:      plate.trim(),
      capacity_t: parseFloat(capacity_t),
      fill_level: 0,
      status:     status || 'available',
      created_by: req.session.user.id,
    });
    res.redirect('/admin/trucks');
  }

  static async deleteTruck(req, res) {
    await TruckService.delete(req.params.id, req.session.user.id);
    res.redirect('/admin/trucks');
  }

  static async createWorker(req, res) {
    const { name, email, password, district_id } = req.body;
    await StaffService.createWorker({
      name: name.trim(), email: email.trim(),
      password: password || 'worker123',
      district_id: district_id || null,
      created_by: req.session.user.id,
    });
    res.redirect('/admin/workers');
  }

  static async truckDetail(req, res) {
    if (!req.headers['hx-request']) return res.redirect(`/admin/trucks?open=${req.params.id}`);
    const truck = await TruckService.getById(req.params.id);
    if (!truck) return res.status(404).send('');
    res.render('admin/fragments/truck-detail', { layout: false, truck, success: false });
  }

  static async updateTruck(req, res) {
    const { plate, capacity_t, status } = req.body;
    await TruckService.update(req.params.id, {
      plate:      plate.trim(),
      capacity_t: parseFloat(capacity_t),
      status,
    }, req.session.user.id);
    const truck = await TruckService.getById(req.params.id);
    res.render('admin/fragments/truck-detail', { layout: false, truck, success: true });
  }

  static async workerDetail(req, res) {
    if (!req.headers['hx-request']) return res.redirect(`/admin/workers?open=${req.params.id}`);
    const [worker, districts] = await Promise.all([
      StaffService.getWorkerById(req.params.id),
      DistrictModel.findAll(),
    ]);
    if (!worker) return res.status(404).send('');
    res.render('admin/fragments/worker-detail', { layout: false, worker, districts, success: false });
  }

  static async updateWorker(req, res) {
    const { name, email, district_id } = req.body;
    await StaffService.updateWorker(req.params.id, {
      name: name.trim(), email: email.trim(), district_id: district_id || null,
    });
    const [worker, districts] = await Promise.all([
      StaffService.getWorkerById(req.params.id),
      DistrictModel.findAll(),
    ]);
    res.render('admin/fragments/worker-detail', { layout: false, worker, districts, success: true });
  }

  static async tourDetail(req, res) {
    if (!req.headers['hx-request']) return res.redirect(`/admin/planning?open=${req.params.id}`);
    const [tour, workers, trucks, districts] = await Promise.all([
      PlanningService.getById(req.params.id),
      StaffService.getWorkers(),
      TruckService.getAllSimple(),
      DistrictModel.findAllByPriority(),
    ]);
    if (!tour) return res.status(404).send('');
    res.render('admin/fragments/tour-detail', { layout: false, tour, workers, trucks, districts, success: false });
  }

  static async updateTour(req, res) {
    const { worker_id, truck_id, district_id, scheduled_at, status, note } = req.body;
    await PlanningService.update(req.params.id, {
      worker_id, truck_id, district_id, scheduled_at, status, note,
      changed_by: req.session.user.id,
    });
    const [tour, workers, trucks, districts] = await Promise.all([
      PlanningService.getById(req.params.id),
      StaffService.getWorkers(),
      TruckService.getAllSimple(),
      DistrictModel.findAllByPriority(),
    ]);
    res.render('admin/fragments/tour-detail', { layout: false, tour, workers, trucks, districts, success: true });
  }

  static async complaintDetail(req, res) {
    if (!req.headers['hx-request']) return res.redirect(`/admin/complaints?open=${req.params.id}`);
    const [complaint, responses] = await Promise.all([
      ComplaintService.getById(req.params.id),
      ComplaintService.getResponses(req.params.id),
    ]);
    if (!complaint) return res.status(404).send('');
    res.render('admin/fragments/complaint-detail', { layout: false, complaint, responses, success: false });
  }

  static async updateComplaintDetail(req, res) {
    await ComplaintService.updateStatus(req.params.id, req.body.status, req.session.user.id);
    const [complaint, responses] = await Promise.all([
      ComplaintService.getById(req.params.id),
      ComplaintService.getResponses(req.params.id),
    ]);
    res.render('admin/fragments/complaint-detail', { layout: false, complaint, responses, success: true });
  }

  static async respondToComplaint(req, res) {
    const { content } = req.body;
    if (content && content.trim()) {
      await ComplaintService.respond(req.params.id, {
        author_id: req.session.user.id,
        content:   content.trim(),
      });
    }
    const [complaint, responses] = await Promise.all([
      ComplaintService.getById(req.params.id),
      ComplaintService.getResponses(req.params.id),
    ]);
    res.render('admin/fragments/complaint-detail', { layout: false, complaint, responses, success: true });
  }

  static async createDistrict(req, res) {
    const { name, priority, lat, lng } = req.body;
    if (!name || !name.trim()) return res.redirect('/admin/map');

    const newId = await DistrictModel.create({
      name:       name.trim(),
      priority:   parseInt(priority) || 2,
      lat:        lat  ? parseFloat(lat)  : null,
      lng:        lng  ? parseFloat(lng)  : null,
      created_by: req.session.user.id,
    });

    const district = await DistrictModel.findById(newId);
    LogService.log({
      table_name: 'districts', record_id: newId, action: 'create',
      new_value:  { name: district.name, priority: district.priority },
      changed_by: req.session.user.id,
    });
    res.render('admin/fragments/district-created', { layout: false, district });
  }

  static async deleteDistrict(req, res) {
    await DistrictModel.delete(req.params.id);
    LogService.log({
      table_name: 'districts', record_id: parseInt(req.params.id), action: 'delete',
      changed_by: req.session.user.id,
    });
    res.json({ ok: true });
  }

  static async createEdge(req, res) {
    const from_id  = parseInt(req.body.from_id);
    const to_id    = parseInt(req.body.to_id);
    const distance = parseFloat(req.body.distance);

    if (!from_id || !to_id || from_id === to_id || !distance || distance <= 0) {
      return res.redirect('/admin/map');
    }

    await DistrictModel.createEdge(from_id, to_id, distance);
    const [dFrom, dTo] = await Promise.all([
      DistrictModel.findById(from_id),
      DistrictModel.findById(to_id),
    ]);
    res.render('admin/fragments/edge-created', { layout: false, from: dFrom, to: dTo, distance });
  }

  static async deleteEdge(req, res) {
    await DistrictModel.deleteEdge(parseInt(req.params.fromId), parseInt(req.params.toId));
    res.json({ ok: true });
  }

  static async historique(req, res) {
    const page       = parseInt(req.query.page) || 1;
    const table_name = req.query.table     || null;
    const action     = req.query.action    || null;
    const date_from  = req.query.date_from || null;
    const date_to    = req.query.date_to   || null;
    const limit      = 25;

    const filters = { table_name, action, date_from, date_to };

    const [entries, total, tables] = await Promise.all([
      HistoriqueModel.findAll({ page, limit, ...filters }),
      HistoriqueModel.count(filters),
      HistoriqueModel.distinctTables(),
    ]);

    const { page: _p, ...restQuery } = req.query;

    res.render('admin/historique', {
      title: 'Historique', activePage: 'historique',
      entries, total,
      totalPages:  Math.ceil(total / limit),
      currentPage: page,
      page, table_name, action, date_from, date_to, tables,
      baseParams: new URLSearchParams(restQuery).toString(),
    });
  }

  static async settings(req, res) {
    res.render('admin/settings', {
      title: 'Paramètres', activePage: 'settings',
      currentPageSize: res.locals.pageSize,
      success: req.query.success,
    });
  }

  static async updateSettings(req, res) {
    const n = parseInt(req.body.page_size, 10);
    await SettingsService.setPageSize(n);
    // Stocker dans la session → le middleware injectPageSize utilisera cette valeur dès la prochaine requête
    req.session.pageSize = n;
    res.redirect('/admin/settings?success=1');
  }
}

module.exports = AdminController;
