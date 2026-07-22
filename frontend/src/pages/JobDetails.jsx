import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader2, Calendar, Briefcase, ChevronRight, Eye, CheckCircle2, IndianRupee, Star, MessageSquare } from 'lucide-react';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function JobDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(null);
  
  // Bidding Form State for Freelancers
  const [bidAmount, setBidAmount] = useState('');
  const [proposal, setProposal] = useState('');
  const [bidMode, setBidMode] = useState(null); // 'accept' | 'custom' | null
  const [biddingOn, setBiddingOn] = useState(null);
  const [selectedBid, setSelectedBid] = useState(null);

  const [confirmAction, setConfirmAction] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const fetchJobData = async () => {
    try {
      setLoading(true);
      const token = user?.token || sessionStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const jobRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/job/${id}`, { headers });
      setJob(jobRes.data);
      
      if (user?.role === 'client') {
        const bidsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/${id}/bids`, { headers });
        setBids(bidsRes.data);
      } else if (user?.role === 'freelancer') {
        // Freelancers aren't authorized to view all bids, so we check if they've already bid via my-jobs
        const myJobsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/my-jobs`, { headers });
        const hasBid = myJobsRes.data.some(j => j._id === id);
        if (hasBid) {
          setBids([{ freelancer: user.id }]); // Mock bid to trigger "already submitted" UI
        } else {
          setBids([]);
        }
      }
    } catch (err) {
      console.error('Error fetching job details', err);
      toast.error('Failed to load job details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchJobData();
    } else {
      navigate('/dashboard');
    }
  }, [id, user, navigate]);

  const handleBidClick = () => {
    if (!bidAmount || !proposal) {
      toast.error('Please enter a bid amount and proposal.');
      return;
    }
    if (Number(bidAmount) <= 0) {
      toast.error('Your bid amount must be a valid number greater than 0.');
      return;
    }
    setConfirmAction({
      isOpen: true,
      title: "Submit Proposal",
      message: "Are you sure you want to submit this bid proposal?",
      onConfirm: executeBid
    });
  };

  const executeBid = async () => {
    setBiddingOn(true);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/${id}/bid`, {
        amount: Number(bidAmount),
        proposal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Bid placed successfully!');
      setBidAmount('');
      setProposal('');
      fetchJobData(); // Refresh to get updated bids
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place bid');
    } finally {
      setBiddingOn(false);
      setConfirmAction(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleAcceptBid = (bidId, amount, freelancerName) => {
    setConfirmAction({
      isOpen: true,
      title: "Accept Proposal",
      message: `Are you sure you want to hire ${freelancerName} for ₹${Number(amount).toLocaleString('en-IN')}? This will take you to the secure payment escrow.`,
      onConfirm: () => executeAcceptBid(bidId, amount)
    });
  };

  const executeAcceptBid = async (bidId, amount) => {
    setIsAccepting(bidId);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/bid/${bidId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Proposal accepted! Proceeding to fund escrow for ₹${Number(amount).toLocaleString('en-IN')}`);
      navigate(`/payment/${job._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept proposal');
    } finally {
      setIsAccepting(null);
      setConfirmAction(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleMessageClick = (freelancerId) => {
    navigate('/chat', { state: { jobId: job._id, directUserId: freelancerId } });
  };

  if (loading) {
    return <div className="h-[70vh] flex items-center justify-center text-blue-600"><Loader2 size={40} className="animate-spin" /></div>;
  }

  if (!job) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-[#f8fafc] min-h-screen">
      
      <ConfirmModal 
        isOpen={confirmAction.isOpen}
        title={confirmAction.title}
        message={confirmAction.message}
        onConfirm={confirmAction.onConfirm}
        onCancel={() => setConfirmAction(prev => ({...prev, isOpen: false}))}
      />

      {user?.role === 'freelancer' && job.invitedFreelancers?.includes(user?.id || user?._id) && (
        <div className="mb-8 bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 rounded-2xl p-4 flex items-center justify-center gap-4 shadow-sm animate-pulse-slow">
          <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-md shrink-0">
            <Star size={20} className="fill-white" />
          </div>
          <div className="text-left">
            <h3 className="text-purple-900 font-bold text-sm">You have been Exclusively Invited!</h3>
            <p className="text-purple-700 text-xs mt-0.5">The client's AI specifically matched you for this role. Submit a proposal to get started.</p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">{job.title}</h1>
        <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5"><Calendar size={14} /> Posted recently</div>
          <div className="flex items-center gap-1.5"><Eye size={14} /> {bids.length} proposals</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Job Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-blue-500 p-5">
              <h2 className="text-xl font-bold text-white mb-1">Job Details</h2>
              <p className="text-blue-100 text-sm font-medium">Complete project overview and requirements</p>
            </div>
            
            <div className="p-6 space-y-8">
              <div>
                <h3 className="flex items-center gap-2 text-slate-800 font-bold mb-3">
                  <Briefcase className="text-blue-500" size={18} /> Project Description
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap pl-6 border-l-2 border-blue-500">
                  {job.description}
                </p>
              </div>

              <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Tech Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills?.map(skill => (
                    <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-700 font-semibold text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                  {(!job.skills || job.skills.length === 0) && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 font-semibold text-xs rounded-full">MERN</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-slate-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-full text-blue-500"><Calendar size={18} /></div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Timeline</div>
                    <div className="text-sm font-bold text-slate-700">Flexible</div>
                  </div>
                </div>
                <div className="border border-slate-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="bg-purple-50 p-2 rounded-full text-purple-500"><Briefcase size={18} /></div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Experience Level</div>
                    <div className="text-sm font-bold text-slate-700">Intermediate</div>
                  </div>
                </div>
                <div className="border border-emerald-100 bg-emerald-50/20 p-4 rounded-xl flex items-center gap-3">
                  <div className="bg-emerald-50 p-2 rounded-full text-emerald-500 font-bold text-sm flex items-center justify-center w-8 h-8">₹</div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Project Budget</div>
                    <div className="text-sm font-black text-emerald-600">₹{job.budget?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Proposals or Submit Proposal */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-blue-500 p-5 flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-lg font-bold text-white mb-1">
                  {user?.role === 'freelancer' ? 'Submit Proposal' : 'Freelancer Proposals'}
                </h2>
                <p className="text-blue-100 text-xs font-medium">
                  {user?.role === 'freelancer' ? 'Pitch yourself for this project' : `${bids.length} applications received`}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white cursor-pointer hover:bg-black/40 transition-colors relative z-10">
                <ChevronRight size={18} />
              </div>
              <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            <div className="p-5 bg-slate-50">
              {user?.role === 'client' ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {bids.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm font-medium">No proposals yet.</div>
                  ) : (
                    bids.map((bid, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={bid._id} 
                        className={`border rounded-xl p-4 shadow-sm hover:shadow transition-all text-left relative overflow-hidden ${
                          bid.freelancer?.subscriptionPlan === 'pro' 
                            ? 'bg-amber-50/30 border-amber-300 hover:border-amber-400' 
                            : 'bg-white border-blue-100 hover:border-blue-300'
                        }`}
                      >
                        {bid.freelancer?.subscriptionPlan === 'pro' && (
                          <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-bl-lg font-bold text-[9px] uppercase shadow-sm flex items-center gap-1 border-b border-l border-amber-200">
                            👑 Featured
                          </div>
                        )}
                        <div className="flex gap-3 relative z-10">
                          <Avatar name={bid.freelancer?.name} src={bid.freelancer?.profilePicture} size={36} className="bg-blue-500 text-white font-bold" />
                          <div className="flex-1 min-w-0 pr-16">
                            <h4 className="font-bold text-sm text-slate-800 truncate">{bid.freelancer?.name}</h4>
                            {bid.freelancer?.skills?.length > 0 && (
                              <p className="text-[10px] text-slate-500 truncate">{bid.freelancer.skills.slice(0, 3).join(', ')}</p>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          "{bid.proposal}"
                        </p>
                        
                        <div className="flex justify-between items-center mt-3">
                          <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-white text-blue-600 text-[9px] font-bold uppercase">
                            interviewing
                          </span>
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-blue-600">₹{bid.amount.toLocaleString('en-IN')}</div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                          <div className="text-[9px] text-slate-400 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(bid.createdAt).toLocaleDateString()}
                          </div>
                          <button 
                            onClick={() => setSelectedBid(bid)}
                            disabled={isAccepting === bid._id || job.status !== 'open'}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold text-[10px] shadow-sm disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            Review Proposal
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              ) : (
                /* Freelancer Proposal Form */
                <div className="flex flex-col gap-4">
                  {job.status !== 'open' ? (
                    <div className="text-center py-6 text-slate-500 text-sm font-medium border border-slate-200 rounded-xl bg-white">
                      This job is no longer accepting bids.
                    </div>
                  ) : bids.some(b => b.freelancer === user.id || b.freelancer?._id === user.id) ? (
                    <div className="text-center py-6 text-blue-600 text-sm font-bold border border-blue-200 rounded-xl bg-blue-50 flex flex-col items-center gap-2">
                      <CheckCircle2 size={24} />
                      You have already submitted a proposal for this job.
                    </div>
                  ) : !bidMode ? (
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => {
                          setBidAmount(job.budget.toString());
                          setProposal("I accept your target budget and project terms. I am ready to begin working immediately.");
                          setBidMode('accept');
                        }}
                        className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-1"
                      >
                        <span className="flex items-center gap-2"><CheckCircle2 size={18} /> Accept Project Budget</span>
                        <span className="text-xs font-semibold text-emerald-600">Instantly bid ₹{job.budget?.toLocaleString('en-IN')}</span>
                      </button>
                      
                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Or</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setBidAmount('');
                          setProposal('');
                          setBidMode('custom');
                        }}
                        className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        Submit Custom Proposal
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-sm text-slate-700">
                          {bidMode === 'accept' ? 'Accepting Target Budget' : 'Custom Proposal'}
                        </h3>
                        <button 
                          onClick={() => setBidMode(null)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 font-bold underline"
                        >
                          Change Option
                        </button>
                      </div>
                      
                      {bidMode === 'custom' ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input 
                            type="number" 
                            placeholder="Enter your custom bid amount" 
                            className="w-full pl-8 pr-4 py-3 border border-blue-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm font-semibold text-blue-700"
                            onChange={(e) => setBidAmount(e.target.value)}
                            value={bidAmount}
                          />
                        </div>
                      ) : (
                        <div className="w-full px-4 py-3 border border-emerald-200 rounded-xl bg-emerald-50/50 text-emerald-700 text-sm shadow-sm font-bold flex justify-between items-center">
                          <span>Accepted Budget:</span>
                          <span className="text-lg">₹{job.budget?.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      
                      <textarea 
                        placeholder={bidMode === 'accept' ? "Add an optional message..." : "Why are you the best fit for this project?"} 
                        className="w-full mt-3 px-4 py-3 border border-blue-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none h-32 shadow-sm leading-relaxed"
                        onChange={(e) => setProposal(e.target.value)}
                        value={proposal}
                      ></textarea>
                      <button 
                        onClick={handleBidClick}
                        disabled={biddingOn}
                        className="w-full py-3.5 mt-2 bg-gradient-to-r from-blue-500 to-slate-600 hover:from-blue-600 hover:to-slate-700 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 text-sm"
                      >
                        {biddingOn ? <Loader2 size={18} className="animate-spin" /> : '🚀 Submit Proposal'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      {/* Proposal Details Modal */}
      {createPortal(
        <AnimatePresence>
          {selectedBid && (
            <div 
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm"
              onClick={() => setSelectedBid(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col text-slate-600"
              >
              {/* Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Proposal Application</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">Submitted by platform talent</p>
                </div>
                <button 
                  onClick={() => setSelectedBid(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm p-1.5 bg-white hover:bg-slate-100 rounded-full border border-slate-100 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar text-xs">
                {/* Freelancer Profile */}
                <div className="flex gap-3 items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <Avatar name={selectedBid.freelancer?.name} src={selectedBid.freelancer?.profilePicture} size={40} className="bg-blue-500 text-white font-bold" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-slate-800 truncate">{selectedBid.freelancer?.name}</h3>
                    {selectedBid.freelancer?.experience && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{selectedBid.freelancer.experience} yrs experience</p>
                    )}
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 mt-1">
                      <Star size={10} className="text-amber-500 fill-amber-500" />
                      <span>{selectedBid.freelancer?.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                    {selectedBid.freelancer?.adminRating > 0 && (
                      <div className="inline-flex items-center gap-1 mt-1.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-bold text-[9px] uppercase tracking-wide">
                        <CheckCircle2 size={10} className="text-blue-500" />
                        Admin Verified: {selectedBid.freelancer.adminRating} <Star size={8} className="fill-blue-600 text-blue-600 inline ml-0.5 -mt-0.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Proposal Pitch Text */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[9px]">Proposal Details / Pitch</h4>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-600 leading-relaxed text-[11px] whitespace-pre-wrap italic">
                    "{selectedBid.proposal}"
                  </div>
                </div>

                {/* Budget */}
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 text-xs">Agreed Offer Amount</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Bid pricing set by talent in INR</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-blue-600">₹{selectedBid.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setSelectedBid(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-xs cursor-pointer"
                >
                  Go Back
                </button>
                <button 
                  onClick={() => {
                    handleMessageClick(selectedBid.freelancer?._id || selectedBid.freelancer);
                    setSelectedBid(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare size={14} /> Message
                </button>
                <button 
                  onClick={() => {
                    handleAcceptBid(selectedBid._id, selectedBid.amount, selectedBid.freelancer?.name);
                    setSelectedBid(null);
                  }}
                  disabled={job.status !== 'open'}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  Accept & Hire
                </button>
              </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
