import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { Star, PenLine, ShieldAlert } from 'lucide-react';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { containsPersonalInfo } from '../utils/personalInfo';

let socket;

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'msi', 'com', 'scr', 'js', 'jar'];

export default function Chat() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const location = useLocation();
  
  // Edit Bid State
  const [showEditBidModal, setShowEditBidModal] = useState(false);
  const [newBidAmount, setNewBidAmount] = useState('');

  // Real-time Chat UX State
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Counter Offer Negotiation States
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  // Project Assets State
  const [showAssets, setShowAssets] = useState(false);
  const [assets, setAssets] = useState([]);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const fileInputRef = useRef(null);

  const fetchMyJobs = async () => {
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/jobs/my-jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let conversations = [];
      for (const j of res.data) {
        if (user.role === 'client' && j.status === 'open') {
          // Client: fetch all bids for this open job to let client chat with each freelancer separately
          const bidsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/${j._id}/bids`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          bidsRes.data.forEach(bid => {
            conversations.push({
              _id: `${j._id}_${bid.freelancer?._id}`,
              job: j,
              freelancer: bid.freelancer,
              bidId: bid._id,
              title: j.title,
              subtitle: `Freelancer: ${bid.freelancer?.name || 'Applicant'}`,
              budget: bid.amount,
              status: j.status,
              roomName: `${j._id}_${bid.freelancer?._id}`,
              negotiationHistory: bid.negotiationHistory
            });
          });
          
          if (bidsRes.data.length === 0) {
            conversations.push({
              _id: `${j._id}_pending`,
              job: j,
              freelancer: null,
              bidId: null,
              title: j.title,
              subtitle: 'No proposals yet',
              budget: j.budget,
              status: j.status,
              roomName: j._id,
              negotiationHistory: []
            });
          }
        } else if (user.role === 'freelancer') {
          // Freelancer: find their own bid to show bidId and proposed price
          const bidsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/${j._id}/bids`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const myBid = bidsRes.data.find(b => b.freelancer?._id === user.id || b.freelancer === user.id);
          conversations.push({
            _id: j._id,
            job: j,
            freelancer: null,
            bidId: myBid?._id,
            title: j.title,
            subtitle: `Client: ${j.client?.companyName || j.client?.name || 'Client'}`,
            budget: myBid?.amount || j.budget,
            status: j.status,
            roomName: `${j._id}_${user.id || user._id}`,
            negotiationHistory: myBid?.negotiationHistory || []
          });
        } else {
          // Hired client view
          const fl = j.selectedFreelancer;
          conversations.push({
            _id: j._id,
            job: j,
            freelancer: fl,
            bidId: null,
            title: j.title,
            subtitle: `Freelancer: ${fl?.name || 'Assigned'}`,
            budget: j.acceptedPrice || j.budget,
            status: j.status,
            roomName: fl ? `${j._id}_${fl._id || fl}` : j._id,
            negotiationHistory: []
          });
        }
      }

      // Add the WorkSphere Admin Support Chat
      conversations.unshift({
        _id: 'support',
        isSupport: true,
        title: 'WorkSphere Admin Support',
        subtitle: 'Chat with platform administrators',
        roomName: `support_${user.id || user._id}`,
        job: null,
        status: 'open',
        budget: 0,
        negotiationHistory: []
      });

      setJobs(conversations);
      
      // Keep selected job updated or select first
      if (conversations.length > 0) {
        let selected = conversations[0];
        
        // If we already had a selected conversation, try to find it in the new list to update history
        const currentSelectedId = selectedJob?._id;
        if (currentSelectedId) {
          const match = conversations.find(c => 
            c._id === currentSelectedId || 
            (typeof currentSelectedId === 'string' && currentSelectedId.startsWith(c._id + '_')) ||
            (typeof c._id === 'string' && c._id.startsWith(currentSelectedId + '_'))
          );
          if (match) selected = match;
        } else {
          const passedJobId = location.state?.jobId;
          const passedFreelancerId = location.state?.directUserId;
          
          if (passedJobId) {
            const match = conversations.find(c => 
              c.job._id === passedJobId && 
              (!passedFreelancerId || c.freelancer?._id === passedFreelancerId)
            );
            if (match) selected = match;
          }
        }
        setSelectedJob(selected);
      }
    } catch (err) {
      console.error("Failed to fetch my jobs", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    // Request Notification permission
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
    fetchMyJobs();
  }, [user, location.state]);

  useEffect(() => {
    if (!selectedJob) return;

    // Connect to Socket.io server
    socket = io(import.meta.env.VITE_API_URL, { 
      transports: ['websocket'],
      upgrade: false
    });
    
    socket.emit('join_room', {
      roomName: selectedJob.roomName,
      userId: user.id || user._id,
      jobId: selectedJob.isSupport ? null : selectedJob.job._id
    });

    // Fetch messages history
    const fetchMessages = async () => {
      try {
        const token = user?.token || sessionStorage.getItem('token');
        let url;
        if (selectedJob.isSupport) {
          url = `${import.meta.env.VITE_API_URL}/api/support/messages`;
        } else {
          url = `${import.meta.env.VITE_API_URL}/api/jobs/${selectedJob.job._id}/messages`;
          if (user.role === 'client' && selectedJob.freelancer) {
            const fId = selectedJob.freelancer._id || selectedJob.freelancer;
            url += `?freelancerId=${fId}`;
          } else if (user.role === 'freelancer') {
            url += `?freelancerId=${user.id || user._id}`;
          }
        }
        
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
        scrollToBottom();

        // If there are unread incoming messages, mark them as read immediately
        if (selectedJob.isSupport) {
          const hasUnread = res.data.some(m => m.senderModel === 'Admin' && !m.isRead);
          if (hasUnread) {
            socket.emit('mark_support_read', {
              roomName: selectedJob.roomName,
              userId: user.id || user._id,
              isFromAdmin: false
            });
          }
        } else {
          const hasUnread = res.data.some(m => m.receiver === (user.id || user._id) && !m.isRead);
          if (hasUnread) {
            socket.emit('mark_read', {
              roomName: selectedJob.roomName,
              userId: user.id || user._id,
              jobId: selectedJob.job._id
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };
    fetchMessages();

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
      scrollToBottom();

      const isMe = data.sender === (user.id || user._id);
      
      // If we are actively viewing this chat and receive a message, mark it read
      if (!isMe) {
        socket.emit('mark_read', {
          roomName: selectedJob.roomName,
          userId: user.id || user._id,
          jobId: selectedJob.job._id
        });
        
        // Show browser notification if document is hidden
        if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
          new Notification("New Message on WorkSphere", {
            body: data.content,
            icon: "/favicon.ico"
          });
        }
      }
    });

    socket.on('receive_support_message', (data) => {
      setMessages((prev) => [...prev, data]);
      scrollToBottom();

      const isMe = data.senderModel === 'User' && data.user === (user.id || user._id);
      if (!isMe) {
        socket.emit('mark_support_read', {
          roomName: selectedJob.roomName,
          userId: user.id || user._id,
          isFromAdmin: false
        });

        if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
          new Notification("New Support Message", {
            body: data.content,
            icon: "/favicon.ico"
          });
        }
      }
    });

    socket.on('support_messages_marked_read', (data) => {
      setMessages((prev) => prev.map(m => {
        if (m.senderModel === 'User' && m.user === (user.id || user._id)) {
          return { ...m, isRead: true };
        }
        return m;
      }));
    });

    socket.on('messages_marked_read', (data) => {
      setMessages((prev) => prev.map(m => {
        // If the receiver marked our message as read, update local tick status
        if (m.sender === (user.id || user._id)) {
          return { ...m, isRead: true };
        }
        return m;
      }));
    });

    socket.on('user_typing', (data) => {
      setOtherUserTyping(true);
    });

    socket.on('user_stopped_typing', () => {
      setOtherUserTyping(false);
    });

    socket.on('warning', (data) => {
      toast.error(data.message, { duration: 5000 });
    });

    socket.on('message_blocked', (data) => {
      toast.error(data.message, { duration: 6000 });
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
    };
  }, [selectedJob, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        const container = messagesEndRef.current.parentElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedJob) return;
    
    // Clear typing timeout and emit stop_typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('stop_typing', {
      roomName: selectedJob.roomName,
      username: user.name
    });
    setOtherUserTyping(false);

    if (selectedJob.isSupport) {
      socket.emit('send_support_message', {
        userId: user.id || user._id,
        senderModel: 'User',
        content: message,
        roomName: selectedJob.roomName
      });
      setMessage('');
      return;
    }

    let receiverId = null;
    if (user.role === 'client') {
      receiverId = selectedJob.freelancer?._id || selectedJob.freelancer || selectedJob.job.selectedFreelancer?._id || selectedJob.job.selectedFreelancer;
    } else {
      receiverId = selectedJob.job.client?._id || selectedJob.job.client;
    }

    if (!receiverId) {
      toast.error("Cannot send message. The other party is unknown.");
      return;
    }

    // Prevent sharing personal contact / payment details (server also blocks & logs)
    if (containsPersonalInfo(message)) {
      toast.error('Sharing contact or payment details (phone, email, UPI, social handles) is not allowed on WorkSphere.', { duration: 5000 });
      return;
    }

    const msgData = {
      senderId: user.id || user._id,
      receiverId: receiverId,
      jobId: selectedJob.job._id,
      content: message,
      roomName: selectedJob.roomName
    };

    socket.emit('send_message', msgData);
    setMessage('');
  };

  const handleAcceptCounterOffer = async () => {
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/bid/${selectedJob.bidId}/counter/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("🤝 Counter-offer accepted! Contract established.");
      
      const receiverId = user.role === 'client' 
        ? (selectedJob.freelancer?._id || selectedJob.freelancer) 
        : (selectedJob.job.client?._id || selectedJob.job.client);

      const msgData = {
        senderId: user.id || user._id,
        receiverId,
        jobId: selectedJob.job._id,
        content: `🤝 Negotiation accepted! Active contract established at ₹${selectedJob.budget.toLocaleString('en-IN')}.`,
        roomName: selectedJob.roomName
      };
      socket.emit('send_message', msgData);

      setTimeout(() => fetchMyJobs(), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept offer');
    }
  };

  const handleRejectCounterOffer = async () => {
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/bid/${selectedJob.bidId}/counter/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Decline registered.");
      
      const receiverId = user.role === 'client' 
        ? (selectedJob.freelancer?._id || selectedJob.freelancer) 
        : (selectedJob.job.client?._id || selectedJob.job.client);

      const msgData = {
        senderId: user.id || user._id,
        receiverId,
        jobId: selectedJob.job._id,
        content: `❌ Proposed counter-offer has been declined. Let's continue negotiation.`,
        roomName: selectedJob.roomName
      };
      socket.emit('send_message', msgData);

      setTimeout(() => fetchMyJobs(), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline offer');
    }
  };

  const handleProposeCounterClick = () => {
    setCounterAmount(selectedJob.budget.toString());
    setCounterMessage('');
    setShowCounterModal(true);
  };

  const handleCounterSubmit = async () => {
    if (!counterAmount || Number(counterAmount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (user.role === 'freelancer' && Number(counterAmount) <= selectedJob.job.budget) {
      toast.error(`Your proposed rate must exceed client budget of ₹${selectedJob.job.budget}`);
      return;
    }

    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/bid/${selectedJob.bidId}/counter`, {
        amount: Number(counterAmount),
        message: counterMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Counter-offer submitted: ₹${Number(counterAmount).toLocaleString('en-IN')}`);
      
      const receiverId = user.role === 'client' 
        ? (selectedJob.freelancer?._id || selectedJob.freelancer) 
        : (selectedJob.job.client?._id || selectedJob.job.client);

      const msgData = {
        senderId: user.id || user._id,
        receiverId,
        jobId: selectedJob.job._id,
        content: `📢 Negotiation update: Counter-offer proposed for ₹${Number(counterAmount).toLocaleString('en-IN')}. Message: "${counterMessage || 'Let\'s collaborate'}"`,
        roomName: selectedJob.roomName
      };
      socket.emit('send_message', msgData);

      setShowCounterModal(false);
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit counter-offer');
    }
  };

  // Assets are shareable only on an active engagement (a freelancer is hired)
  const assetsAvailable = !!(selectedJob && !selectedJob.isSupport && selectedJob.job && selectedJob.status !== 'open');

  const fetchAssets = async () => {
    if (!assetsAvailable) { setAssets([]); return; }
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/${selectedJob.job._id}/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssets(res.data || []);
    } catch (err) {
      console.error('Failed to load assets', err);
    }
  };

  useEffect(() => {
    setShowAssets(false);
    setAssets([]);
    if (assetsAvailable) fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob?._id]);

  const handleAssetPick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleAssetUpload = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ''; // allow re-selecting the same file
    if (!file || !selectedJob?.job?._id) return;

    if (file.size > MAX_ASSET_BYTES) {
      toast.error('File exceeds the 25 MB limit.');
      return;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      toast.error(`Files of type .${ext} are not allowed.`);
      return;
    }

    setUploadingAsset(true);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('asset', file);

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/jobs/${selectedJob.job._id}/assets`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );

      setAssets((prev) => [res.data.asset, ...prev]);
      toast.success('Asset shared with freelancer');
    } catch (err) {
      console.error('Asset upload failed', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to upload asset');
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleAssetDelete = async (assetId) => {
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/jobs/${selectedJob.job._id}/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssets((prev) => prev.filter((a) => a._id !== assetId));
      toast.success('Asset removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove asset');
    }
  };

  if (loadingJobs) return <div className="p-8 text-center text-blue-600">Loading chats...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[80vh] flex overflow-hidden">
      
      {/* Propose Counter Offer Modal */}
      {createPortal(
        <AnimatePresence>
          {showCounterModal && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCounterModal(false)}
                className="absolute inset-0"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xl flex flex-col z-10 text-center"
              >
                <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-2">
                  Propose Counter-Offer
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Submit a counter-proposal to negotiate the project budget. The other party must accept to establish the active contract.
                </p>

                <div className="space-y-4 text-left mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Proposed Price (₹) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={counterAmount}
                      onChange={(e) => setCounterAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Negotiation Message (Optional)</label>
                    <textarea
                      value={counterMessage}
                      onChange={(e) => setCounterMessage(e.target.value)}
                      placeholder="Provide context or terms for this counter-offer..."
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm h-20 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowCounterModal(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCounterSubmit}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md transition-colors"
                  >
                    Propose Rate
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Sidebar: Job List */}
      <div className="w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800 text-lg">My Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {jobs.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No active jobs found to chat about.</div>
          ) : (
            <>
              {/* Support Chats */}
              {jobs.filter(j => j.isSupport).length > 0 && (
                <div className="mb-2">
                  {jobs.filter(j => j.isSupport).map(job => (
                    <div 
                      key={job._id}
                      onClick={() => setSelectedJob(job)}
                      className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${selectedJob?._id === job._id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-100'}`}
                    >
                      <h3 className="font-semibold text-slate-800 truncate">{job.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 truncate">{job.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Projects (Accepted/Hired) */}
              {jobs.filter(j => !j.isSupport && j.status !== 'open').length > 0 && (
                <div className="mb-2">
                  <h4 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100/50">Active Projects</h4>
                  {jobs.filter(j => !j.isSupport && j.status !== 'open').map(job => (
                    <div 
                      key={job._id}
                      onClick={() => setSelectedJob(job)}
                      className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${selectedJob?._id === job._id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-100'}`}
                    >
                      <h3 className="font-semibold text-slate-800 truncate">{job.title}</h3>
                      <p className="text-xs text-emerald-600 font-semibold mt-1 truncate flex items-center gap-1">
                        <Star size={12} className="inline mr-1 text-amber-500 fill-amber-500" /> {job.status.toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 truncate">{job.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Open Projects / Proposals */}
              {jobs.filter(j => !j.isSupport && j.status === 'open').length > 0 && (
                <div className="mb-2">
                  <h4 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100/50">Open Proposals</h4>
                  {jobs.filter(j => !j.isSupport && j.status === 'open').map(job => (
                    <div 
                      key={job._id}
                      onClick={() => setSelectedJob(job)}
                      className={`p-4 border-b border-slate-100 cursor-pointer transition-colors opacity-80 hover:opacity-100 ${selectedJob?._id === job._id ? 'bg-blue-50 border-l-4 border-l-blue-600 opacity-100' : 'hover:bg-slate-100'}`}
                    >
                      <h3 className="font-semibold text-slate-800 truncate">{job.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 truncate">{job.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedJob ? (
        <div className="flex-1 flex flex-col relative">
          <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm z-10">
            <div>
              <h2 className="font-bold text-slate-800">{selectedJob.title}</h2>
              <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span> Online
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {assetsAvailable && (
                <button
                  type="button"
                  onClick={() => setShowAssets((s) => !s)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] ${
                    showAssets
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
                  }`}
                >
                  📎 Assets{assets.length > 0 ? ` (${assets.length})` : ''}
                </button>
              )}
              {selectedJob.status === 'open' && selectedJob.bidId && (
                <button
                  type="button"
                  onClick={handleProposeCounterClick}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl border border-blue-200 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PenLine size={16} className="inline mr-1" /> Propose Counter-Offer
                </button>
              )}
              {!selectedJob.isSupport && (
                <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                  ₹{selectedJob.budget.toLocaleString('en-IN')} - {selectedJob.status.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Project Assets Panel */}
          {assetsAvailable && showAssets && (
            <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3 shadow-inner z-10 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  📎 Project Assets
                </span>
                {user.role === 'client' && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAssetUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAssetPick}
                      disabled={uploadingAsset}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingAsset ? 'Uploading…' : '⬆ Upload file'}
                    </button>
                  </>
                )}
              </div>

              <p className="text-[10px] text-slate-400">
                {user.role === 'client'
                  ? 'Share briefs, images, or reference files with your hired freelancer. Max 25 MB per file.'
                  : 'Files shared by the client for this project. Click to download.'}
              </p>

              {assets.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
                  No assets shared yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                  {assets.map((asset) => (
                    <div
                      key={asset._id}
                      className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate" title={asset.name}>
                          {asset.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatBytes(asset.size)}{asset.size ? ' · ' : ''}
                          {new Date(asset.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
                        >
                          Download
                        </a>
                        {user.role === 'client' && (
                          <button
                            type="button"
                            onClick={() => handleAssetDelete(asset._id)}
                            className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                            title="Remove asset"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Visual Timeline and Action buttons for Negotiation */}
          {selectedJob.negotiationHistory && selectedJob.negotiationHistory.length > 0 && (
            <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3 shadow-inner z-10 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  🤝 Budget Negotiation History
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                  {selectedJob.negotiationHistory.length} offers
                </span>
              </div>
              
              {/* Horizontal Timeline display */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {selectedJob.negotiationHistory.map((hist, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                    <div className={`p-2 rounded-xl border text-left text-xs ${
                      hist.status === 'accepted'
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                        : hist.status === 'rejected'
                        ? 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                        : 'bg-blue-50 border-blue-200 text-blue-800 ring-2 ring-blue-500/20'
                    }`}>
                      <div className="flex justify-between items-center gap-4">
                        <span className="font-bold">₹{hist.amount.toLocaleString('en-IN')}</span>
                        <span className="text-[8px] uppercase tracking-wide opacity-80 font-extrabold">
                          {hist.offeredBy}
                        </span>
                      </div>
                      {hist.message && (
                        <p className="text-[9px] mt-0.5 text-slate-500 line-clamp-1 italic max-w-[150px]" title={hist.message}>
                          "{hist.message}"
                        </p>
                      )}
                    </div>
                    {idx < selectedJob.negotiationHistory.length - 1 && (
                      <span className="text-slate-300 font-bold">➔</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Banner for pending counter-offers */}
              {(() => {
                const history = selectedJob.negotiationHistory || [];
                if (history.length === 0) return null;
                const lastOffer = history[history.length - 1];
                if (lastOffer && lastOffer.status === 'pending') {
                  const proposedByMe = (lastOffer.offeredBy === 'client' && user.role === 'client') || 
                                       (lastOffer.offeredBy === 'freelancer' && user.role === 'freelancer');
                  
                  if (proposedByMe) {
                    return (
                      <div className="p-2.5 bg-blue-50/50 border border-blue-150 rounded-xl text-xs text-blue-700 font-semibold text-center flex items-center justify-center gap-1.5 shadow-sm">
                        <span className="animate-pulse">⏳</span> Awaiting response on your proposed counter-offer of <span className="font-bold text-blue-800">₹{lastOffer.amount.toLocaleString('en-IN')}</span>.
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                        <div className="text-left">
                          <p className="text-xs font-extrabold text-amber-800">
                            Counter-Offer Received: ₹{lastOffer.amount.toLocaleString('en-IN')}
                          </p>
                          {lastOffer.message && (
                            <p className="text-[10px] text-amber-600 mt-0.5">
                              "{lastOffer.message}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={handleRejectCounterOffer}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-rose-650 hover:text-rose-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors shadow-sm"
                          >
                            Decline
                          </button>
                          <button
                            onClick={handleAcceptCounterOffer}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                          >
                            Accept Offer
                          </button>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-2 mb-6">
              <span className="bg-blue-50 text-blue-700 text-xs px-4 py-1.5 rounded-full font-medium flex items-center shadow-sm border border-blue-100">
                🔒 Messages are encrypted in transit and at rest
              </span>
              {!selectedJob.isSupport && (
                <span className="bg-amber-50 text-amber-700 text-[11px] px-4 py-1.5 rounded-full font-medium flex items-center shadow-sm border border-amber-100 text-center">
                  <ShieldAlert size={14} className="inline mr-1 text-amber-500" /> Sharing phone numbers, emails, UPI, or social handles is blocked and monitored
                </span>
              )}
            </div>

            {messages.length === 0 && (
              <div className="text-center py-10 text-sm text-slate-400">
                No messages yet. Send a message to start the conversation!
              </div>
            )}

            {messages.map((msg, idx) => {
              const isMe = msg.senderModel 
                ? (msg.senderModel === 'User' && msg.user === (user.id || user._id))
                : (msg.sender === (user.id || user._id));
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg._id || idx} 
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] p-3.5 rounded-2xl shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}>
                    <p className="text-sm break-all">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1.5">
                      <span className={`text-[10px] block ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      {isMe && (
                        <span className="text-[10px] leading-none select-none">
                          {msg.isRead ? (
                            <span className="text-cyan-300 font-bold" title="Read">✓✓</span>
                          ) : (
                            <span className="text-blue-200/50" title="Sent">✓</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Real-time Typing Status Indicator */}
            {otherUserTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start items-center gap-1.5 text-xs text-slate-400 font-medium px-4 py-1"
              >
                <div className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span>The other party is typing...</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            <input 
              type="text" 
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (socket) {
                  socket.emit('typing', {
                    roomName: selectedJob.roomName,
                    username: user.name
                  });
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    socket.emit('stop_typing', {
                      roomName: selectedJob.roomName,
                      username: user.name
                    });
                  }, 2000);
                }
              }}
              onBlur={() => {
                if (socket) {
                  socket.emit('stop_typing', {
                    roomName: selectedJob.roomName,
                    username: user.name
                  });
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
              disabled={!selectedJob.isSupport && user.role === 'client' && selectedJob.status === 'open' && !selectedJob.freelancer}
            />
            <button 
              type="submit" 
              disabled={!selectedJob.isSupport && user.role === 'client' && selectedJob.status === 'open' && !selectedJob.freelancer}
              className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
          
          {!selectedJob.isSupport && user.role === 'client' && selectedJob.status === 'open' && !selectedJob.freelancer && (
            <div className="absolute bottom-[72px] left-0 w-full bg-slate-50 text-slate-600 text-xs p-2 text-center border-t border-slate-100">
              No freelancer has bid on this job yet. Conversations will start once bids are received.
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-700">Your Messages</h3>
            <p className="text-slate-500 text-sm mt-1">Select a job from the sidebar to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
