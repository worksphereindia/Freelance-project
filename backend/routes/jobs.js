const express = require('express');
const { createJob, getJobs, getMyJobs, getJobMessages, placeBid, acceptBid, getJobBids, deliverJob, getJobById, approveJob, getAiMatches, updateBid, disputeJob, postCounterOffer, acceptCounterOffer, rejectCounterOffer, inviteFreelancer, getJobAssets, uploadJobAsset, deleteJobAsset, createRehireRequest, respondRehireRequest, acceptRehireCounter, rejectRehireCounter } = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validate, jobSchema } = require('../utils/validators');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/assets/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

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
router.post('/:jobId/assets', protect, authorize('client'), upload.single('asset'), uploadJobAsset);
router.delete('/:jobId/assets/:assetId', protect, authorize('client'), deleteJobAsset);

// Rehire / Maintenance negotiation flow
router.post('/:jobId/rehire', protect, authorize('client'), createRehireRequest);
router.post('/:jobId/rehire-respond', protect, authorize('freelancer'), respondRehireRequest);
router.post('/:jobId/rehire-accept-counter', protect, authorize('client'), acceptRehireCounter);
router.post('/:jobId/rehire-reject-counter', protect, authorize('client'), rejectRehireCounter);

module.exports = router;

