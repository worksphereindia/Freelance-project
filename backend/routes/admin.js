const express = require('express');
const { getStats, deleteUser, deleteJob, approveFreelancer, revokeFreelancer, resolveDispute, getDisputeMessages, getContactMessages, resolveContactMessage, replyContactMessage, getViolations, getAuditLogs } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.delete('/users/:id', deleteUser);
router.delete('/jobs/:id', deleteJob);
router.post('/approve-freelancer/:id', approveFreelancer);
router.post('/revoke-freelancer/:id', revokeFreelancer);
router.post('/resolve-dispute/:id', resolveDispute);
router.get('/resolve-dispute/:id/messages', getDisputeMessages);
router.get('/contact-messages', getContactMessages);
router.put('/contact-messages/:id/resolve', resolveContactMessage);
router.post('/contact-messages/:id/reply', replyContactMessage);
router.get('/violations', getViolations);
router.get('/audit-logs', getAuditLogs);


module.exports = router;
