const express           = require('express');
const router            = express.Router();
const { requireAuth, requireWeb }   = require('../middleware/auth');
const CitizenController = require('../controllers/CitizenController');
const wrap              = require('../utils/asyncHandler');

router.use(requireWeb);
router.use(requireAuth('citizen'));

router.get('/',                        wrap(CitizenController.dashboard));
router.get('/notifications-fragment',  wrap(CitizenController.notificationsFragment));
router.get('/complaints',              wrap(CitizenController.complaints));
router.post('/complaints',             wrap(CitizenController.createComplaint));
router.post('/notifications/read-all', wrap(CitizenController.markAllRead));

module.exports = router;
