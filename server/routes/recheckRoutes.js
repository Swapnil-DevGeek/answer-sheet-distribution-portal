const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const {
createRecheckRequest,
getRecheckRequests,
getRecheckRequestById,
updateRecheckRequest
} = require('../controllers/recheckController');
// All endpoints require authentication.
router.use(authMiddleware);
// POST /api/rechecks – Only students can create recheck requests.
router.post('/', authorizeRoles('student'), createRecheckRequest);
// GET /api/rechecks – All roles can retrieve recheck requests (controller filters results based on role).
router.get('/', getRecheckRequests);
// GET /api/rechecks/:id – Retrieve a specific recheck request.
router.get('/:id', getRecheckRequestById);
// PUT /api/rechecks/:id – Professors and TAs update the recheck request.
router.put('/:id', authorizeRoles('professor', 'ta'), updateRecheckRequest);
module.exports = router;