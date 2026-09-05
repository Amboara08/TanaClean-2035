const express          = require('express');
const router           = express.Router();
const { requireAuth, requireWeb }  = require('../middleware/auth');
const WorkerController = require('../controllers/WorkerController');
const wrap             = require('../utils/asyncHandler');

router.use(requireWeb);
router.use(requireAuth('worker'));

router.get('/',                        wrap(WorkerController.dashboard));
router.get('/schedule',                wrap(WorkerController.schedule));
router.post('/schedule/:id/status',    wrap(WorkerController.updateTourStatus));
router.post('/truck/:id/fill',         wrap(WorkerController.updateFillLevel));

module.exports = router;
