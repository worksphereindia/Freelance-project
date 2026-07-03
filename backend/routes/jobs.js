const express = require('express');
const { createJob, getJobs, getMyJobs, getJobMessages, placeBid, acceptBid, getJobBids, deliverJob, getJobById, approveJob, getAiMatches, updateBid, disputeJob, postCounterOffer, acceptCounterOffer, rejectCounterOffer, inviteFreelancer, getJobAssets, uploadJobAsset, deleteJobAsset } = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validate, jobSchema } = require('../utils/validators');
const router = express.Router();

router.route('/')
  .get(getJobs)
  .post(protect, authorize('client'), validate(jobSchema), createJob);

router.get('/my-jobs', protect, getMyJobs);
router.get('/job/:jobId', protect, getJobById); // Use /job/:jobId to prevent conflict with other routes
router.get('/:jobId/messages', protect, getJobMessages);
router.get('/:jobId/bids', protect, getJobBids);
router.get('/:jobId/ai-match', protect, authorize('client'), getAiMatches);

router.post('/:jobId/bid', protect, authorize('freelancer'), apiLimiter, placeBid);
router.post('/:jobId/invite/:freelancerId', protect, authorize('client'), inviteFreelancer);
router.post('/:jobId/deliver', protect, authorize('freelancer'), deliverJob);
router.post('/:jobId/approve', protect, authorize('admin'), approveJob);
router.post('/bid/:bidId/accept', protect, authorize('client'), acceptBid);
router.put('/bid/:bidId', protect, authorize('freelancer'), updateBid);
router.post('/bid/:bidId/counter', protect, postCounterOffer);
router.post('/bid/:bidId/counter/accept', protect, acceptCounterOffer);
router.post('/bid/:bidId/counter/reject', protect, rejectCounterOffer);
router.post('/:jobId/dispute', protect, disputeJob);

// Project assets (client shares files with hired freelancer)
router.get('/:jobId/assets', protect, getJobAssets);
router.post('/:jobId/assets', protect, authorize('client'), uploadJobAsset);
router.delete('/:jobId/assets/:assetId', protect, authorize('client'), deleteJobAsset);

module.exports = router;
