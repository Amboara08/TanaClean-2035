const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../middleware/auth');
const injectPageSize  = require('../middleware/pageSize');
const AdminController = require('../controllers/AdminController');
const wrap            = require('../utils/asyncHandler');

router.use(requireAuth('admin'));
router.use(injectPageSize);

router.get('/',                       wrap(AdminController.dashboard));
router.get('/map',                    wrap(AdminController.map));
router.post('/map/route',             wrap(AdminController.calculateRoute));
router.get('/planning',               wrap(AdminController.planning));
router.get('/planning/optimize',      wrap(AdminController.optimizePlanning));
router.get('/complaints',             wrap(AdminController.complaints));
router.get('/complaints-fragment',    wrap(AdminController.complaintsFragment));
router.get('/workers',                wrap(AdminController.workers));
router.get('/trucks',                 wrap(AdminController.trucks));
router.get('/settings',               wrap(AdminController.settings));
router.get('/historique',             wrap(AdminController.historique));
router.post('/districts',                       wrap(AdminController.createDistrict));
router.post('/districts/:id/delete',            wrap(AdminController.deleteDistrict));
router.post('/edges',                           wrap(AdminController.createEdge));
router.post('/edges/:fromId/:toId/delete',      wrap(AdminController.deleteEdge));

router.post('/planning',              wrap(AdminController.createTour));
router.post('/trucks',                wrap(AdminController.createTruck));
router.post('/workers',               wrap(AdminController.createWorker));
router.post('/settings',              wrap(AdminController.updateSettings));

/* ── Détail / édition (drawer) ── */
router.get('/trucks/:id',             wrap(AdminController.truckDetail));
router.post('/trucks/:id',            wrap(AdminController.updateTruck));
router.post('/trucks/:id/delete',     wrap(AdminController.deleteTruck));

router.get('/workers/:id',            wrap(AdminController.workerDetail));
router.post('/workers/:id',           wrap(AdminController.updateWorker));

router.get('/planning/:id',           wrap(AdminController.tourDetail));
router.post('/planning/:id',          wrap(AdminController.updateTour));

router.get('/complaints/:id',          wrap(AdminController.complaintDetail));
router.post('/complaints/:id',         wrap(AdminController.updateComplaintDetail));
router.post('/complaints/:id/status',  wrap(AdminController.updateComplaintStatus));
router.post('/complaints/:id/respond', wrap(AdminController.respondToComplaint));

module.exports = router;
