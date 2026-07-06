import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { Loader2, MessageSquare, CheckSquare, CreditCard, Landmark, Compass, Briefcase, FileText, Sparkles, BrainCircuit, Star, Wallet, CheckCircle, History, Wrench, DollarSign, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import Avatar from '../components/Avatar';
import TalentDirectory from '../components/TalentDirectory';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState(user?.role === 'client' ? 'talents' : 'discover'); // 'talents', 'discover' or 'workspace'
  const [profile, setProfile] = useState(null);
  const [invitingState, setInvitingState] = useState({});
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  // Discover Jobs
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Workspace Jobs
  const [myJobs, setMyJobs] = useState([]);
  const [loadingMyJobs, setLoadingMyJobs] = useState(false);
  
  // Removed redundant bidding state
  
  // Create Job Form State
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', description: '', budget: '', skills: '', category: 'Web Design' });
  const [isPosting, setIsPosting] = useState(false);

  // Custom Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState({
    isOpen: false,
    title: '',
    message: '',
    requireInput: false,
    inputValue: '',
    inputPlaceholder: '',
    inputType: 'text',
    onConfirm: () => {}
  });

  const triggerConfirm = (title, message, onConfirmAction, requireInput = false, inputPlaceholder = '', inputType = 'text') => {
    setConfirmAction({
      isOpen: true,
      title,
      message,
      requireInput,
      inputValue: '',
      inputPlaceholder,
      inputType,
      onConfirm: (val) => {
        onConfirmAction(val);
        setConfirmAction(prev => ({ ...prev, isOpen: false }));
      }
    });
  };
  
  // Bids Modal State
  const [viewingBidsJob, setViewingBidsJob] = useState(null);
  const [jobBids, setJobBids] = useState([]);
  const [isAccepting, setIsAccepting] = useState(null);
  
  // Payment states
  const [isPaying, setIsPaying] = useState(null);
  const [isReleasing, setIsReleasing] = useState(null);
  const [isSubmittingWork, setIsSubmittingWork] = useState(null);
  const [isDisputing, setIsDisputing] = useState(null);

  // AI Matching States
  const [aiMatches, setAiMatches] = useState({});
  const [loadingAi, setLoadingAi] = useState(null);

  // Review State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ jobId: null, rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Freelancer earnings
  const [earnings, setEarnings] = useState({ summary: { escrowed: 0, received: 0, total: 0, count: 0 }, history: [] });
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  // Rehire / Maintenance Modal
  // Client sends description only — no budget. Freelancer will quote.
  const [rehireModal, setRehireModal] = useState({ isOpen: false, jobId: null, jobTitle: '', title: '', description: '' });
  const [isRehiring, setIsRehiring] = useState(false);

  // Freelancer respond-to-rehire modal (quote price or decline)
  const [rehireRespondModal, setRehireRespondModal] = useState({ isOpen: false, job: null, proposedAmount: '' });
  const [isRespondingRehire, setIsRespondingRehire] = useState(false);

  // Client accept/reject freelancer quote modal
  const [rehireQuoteModal, setRehireQuoteModal] = useState({ isOpen: false, job: null });
  const [isHandlingQuote, setIsHandlingQuote] = useState(false);

  // Subscription
  const [isSubscribing, setIsSubscribing] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
    } catch (err) {
      console.error("Failed to load user profile", err);
    }
  };

  const fetchEarnings = async () => {
    try {
      setLoadingEarnings(true);
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/payments/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEarnings(res.data);
    } catch (err) {
      console.error("Failed to load earnings", err);
    } finally {
      setLoadingEarnings(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'freelancer' && activeTab === 'earnings') {
      fetchEarnings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  useEffect(() => {
    if (showJobModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showJobModal]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/jobs');
      const fetchedJobs = res.data.jobs ? res.data.jobs : res.data;
      setJobs(fetchedJobs);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
      toast.error("Failed to fetch jobs list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyJobs = async () => {
    try {
      setLoadingMyJobs(true);
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/jobs/my-jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyJobs(res.data);
    } catch (err) {
      console.error("Failed to fetch my workspace jobs", err);
    } finally {
      setLoadingMyJobs(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchJobs();
    fetchMyJobs();
    if (user) {
      setActiveTab(user.role === 'client' ? 'talents' : 'discover');
      
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
      newSocket.on('connect', () => {
        newSocket.emit('join_updates', { userId: user._id || user.id });
      });
      newSocket.on('job_updated', () => {
        fetchMyJobs();
      });
      return () => newSocket.disconnect();
    }
  }, [user]);

  const handlePostJobSubmit = (e) => {
    e.preventDefault();
    triggerConfirm(
      "Publish Project",
      "Are you sure continuing to post this job?",
      executePostJob
    );
  };

  // Step 1: Client submits maintenance/upgrade description
  const handleRehireSubmit = async (e) => {
    e.preventDefault();
    if (!rehireModal.description || rehireModal.description.trim().length < 10) {
      toast.error('Please describe what you need in at least 10 characters.');
      return;
    }
    setIsRehiring(true);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/${rehireModal.jobId}/rehire`, {
        title: rehireModal.title || `Maintenance: ${rehireModal.jobTitle}`,
        description: rehireModal.description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Maintenance request sent! The freelancer will quote a price.');
      setRehireModal({ isOpen: false, jobId: null, jobTitle: '', title: '', description: '' });
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send maintenance request.');
    } finally {
      setIsRehiring(false);
    }
  };

  // Step 2: Freelancer quotes a price or declines the request
  const handleRehireRespond = async (action) => {
    setIsRespondingRehire(true);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const jobId = rehireRespondModal.job?._id;
      const payload = { action };
      if (action === 'quote') {
        const amt = Number(rehireRespondModal.proposedAmount);
        if (!amt || amt <= 0) { toast.error('Please enter a valid amount.'); setIsRespondingRehire(false); return; }
        payload.proposedAmount = amt;
      }
      await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/rehire-respond`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(action === 'quote' ? 'Price quoted to client successfully!' : 'Request declined.');
      setRehireRespondModal({ isOpen: false, job: null, proposedAmount: '' });
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond.');
    } finally {
      setIsRespondingRehire(false);
    }
  };

  // Step 3: Client accepts or rejects freelancer's quoted price
  const handleQuoteDecision = async (accept) => {
    if (accept) {
      if (!window.confirm("Are you sure you want to accept this quote and proceed to payment?")) return;
    } else {
      if (!window.confirm("Are you sure you want to reject this quote? The freelancer will be notified.")) return;
    }
    
    setIsHandlingQuote(true);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const jobId = rehireQuoteModal.job?._id;
      const endpoint = accept ? 'rehire-accept-counter' : 'rehire-reject-counter';
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRehireQuoteModal({ isOpen: false, job: null });
      fetchMyJobs();
      if (accept) {
        toast.success('Quote accepted! Proceeding to payment...');
        setTimeout(() => navigate(`/payment/${jobId}`), 800);
      } else {
        toast.success('Quote rejected. The freelancer will be notified.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to handle quote.');
    } finally {
      setIsHandlingQuote(false);
    }
  };



  const executePostJob = async () => {
    setIsPosting(true);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const skillsArray = jobForm.skills.split(',').map(s => s.trim()).filter(Boolean);
      
      await axios.post(import.meta.env.VITE_API_URL + '/api/jobs', {
        title: jobForm.title,
        description: jobForm.description,
        budget: Number(jobForm.budget),
        skills: skillsArray,
        category: jobForm.category
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Job posted successfully!");
      setShowJobModal(false);
      setJobForm({ title: '', description: '', budget: '', skills: '', category: 'Web Design' });
      fetchJobs();
      fetchMyJobs();
    } catch (err) {
      console.error("Failed to post job", err);
      toast.error(err.response?.data?.message || "Failed to post job.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleAiMatch = async (jobId) => {
    try {
      setLoadingAi(jobId);
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/ai-match`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiMatches(prev => ({ ...prev, [jobId]: res.data }));
      toast.success("AI found the best matches!");
    } catch (err) {
      console.error("Failed to get AI matches", err);
      toast.error("Failed to get AI recommendations.");
    } finally {
      setLoadingAi(null);
    }
  };

  const handleInviteFreelancer = async (jobId, freelancerId) => {
    setInvitingState(prev => ({ ...prev, [`${jobId}-${freelancerId}`]: true }));
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/invite/${freelancerId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Freelancer invited successfully!");
      fetchJobs();
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite freelancer');
    } finally {
      setInvitingState(prev => ({ ...prev, [`${jobId}-${freelancerId}`]: false }));
    }
  };

  // Removed executeBid from dashboard. Now handled in JobDetails.

  const fetchJobBids = async (job) => {
    setViewingBidsJob(job);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/${job._id}/bids`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobBids(res.data);
    } catch (err) {
      toast.error('Failed to load bids.');
      setViewingBidsJob(null);
    }
  };

  const handleAcceptBidClick = (bidId, amount, freelancerName) => {
    triggerConfirm(
      "Accept Bid & Hire",
      `Are you sure continuing to accept this bid of ₹${Number(amount).toLocaleString('en-IN')} and hire ${freelancerName}?`,
      () => executeAcceptBid(bidId, amount)
    );
  };

  const executeAcceptBid = async (bidId, amount) => {
    setIsAccepting(bidId);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/bid/${bidId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Bid accepted successfully! Contract created for ₹${Number(amount).toLocaleString('en-IN')}`);
      setViewingBidsJob(null);
      fetchJobs();
      fetchMyJobs();
      // Redirect client to payment/billing page
      navigate(`/payment/${res.data.job._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept bid');
    } finally {
      setIsAccepting(null);
    }
  };

  // Deliver/Submit project by Freelancer
  const handleDeliverClick = (jobId) => {
    triggerConfirm(
      "Deliver Project Work",
      "Are you sure continuing to submit work for review?",
      (link) => executeDeliverJob(jobId, link),
      true,
      "Enter GitHub or hosted link here...",
      "url"
    );
  };

  const executeDeliverJob = async (jobId, deliverableLink) => {
    setIsSubmittingWork(jobId);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/deliver`, { deliverableLink }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Work delivered successfully! Waiting for client review.');
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deliver job');
    } finally {
      setIsSubmittingWork(null);
    }
  };

  // Release payment and complete job
  const handleReleaseClick = (jobId) => {
    triggerConfirm(
      "Release Escrow Funds",
      "Are you sure continuing to release payment and close the project?",
      () => executeReleasePayment(jobId)
    );
  };

  const executeReleasePayment = async (jobId) => {
    setIsReleasing(jobId);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/payments/release/job/${jobId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('🏆 Escrow funds released to freelancer! Project closed as completed.');
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to release escrow payment');
    } finally {
      setIsReleasing(null);
    }
  };

  const handleDisputeClick = (jobId) => {
    triggerConfirm(
      "Raise Dispute",
      "Are you sure you want to open a dispute? Our admin team will investigate.",
      () => executeDisputeJob(jobId)
    );
  };

  const executeDisputeJob = async (jobId) => {
    setIsDisputing(jobId);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/dispute`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Dispute raised successfully. Admin will review shortly.');
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise dispute');
    } finally {
      setIsDisputing(null);
    }
  };

  // Navigate to message room contextually
  const handleChatTransition = (jobId) => {
    navigate('/chat', { state: { jobId } });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(import.meta.env.VITE_API_URL + '/api/reviews', reviewForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      setReviewForm({ jobId: null, rating: 5, comment: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Alert banner for pending freelancer approval */}
      {user?.role === 'freelancer' && profile && !profile.isFreelancerApproved && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 text-blue-800 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl flex-shrink-0 animate-pulse">
            ⏳
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Account Pending Admin Verification</h4>
            <p className="text-xs text-slate-500 mt-1">Your freelancer profile was submitted successfully and is currently under review by our moderation team. You will be able to submit proposal bids on open projects immediately after verification.</p>
          </div>
        </motion.div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="WorkSphere Logo" className="h-10 w-auto" />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">WorkSphere Portal</h1>
          </div>
          <p className="text-slate-500 mt-1">Collaborate securely using AI matches, encrypted chat, and escrow payments.</p>
        </div>
        
        {user?.role === 'client' && (
          <button 
            onClick={() => setShowJobModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-slate-600 hover:from-blue-700 hover:to-slate-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            Post a Job
          </button>
        )}
      </div>

      {/* Premium Tab Mechanism */}
      <div className="flex flex-wrap bg-slate-100/80 p-1.5 rounded-2xl w-full border border-slate-200/50 gap-1.5">
        {user?.role === 'client' ? (
          <>
            <button
              onClick={() => setActiveTab('talents')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'talents' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Compass size={16} className={`transition-transform duration-500 ${activeTab === 'talents' ? 'animate-bounce' : 'group-hover:rotate-45'}`} />
              Talents
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'progress' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Loader2 size={16} className={`transition-transform duration-500 ${activeTab === 'progress' ? 'animate-spin text-blue-600' : 'group-hover:animate-spin'}`} />
              Progress
              {myJobs.filter(j => ['in-progress', 'delivered', 'disputed'].includes(j.status)).length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {myJobs.filter(j => ['in-progress', 'delivered', 'disputed'].includes(j.status)).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('workspace')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'workspace' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Briefcase size={16} className={`transition-transform duration-500 ${activeTab === 'workspace' ? 'scale-110 text-blue-600' : 'group-hover:-translate-y-1'}`} />
              Workspace
              {myJobs.filter(j => ['open', 'pending'].includes(j.status)).length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {myJobs.filter(j => ['open', 'pending'].includes(j.status)).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'completed' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CheckCircle size={16} className={`transition-transform duration-500 ${activeTab === 'completed' ? 'scale-110 text-blue-600' : 'group-hover:scale-110'}`} />
              Completed
              {myJobs.filter(j => ['completed', 'cancelled'].includes(j.status)).length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {myJobs.filter(j => ['completed', 'cancelled'].includes(j.status)).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('proposals')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'proposals' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText size={16} className={`transition-transform duration-500 ${activeTab === 'proposals' ? 'scale-110 text-blue-600' : 'group-hover:scale-110'}`} />
              Proposals
              {myJobs.filter(j => j.bidCount > 0 && j.status === 'open').length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {myJobs.filter(j => j.bidCount > 0 && j.status === 'open').length}
                </span>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('discover')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'discover' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Compass size={16} className={`transition-transform duration-500 ${activeTab === 'discover' ? 'animate-bounce' : 'group-hover:rotate-45'}`} />
              Explore
            </button>
            <button
              onClick={() => setActiveTab('invited')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'invited' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Sparkles size={16} className={`transition-transform duration-500 ${activeTab === 'invited' ? 'animate-spin' : 'group-hover:scale-110'}`} />
              Invited
              {jobs.filter(job => job.invitedFreelancers?.includes(user?.id || user?._id)).length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {jobs.filter(job => job.invitedFreelancers?.includes(user?.id || user?._id)).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'progress' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Loader2 size={16} className={`transition-transform duration-500 ${activeTab === 'progress' ? 'animate-spin text-blue-600' : 'group-hover:animate-spin'}`} />
              Progress
              {myJobs.filter(j => ['in-progress', 'delivered', 'disputed'].includes(j.status)).length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {myJobs.filter(j => ['in-progress', 'delivered', 'disputed'].includes(j.status)).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('workspace')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'workspace' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Briefcase size={16} className={`transition-transform duration-500 ${activeTab === 'workspace' ? 'scale-110 text-blue-600' : 'group-hover:-translate-y-1'}`} />
              Workspace
              {myJobs.filter(j => ['open', 'pending'].includes(j.status)).length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {myJobs.filter(j => ['open', 'pending'].includes(j.status)).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'completed' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CheckCircle size={16} className={`transition-transform duration-500 ${activeTab === 'completed' ? 'scale-110 text-blue-600' : 'group-hover:scale-110'}`} />
              Completed
              {myJobs.filter(j => ['completed', 'cancelled'].includes(j.status)).length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {myJobs.filter(j => ['completed', 'cancelled'].includes(j.status)).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={`group flex-1 min-w-[120px] py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all whitespace-nowrap ${activeTab === 'earnings' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Wallet size={16} className={`transition-transform duration-500 ${activeTab === 'earnings' ? 'animate-bounce text-blue-600' : 'group-hover:-translate-y-1'}`} />
              Earnings
            </button>
          </>
        )}
      </div>

      {/* Tabs Content */}
      {activeTab === 'earnings' ? (
        // Freelancer Earnings Dashboard
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Landmark size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">In Escrow</span>
              </div>
              <p className="text-3xl font-black text-slate-900">₹{earnings.summary.escrowed.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-400 mt-1">Funded by clients, awaiting release</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <Wallet size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Received</span>
              </div>
              <p className="text-3xl font-black text-emerald-600">₹{earnings.summary.received.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-400 mt-1">Released to you on completed jobs</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <CreditCard size={18} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Lifetime Total</span>
              </div>
              <p className="text-3xl font-black text-slate-900">₹{earnings.summary.total.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-400 mt-1">{earnings.summary.count} payment{earnings.summary.count === 1 ? '' : 's'}</p>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Payment History</h3>
              <p className="text-xs text-slate-500 mt-0.5">Your escrow and payout activity</p>
            </div>
            {loadingEarnings ? (
              <div className="p-10 text-center text-blue-600 flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" /> Loading earnings...
              </div>
            ) : earnings.history.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                No payments yet. Once a client funds escrow for your job, it will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50">
                      <th className="px-5 py-3 font-bold">Project</th>
                      <th className="px-5 py-3 font-bold">Client</th>
                      <th className="px-5 py-3 font-bold">Date &amp; Time</th>
                      <th className="px-5 py-3 font-bold text-right">Amount</th>
                      <th className="px-5 py-3 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {earnings.history.map((p) => {
                      const isReleased = p.status === 'released';
                      const isEscrow = p.status === 'escrow_funded';
                      const stamp = isReleased ? p.updatedAt : p.createdAt;
                      const statusLabel = isReleased ? 'Received' : isEscrow ? 'In Escrow' : 'Pending';
                      const statusClass = isReleased
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isEscrow
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200';
                      return (
                        <tr key={p._id} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3.5 font-semibold text-slate-800 max-w-[220px] truncate" title={p.jobTitle}>{p.jobTitle}</td>
                          <td className="px-5 py-3.5 text-slate-600">{p.clientName}</td>
                          <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                            {new Date(stamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">₹{p.amount.toLocaleString('en-IN')}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusClass}`}>{statusLabel}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'talents' ? (
        <TalentDirectory />
      ) : activeTab === 'discover' || activeTab === 'invited' ? (
        // Explore/Discover/Invited Tab
        (() => {
          const displayedJobs = activeTab === 'invited' 
            ? jobs.filter(job => job.invitedFreelancers?.includes(user?.id || user?._id))
            : jobs;
            
          return loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-64 animate-pulse">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-24 h-6 bg-slate-200 rounded-full"></div>
                    <div className="w-16 h-6 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-5"></div>
                  <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedJobs.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white border border-dashed rounded-3xl p-10">
            {activeTab === 'invited' 
              ? "You haven't been invited to any jobs yet. Keep your profile updated to attract clients!" 
              : "No open jobs available on the platform right now. Check back soon!"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedJobs.map((job, index) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full group hover:shadow-xl transition-all"
              >
                <div>
                  <div className="flex items-start mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      OPEN FOR BIDS
                    </span>
                    {user?.role === 'freelancer' && job.invitedFreelancers?.includes(user?.id || user?._id) && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 ml-2 shadow-sm border border-purple-200 animate-pulse">
                        ⭐ INVITED
                      </span>
                    )}
                    <span className="text-lg font-bold text-slate-900 ml-auto">₹{job.budget?.toLocaleString('en-IN')}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                  <p className="text-xs text-slate-400 mb-4">{job.client?.companyName || job.client?.name || 'Client'}</p>
                  <p className="text-sm text-slate-500 mb-5 line-clamp-3">{job.description}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {job.skills && job.skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Freelancer Action */}
                {user?.role === 'freelancer' && (
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 mt-auto">
                    <button 
                      onClick={() => navigate(`/job/${job._id}`)}
                      className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles size={16} /> View Details & Bid
                    </button>
                  </div>
                )}

                {/* Client Owner Action */}
                {user?.role === 'client' && (job.client?._id === user?.id || job.client === user?.id) && (
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 mt-auto">
                    <button 
                      onClick={() => navigate(`/job/${job._id}`)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Manage Proposals
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        );
        })()
      ) : (
        // Workspace/Proposals/Completed Tab
        (() => {
          let displayedMyJobs = myJobs;
          if (activeTab === 'proposals') {
            displayedMyJobs = myJobs.filter(job => job.bidCount > 0 && job.status === 'open');
          } else if (activeTab === 'progress') {
            displayedMyJobs = myJobs.filter(job => ['in-progress', 'delivered', 'disputed'].includes(job.status));
          } else if (activeTab === 'completed') {
            displayedMyJobs = myJobs.filter(job => ['completed', 'cancelled'].includes(job.status));
          } else {
            // workspace
            displayedMyJobs = myJobs.filter(job => ['open', 'pending'].includes(job.status));
          }
            
          return loadingMyJobs ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-48 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="w-32 h-6 bg-slate-200 rounded-full"></div>
                  <div className="w-20 h-6 bg-slate-200 rounded"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded w-2/3 mb-4"></div>
                <div className="w-full h-12 bg-slate-200 rounded-xl mt-auto"></div>
              </div>
            ))}
          </div>
        ) : displayedMyJobs.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white border border-dashed rounded-3xl p-10">
            {activeTab === 'proposals'
              ? "None of your open jobs have received proposals yet."
              : `No active jobs in your workspace. ${user?.role === 'freelancer' ? ' Find an interesting job and submit a bid!' : ' Post a job and accept freelancer proposals.'}`
            }
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayedMyJobs.map((job) => {
              // Determine status colors
              let statusBg = 'bg-slate-100 text-slate-600';
              let statusText = job.status.toUpperCase();
              
              if (!job.isApproved) {
                statusBg = 'bg-blue-100 text-blue-700 border border-blue-200';
                statusText = 'PENDING ADMIN APPROVAL';
              } else if (job.status === 'open') {
                statusBg = 'bg-slate-100 text-slate-600 border border-slate-200';
                statusText = 'PENDING ASSIGNMENT';
              } else if (job.status === 'in-progress') {
                statusBg = 'bg-slate-50 text-slate-700 border border-slate-100';
                statusText = 'ACTIVE / IN-PROGRESS';
              } else if (job.status === 'delivered') {
                statusBg = 'bg-slate-50 text-slate-700 border border-slate-100';
                statusText = 'DELIVERED (PENDING REVIEW)';
              } else if (job.status === 'completed') {
                statusBg = 'bg-blue-50 text-blue-700 border border-blue-100';
                statusText = 'COMPLETED';
              }

              // Final displayed budget (prefer accepted price if hired)
              let finalPriceDisplay = `₹${(job.status !== 'open' && job.acceptedPrice ? job.acceptedPrice : job.budget)?.toLocaleString('en-IN')}`;
              
              if (job.isRehire) {
                if (job.rehireStatus === 'pending_freelancer') {
                  finalPriceDisplay = 'Awaiting Quote';
                } else if (job.rehireStatus === 'pending_client') {
                  finalPriceDisplay = `₹${job.rehireFreelancerAmount?.toLocaleString('en-IN')} (Quoted)`;
                }
              }

              return (
                <motion.div
                  key={job._id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBg}`}>
                        {statusText}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-semibold uppercase">Price:</span>
                        <span className="text-xl font-extrabold text-blue-600">{finalPriceDisplay}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        <Link to={`/job/${job._id}`} className="hover:text-blue-600 transition-colors">
                          {job.title}
                        </Link>
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar name={user?.role === 'client' ? job.selectedFreelancer?.name : job.client?.name} src={user?.role === 'client' ? job.selectedFreelancer?.profilePicture : job.client?.profilePicture} size={24} />
                        <p className="text-xs text-slate-500">
                          {user?.role === 'client' 
                            ? `Hired Freelancer: ${job.selectedFreelancer?.name || 'None Assigned'}`
                            : `Contract Client: ${job.client?.companyName || job.client?.name || 'Unknown'}`
                          }
                        </p>
                      </div>
                    </div>

                    {/* Escrow Status indicators */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Landmark size={14} className="text-slate-400" />
                        <span className="text-slate-500 font-medium">Secure Escrow:</span>
                      </div>
                      <div>
                        {job.paymentStatus === 'pending' && (
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            UNFUNDED
                          </span>
                        )}
                        {job.paymentStatus === 'escrow_funded' && (
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-50 text-slate-700 border border-slate-100 flex items-center gap-1">
                            🔐 SECURELY HELD
                          </span>
                        )}
                        {job.paymentStatus === 'released' && (
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            RELEASED TO TALENT
                          </span>
                        )}
                      </div>
                    </div>

                    {job.deliverableLink && (
                      <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Delivered Work Link:</p>
                        <a href={job.deliverableLink.includes('http') ? job.deliverableLink : `https://${job.deliverableLink}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                          {job.deliverableLink}
                        </a>
                      </div>
                    )}
                  </div>

                    {/* Actions Area */}
                    <div className="mt-auto p-6 pt-0 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 pt-5">
                      
                      {/* Left Actions */}
                      <div className="flex gap-2">
                        {/* Message / Chat Button */}
                        <button 
                          onClick={() => handleChatTransition(job._id)}
                          className="px-4 py-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <MessageSquare size={14} />
                          Encrypted Chat
                        </button>
                        
                        {user?.role === 'client' && job.status === 'open' && (
                          <>
                            <button 
                              onClick={() => handleAiMatch(job._id)}
                              disabled={loadingAi === job._id}
                              className="px-4 py-2 text-slate-700 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                            >
                              {loadingAi === job._id ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                              Find AI Matches
                            </button>
                            <button 
                              onClick={() => navigate(`/job/${job._id}`)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileText size={14} />
                              View Bids / Proposals
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                      {/* Freelancer submits work */}
                      {user?.role === 'freelancer' && job.status === 'in-progress' && (
                        <button
                          onClick={() => handleDeliverClick(job._id)}
                          disabled={isSubmittingWork === job._id}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSubmittingWork === job._id ? <Loader2 size={12} className="animate-spin" /> : <CheckSquare size={14} />}
                          Submit Work
                        </button>
                      )}

                      {/* Freelancer Pending Client Review */}
                      {user?.role === 'freelancer' && job.status === 'delivered' && (
                        <span className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-default">
                           <Loader2 size={14} className="animate-spin" /> Pending Client Review
                        </span>
                      )}

                      {/* Freelancer Completed Project */}
                      {user?.role === 'freelancer' && job.status === 'completed' && (
                         <span className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-default">
                            <Star size={14} className="text-yellow-500 fill-current" /> Project Completed & Paid
                         </span>
                      )}

                      {/* Client funds escrow */}
                      {user?.role === 'client' && job.status === 'in-progress' && job.paymentStatus === 'pending' && (
                        <button
                          onClick={() => navigate(`/payment/${job._id}`)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-slate-600 hover:from-blue-700 hover:to-slate-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 animate-pulse hover:animate-none"
                        >
                          <CreditCard size={14} />
                          Pay Escrow
                        </button>
                      )}

                      {/* Client releases payment */}
                      {user?.role === 'client' && job.status === 'delivered' && (
                        <button
                          onClick={() => handleReleaseClick(job._id)}
                          disabled={isReleasing === job._id}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-slate-500 hover:from-blue-600 hover:to-slate-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isReleasing === job._id ? <Loader2 size={12} className="animate-spin" /> : <CheckSquare size={14} />}
                          Review & Release Funds
                        </button>
                      )}

                      {/* Raise Dispute */}
                      {(job.status === 'in-progress' || job.status === 'delivered') && (
                        <button
                          onClick={() => handleDisputeClick(job._id)}
                          disabled={isDisputing === job._id}
                          className="px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {isDisputing === job._id ? 'Processing...' : 'Raise Dispute'}
                        </button>
                      )}

                      {/* Client Leaves Review & Rehire */}
                      {user?.role === 'client' && job.status === 'completed' && (
                        <>
                          <button
                            onClick={() => {
                              setReviewForm({ ...reviewForm, jobId: job._id });
                              setShowReviewModal(true);
                            }}
                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                          >
                            ⭐ Leave a Review
                          </button>
                          <button
                            onClick={() => {
                              setRehireModal({ isOpen: true, jobId: job._id, jobTitle: job.title, title: '', description: '' });
                            }}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                          >
                            <Wrench size={14} /> Request Maintenance
                          </button>
                        </>
                      )}

                      {/* Client: pending quote from freelancer — show accept/reject */}
                      {user?.role === 'client' && job.isRehire && job.rehireStatus === 'pending_client' && (
                        <button
                          onClick={() => setRehireQuoteModal({ isOpen: true, job })}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 animate-pulse"
                        >
                          <DollarSign size={14} /> Freelancer Quoted – Review Price
                        </button>
                      )}

                      {/* Freelancer: pending maintenance request — show quote button */}
                      {user?.role === 'freelancer' && job.isRehire && job.rehireStatus === 'pending_freelancer' && (
                        <button
                          onClick={() => setRehireRespondModal({ isOpen: true, job, proposedAmount: '' })}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 animate-pulse"
                        >
                          <DollarSign size={14} /> Quote a Price
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AI Matches Display Section */}
                  {aiMatches[job._id] && (
                    <div className="border-t border-slate-100 bg-slate-50/30 p-5">
                      <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Sparkles size={16} className="text-slate-500" /> AI Top Recommended Freelancers
                      </h4>
                      {aiMatches[job._id].length === 0 ? (
                        <p className="text-xs text-slate-500">No matching freelancers found for these skills.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiMatches[job._id].slice(0, 1).map((match, idx) => (
                            <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedProfile(match.freelancer)}>
                                <Avatar name={match.freelancer.name} src={match.freelancer.profilePicture} size={36} className="border-slate-100 text-slate-600 group-hover:ring-2 ring-blue-500 transition-all" />
                                <div>
                                  <div className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">{match.freelancer.name}</div>
                                  <div className="text-[10px] font-semibold text-slate-400">Rating: {match.freelancer.rating} ⭐</div>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <div className="text-sm font-black text-slate-600">{Math.round(match.score * 100)}% Match</div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleInviteFreelancer(job._id, match.freelancer._id); }}
                                  disabled={job.invitedFreelancers?.includes(match.freelancer._id) || invitingState[`${job._id}-${match.freelancer._id}`]}
                                  className="mt-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {invitingState[`${job._id}-${match.freelancer._id}`] 
                                    ? 'Sending...' 
                                    : job.invitedFreelancers?.includes(match.freelancer._id) 
                                      ? 'Invited' 
                                      : 'Invite'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </motion.div>
              );
            })}
          </div>
        );
        })()
      )}

      {/* Post Job Modal */}
      {showJobModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Post a New Job</h2>
                <p className="text-xs text-slate-500 mt-0.5">Specify requirements and set a budget in INR.</p>
              </div>
              <button onClick={() => setShowJobModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            
            <form onSubmit={handlePostJobSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Job Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={jobForm.title}
                  onChange={e => setJobForm({...jobForm, title: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                  placeholder="e.g. React & Node Developer Needed for SaaS" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Project Category <span className="text-red-500">*</span></label>
                <select 
                  value={jobForm.category}
                  onChange={e => setJobForm({...jobForm, category: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="Web Design">Web Design</option>
                  <option value="Video Editing">Video Editing</option>
                  <option value="Reels Making">Reels Making</option>
                  <option value="Graphics Design">Graphics Design</option>
                  <option value="Copywriting">Copywriting</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="SEO Optimization">SEO Optimization</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Project Description <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  minLength={20}
                  value={jobForm.description}
                  onChange={e => setJobForm({...jobForm, description: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none text-sm" 
                  placeholder="Describe the deliverables, scope of work, and timelines (min 20 characters)..."
                ></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Budget (₹) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    required
                    value={jobForm.budget}
                    onChange={e => setJobForm({...jobForm, budget: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                    placeholder="e.g. 50000" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Skills (comma separated) <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={jobForm.skills}
                    onChange={e => setJobForm({...jobForm, skills: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                    placeholder="React, Express, JWT" 
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowJobModal(false)} disabled={isPosting} className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={isPosting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-md transition-colors flex items-center gap-2">
                  {isPosting ? <><Loader2 size={14} className="animate-spin" /> Publishing...</> : 'Publish Job'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Review Modal */}
      {showReviewModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-yellow-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">⭐ Leave a Review</h2>
                <p className="text-xs text-slate-500 mt-0.5">Rate the freelancer's work quality.</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            
            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Rating (1-5) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  min="1" max="5" required
                  value={reviewForm.rating}
                  onChange={e => setReviewForm({...reviewForm, rating: Number(e.target.value)})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Feedback <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 h-24 resize-none text-sm" 
                  placeholder="Share your experience working with this freelancer..."
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowReviewModal(false)} disabled={isSubmittingReview} className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmittingReview} className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg text-sm shadow-md transition-colors flex items-center gap-2">
                  {isSubmittingReview ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : 'Submit Review'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}


      {/* ── MAINTENANCE REQUEST MODAL (Client) ── */}
      {rehireModal.isOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-purple-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                    <Wrench size={14} className="text-purple-600" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">Request Maintenance / Upgrade</h2>
                </div>
                <p className="text-xs text-slate-500">Describe what you need. The freelancer will quote a price.</p>
              </div>
              <button onClick={() => setRehireModal({ isOpen: false, jobId: null, jobTitle: '', title: '', description: '' })} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition-colors"><X size={16} /></button>
            </div>

            {/* Step indicator */}
            <div className="px-6 pt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
              <span className="text-purple-700">You describe the work</span>
              <ChevronRight size={12} />
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Freelancer quotes price</span>
              <ChevronRight size={12} />
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">3</span>
              <span>You accept & pay</span>
            </div>

            <form onSubmit={handleRehireSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Contract Title (optional)</label>
                <input
                  type="text"
                  value={rehireModal.title}
                  onChange={e => setRehireModal({ ...rehireModal, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                  placeholder={`e.g. Maintenance – ${rehireModal.jobTitle}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">What do you need? <span className="text-red-500">*</span></label>
                <textarea
                  required
                  minLength={10}
                  value={rehireModal.description}
                  onChange={e => setRehireModal({ ...rehireModal, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 h-32 resize-none text-sm"
                  placeholder="e.g. Fix the payment bug on checkout page, update homepage banner with new content, add dark mode toggle..."
                />
                <p className="text-[11px] text-slate-400 mt-1">Be specific — the freelancer will quote based on this description.</p>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setRehireModal({ isOpen: false, jobId: null, jobTitle: '', title: '', description: '' })} disabled={isRehiring} className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={isRehiring} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-sm shadow-md transition-colors flex items-center gap-2">
                  {isRehiring ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Wrench size={14} /> Send Request</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ── FREELANCER QUOTE MODAL ── */}
      {rehireRespondModal.isOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-purple-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                    <DollarSign size={14} className="text-purple-600" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">Maintenance Request</h2>
                </div>
                <p className="text-xs text-slate-500">Review the client's request and quote your price.</p>
              </div>
              <button onClick={() => setRehireRespondModal({ isOpen: false, job: null, proposedAmount: '' })} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition-colors"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Client's request */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project</p>
                <p className="text-sm font-bold text-slate-800">{rehireRespondModal.job?.title}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3 mb-1.5">What the client needs</p>
                <p className="text-sm text-slate-600 leading-relaxed">{rehireRespondModal.job?.rehireDescription}</p>
              </div>

              {/* Quote input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Your Quoted Price (₹) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={rehireRespondModal.proposedAmount}
                    onChange={e => setRehireRespondModal({ ...rehireRespondModal, proposedAmount: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-lg font-bold text-slate-900"
                    placeholder="e.g. 8000"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">The client will accept or reject your quote. No obligation either way.</p>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleRehireRespond('reject')}
                  disabled={isRespondingRehire}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                  Decline Request
                </button>
                <button
                  onClick={() => handleRehireRespond('quote')}
                  disabled={isRespondingRehire || !rehireRespondModal.proposedAmount}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isRespondingRehire ? <Loader2 size={14} className="animate-spin" /> : <><DollarSign size={14} /> Send Quote</>}
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ── CLIENT REVIEW QUOTE MODAL ── */}
      {rehireQuoteModal.isOpen && rehireQuoteModal.job && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-emerald-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-white">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                    <DollarSign size={14} className="text-emerald-600" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">Freelancer's Quote</h2>
                </div>
                <p className="text-xs text-slate-500">Review and accept or reject this quote.</p>
              </div>
              <button onClick={() => setRehireQuoteModal({ isOpen: false, job: null })} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition-colors"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Project</p>
                  <p className="text-sm font-bold text-slate-800">{rehireQuoteModal.job.title}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Your Request</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{rehireQuoteModal.job.rehireDescription}</p>
                </div>
              </div>

              {/* Quoted price highlight */}
              <div className="text-center py-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Quoted Price</p>
                <p className="text-4xl font-black text-slate-900">₹{rehireQuoteModal.job.rehireFreelancerAmount?.toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-500 mt-1">+5% platform fee on payment</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleQuoteDecision(false)}
                  disabled={isHandlingQuote}
                  className="flex-1 py-2.5 border border-red-200 text-red-600 font-semibold rounded-xl text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <X size={14} /> Reject Quote
                </button>
                <button
                  onClick={() => handleQuoteDecision(true)}
                  disabled={isHandlingQuote}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  {isHandlingQuote ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} /> Accept & Pay</>}
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}



      {selectedProfile && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm"
          onClick={() => setSelectedProfile(null)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 flex flex-col text-slate-600"
          >
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900">Freelancer Profile</h2>
              <button 
                onClick={() => setSelectedProfile(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1.5 bg-white hover:bg-slate-100 rounded-full border border-slate-100 transition-colors"
              >✕</button>
            </div>
            <div className="p-6 flex flex-col items-center">
              <Avatar name={selectedProfile.name} src={selectedProfile.profilePicture} size={80} className="bg-blue-500 text-white font-bold text-2xl mb-4" />
              <h3 className="font-bold text-xl text-slate-800">{selectedProfile.name}</h3>
              <div className="flex items-center gap-1 text-sm font-bold text-slate-600 mt-1">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <span>{selectedProfile.rating?.toFixed(1) || '0.0'}</span>
              </div>
              {selectedProfile.skills && selectedProfile.skills.length > 0 && (
                <div className="mt-6 w-full">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 text-center">Skills</h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {selectedProfile.skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={confirmAction.isOpen}
        title={confirmAction.title}
        message={confirmAction.message}
        requireInput={confirmAction.requireInput}
        inputValue={confirmAction.inputValue}
        inputPlaceholder={confirmAction.inputPlaceholder}
        inputType={confirmAction.inputType}
        onInputChange={(val) => setConfirmAction(prev => ({ ...prev, inputValue: val }))}
        onConfirm={() => confirmAction.onConfirm(confirmAction.inputValue)}
        onCancel={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
