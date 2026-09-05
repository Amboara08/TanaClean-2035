const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../middleware/auth');
const NotifController = require('../controllers/NotifController');
const wrap            = require('../utils/asyncHandler');

router.use(requireAuth());

router.get('/count',      wrap(NotifController.count));
router.get('/list',       wrap(NotifController.list));
router.post('/mark-read', wrap(NotifController.markRead));

module.exports = router;
