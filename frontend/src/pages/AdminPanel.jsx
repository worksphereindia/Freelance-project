import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Users, 
  Briefcase, 
  LayoutDashboard, 
  Receipt, 
  CheckCircle, 
  XCircle, 
  Search, 
  ShieldCheck, 
  IndianRupee, 
  TrendingUp, 
  Activity,
  UserCheck,
  UserX,
  FileText,
  Menu,
  CreditCard,
  AlertCircle,
  MessageSquare,
  MapPin,
  ExternalLink
} from 'lucide-react';
import Loading from '../components/Loading';
import AdminLiveChats from '../components/AdminLiveChats';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'jobs', 'payments'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobApprovalFilter, setJobApprovalFilter] = useState('all');

  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  // Interactive Chart Tooltip State
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [activeSignupTooltip, setActiveSignupTooltip] = useState(null);

  // Dispute Chat Log Modal State
  const [chatLogModal, setChatLogModal] = useState({ isOpen: false, messages: [], jobId: null, loading: false });

  // Admin Rating Modal State
  const [ratingModal, setRatingModal] = useState({ isOpen: false, freelancerId: null, rating: 5 });

  // Review Modals State
  const [reviewFreelancerModal, setReviewFreelancerModal] = useState({ isOpen: false, freelancer: null });
  const [reviewJobModal, setReviewJobModal] = useState({ isOpen: false, job: null });

  // Contact Messages State
  const [contactMessages, setContactMessages] = useState([]);

  // Safety Violations State
  const [violations, setViolations] = useState([]);
  const [loadingViolations, setLoadingViolations] = useState(false);

  // Admin Audit Log State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const getHeaders = () => {
    const token = sessionStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/admin/stats', {
        headers: getHeaders()
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load admin stats. Please verify your administrator privileges.');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactMessages = async () => {
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/admin/contact-messages', {
        headers: getHeaders()
      });
      setContactMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch contact messages', err);
    }
  };

  const fetchViolations = async () => {
    setLoadingViolations(true);
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/admin/violations', {
        headers: getHeaders()
      });
      setViolations(res.data);
    } catch (err) {
      console.error('Failed to fetch safety violations', err);
      toast.error('Failed to load safety logs');
    } finally {
      setLoadingViolations(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/admin/audit-logs', {
        headers: getHeaders()
      });
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const resolveContactMessage = async (id) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/contact-messages/${id}/resolve`, {}, {
        headers: getHeaders()
      });
      toast.success('Message marked as resolved');
      fetchContactMessages();
    } catch (err) {
      toast.error('Failed to resolve message');
    }
  };

  const [replyModal, setReplyModal] = useState({ isOpen: false, messageId: null, email: '', replyText: '' });

  const handleReplySubmit = async () => {
    if (!replyModal.replyText.trim()) return toast.error('Please enter a reply message');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/contact-messages/${replyModal.messageId}/reply`, {
        replyText: replyModal.replyText
      }, {
        headers: getHeaders()
      });
      toast.success('Reply sent via email and message resolved');
      setReplyModal({ isOpen: false, messageId: null, email: '', replyText: '' });
      fetchContactMessages();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchContactMessages();
    fetchViolations();
    fetchAuditLogs();
  }, []);

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? This is irreversible.")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/users/${id}`, {
        headers: getHeaders()
      });
      toast.success("User deleted successfully");
      fetchStats();
      fetchAuditLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    }
  };

  const deleteJob = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job? This is irreversible.")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/jobs/${id}`, {
        headers: getHeaders()
      });
      toast.success("Job deleted successfully");
      fetchStats();
      fetchAuditLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete job");
    }
  };

  const approveJob = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/jobs/${id}/approve`, {}, {
        headers: getHeaders()
      });
      toast.success("Job approved and published!");
      fetchStats();
    } catch (err) {
      toast.error("Failed to approve job");
    }
  };

  const approveFreelancer = async (id, adminRating) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/approve-freelancer/${id}`, {
        adminRating
      }, {
        headers: getHeaders()
      });
      toast.success("Freelancer verified and rated successfully!");
      setRatingModal({ isOpen: false, freelancerId: null, rating: 5 });
      fetchStats();
    } catch (err) {
      toast.error("Failed to approve freelancer");
    }
  };

  const revokeFreelancer = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/revoke-freelancer/${id}`, {}, {
        headers: getHeaders()
      });
      toast.success("Freelancer verification revoked.");
      fetchStats();
    } catch (err) {
      toast.error("Failed to revoke freelancer verification");
    }
  };

  const fetchChatLog = async (jobId) => {
    setChatLogModal({ isOpen: true, messages: [], jobId, loading: true });
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/resolve-dispute/${jobId}/messages`, {
        headers: getHeaders()
      });
      setChatLogModal({ isOpen: true, messages: res.data, jobId, loading: false });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load chat logs");
      setChatLogModal(prev => ({ ...prev, loading: false, isOpen: false }));
    }
  };

  const resolveDispute = async (jobId, action) => {
    const isRefund = action === 'refund';
    const message = isRefund 
      ? "Are you sure you want to refund the client? This will cancel the project and refund the escrowed funds to the client."
      : "Are you sure you want to release the funds to the freelancer? This will complete the project and payout the escrowed funds to the freelancer.";
    
    if (!window.confirm(message)) return;

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/resolve-dispute/${jobId}`, {
        refundClient: isRefund
      }, {
        headers: getHeaders()
      });
      toast.success(res.data.message || "Dispute resolved successfully!");
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to resolve dispute");
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="text-center py-20 text-red-500 font-semibold">{error}</div>;
  if (!stats) return null;

  // Filter logic
  const filteredUsers = (stats?.users || []).filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'all' || 
                          (userStatusFilter === 'approved' && u.isFreelancerApproved) || 
                          (userStatusFilter === 'pending' && u.role === 'freelancer' && !u.isFreelancerApproved);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredJobs = (stats?.jobs || []).filter(j => {
    const clientName = j.client?.name || '';
    const matchesSearch = j.title.toLowerCase().includes(jobSearch.toLowerCase()) || 
                          clientName.toLowerCase().includes(jobSearch.toLowerCase());
    const matchesStatus = jobStatusFilter === 'all' || j.status === jobStatusFilter;
    const matchesApproval = jobApprovalFilter === 'all' || 
                            (jobApprovalFilter === 'approved' && j.isApproved) || 
                            (jobApprovalFilter === 'pending' && !j.isApproved);
    return matchesSearch && matchesStatus && matchesApproval;
  });

  const filteredPayments = (stats?.payments || []).filter(p => {
    const clientName = p.client?.name || '';
    const freelancerName = p.freelancer?.name || '';
    const jobTitle = p.job?.title || '';
    const matchesSearch = clientName.toLowerCase().includes(paymentSearch.toLowerCase()) || 
                          freelancerName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                          jobTitle.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                          (p.razorpayOrderId || '').toLowerCase().includes(paymentSearch.toLowerCase());
    const matchesStatus = paymentStatusFilter === 'all' || p.status === paymentStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate total escrow volume and platform fees from payments list dynamically on the client side
  const fundedPaymentsForCalc = (stats?.payments || []).filter(p => p.status === 'escrow_funded' || p.status === 'released');
  const clientTotalEscrowVolume = fundedPaymentsForCalc.reduce((sum, p) => sum + (p.amount || 0), 0);
  const clientPlatformFees = fundedPaymentsForCalc.reduce((sum, p) => sum + (p.platformFee || 0), 0);

  // Calculate Chart Coordinates
  const getAreaChartPoints = () => {
    const rawData = [...(stats?.payments || [])]
      .filter(p => p.status === 'escrow_funded' || p.status === 'released')
      .reverse();

    // Default mock historical trend if transaction list is sparse
    const mockData = [
      { label: 'Jan', value: 2000 },
      { label: 'Feb', value: 4500 },
      { label: 'Mar', value: 8000 },
      { label: 'Apr', value: 12000 },
      { label: 'May', value: clientTotalEscrowVolume * 0.7 || 18000 },
      { label: 'Jun', value: clientTotalEscrowVolume || 25000 }
    ];

    const data = rawData.length > 2 ? rawData.map((p, idx) => ({
      label: new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: p.amount
    })) : mockData;

    const maxVal = Math.max(...data.map(d => d.value), 1000);
    const width = 600;
    const height = 220;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = data.map((d, idx) => {
      const x = paddingLeft + (idx / (data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.value / maxVal) * chartHeight;
      return { x, y, label: d.label, value: d.value };
    });

    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
    }

    return { points, linePath, areaPath, width, height, maxVal, chartHeight, paddingTop, paddingLeft, chartWidth };
  };

  const getSignupTrendPoints = () => {
    const rawUsers = stats?.users || [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendData.push({
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        label: `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`,
        clients: 0,
        freelancers: 0,
        total: 0
      });
    }

    rawUsers.forEach(u => {
      if (!u.createdAt) return;
      const date = new Date(u.createdAt);
      const mIdx = date.getMonth();
      const yr = date.getFullYear();
      
      const bucket = trendData.find(t => t.monthIndex === mIdx && t.year === yr);
      if (bucket) {
        if (u.role === 'client') bucket.clients += 1;
        if (u.role === 'freelancer') bucket.freelancers += 1;
        bucket.total += 1;
      }
    });

    const isDataEmpty = trendData.every(t => t.total === 0);
    const finalData = isDataEmpty ? trendData.map((t, idx) => ({
      ...t,
      clients: [2, 5, 8, 12, 18, 25][idx],
      freelancers: [3, 9, 14, 20, 32, 45][idx],
      total: [5, 14, 22, 32, 50, 70][idx]
    })) : trendData;

    const maxVal = Math.max(...finalData.map(d => d.total), 5);
    const width = 600;
    const height = 220;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = finalData.map((d, idx) => {
      const x = paddingLeft + (idx / (finalData.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.total / maxVal) * chartHeight;
      return { x, y, label: d.label, value: d.total, clients: d.clients, freelancers: d.freelancers };
    });

    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
    }

    return { points, linePath, areaPath, width, height, maxVal, chartHeight, paddingTop, paddingLeft, chartWidth };
  };

  const chartInfo = getAreaChartPoints();
  const signupChartInfo = getSignupTrendPoints();

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 min-h-[calc(100vh-64px)] relative">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Section */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-600 flex flex-col justify-between p-6 border-r border-slate-200/80 transition-transform duration-300 transform md:translate-x-0 md:static md:h-[calc(100vh-64px)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex-shrink-0`}>
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/25">
              W
            </div>
            <div>
              <span className="font-extrabold text-slate-800 text-lg tracking-tight">WorkSphere</span>
              <span className="block text-[10px] text-blue-600 font-bold uppercase tracking-wider">Admin Engine</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <LayoutDashboard size={18} />
              Overview Console
            </button>

            <button
              onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <Users size={18} />
                Manage Users
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'users' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {stats?.userCount || 0}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('jobs'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'jobs' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <Briefcase size={18} />
                Manage Projects
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'jobs' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {stats?.jobCount || 0}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('payments'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'payments' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <Receipt size={18} />
                Financial Orders
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'payments' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {stats?.paymentCount || 0}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('disputes'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'disputes' ? 'bg-rose-50 text-rose-600 border border-rose-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <AlertCircle size={18} />
                Disputed Projects
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('support'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'support' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <MessageSquare size={18} />
                Support Tickets
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('live-chats'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'live-chats' ? 'bg-cyan-50 text-cyan-600 border border-cyan-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <MessageSquare size={18} />
                Live Chats
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('violations'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'violations' ? 'bg-amber-50 text-amber-600 border border-amber-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <ShieldCheck size={18} />
                Safety Violations
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('subscriptions'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'subscriptions' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <CreditCard size={18} />
                Subscriptions
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('audit'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'audit' ? 'bg-slate-100 text-slate-800 border border-slate-200 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <FileText size={18} />
                Audit Log
              </span>
              {auditLogs.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'audit' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'}`}>
                  {auditLogs.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-slate-100 px-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            AD
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Security Guard</p>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Admin Authorization
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-[calc(100vh-64px)]">
        {/* Header Navigation */}
        <header className="bg-white border-b border-slate-150 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
          <div className="flex items-center">
            {/* Hamburger Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors mr-2"
              title="Toggle Menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 capitalize tracking-tight">{activeTab} Dashboard</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Real-time system health checks & dispute settlement console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-semibold px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> API: Live
            </span>
          </div>
        </header>

        {/* Content Tabs Switcher */}
        <div className="flex-1 p-8 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Stats Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Card 1 */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Escrow Volume</p>
                      <p className="text-2xl font-black text-slate-900">₹{clientTotalEscrowVolume.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                        <TrendingUp size={12} /> Real-time active deposits
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <IndianRupee size={22} />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Commissions</p>
                      <p className="text-2xl font-black text-slate-900">₹{clientPlatformFees.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-emerald-500 font-bold">5% Escrow commission rate</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <TrendingUp size={22} />
                    </div>
                  </div>
                  {/* Card 2.5 - Subscriptions */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subscription Revenue</p>
                      <p className="text-2xl font-black text-slate-900">₹{(stats?.totalSubscriptionRevenue || 0).toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-blue-500 font-bold">Freelancer Plan Sales</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <CreditCard size={22} />
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workspace Contracts</p>
                      <p className="text-2xl font-black text-slate-900">{(stats?.jobs || []).filter(j => j.status === 'in-progress' || j.status === 'delivered').length}</p>
                      <p className="text-[10px] text-amber-500 font-bold">{(stats?.jobs || []).filter(j => j.status === 'delivered').length} waiting for client approval</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Activity size={22} />
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registered Accounts</p>
                      <p className="text-2xl font-black text-slate-900">{stats?.userCount || 0}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">Clients & Verified Freelancers</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Users size={22} />
                    </div>
                  </div>
                </div>

                {/* Charts Segment */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Area Chart Component */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Escrow Transaction Trends</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Chronological representation of funded transaction values</p>
                    </div>

                    <div className="relative pt-4 flex justify-center">
                      <svg width="100%" height={chartInfo.height} viewBox={`0 0 ${chartInfo.width} ${chartInfo.height}`} className="overflow-visible">
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25"/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00"/>
                          </linearGradient>
                        </defs>

                        {/* Y-axis gridlines & labels */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                          const y = chartInfo.paddingTop + chartInfo.chartHeight * (1 - ratio);
                          const val = Math.round(chartInfo.maxVal * ratio);
                          return (
                            <g key={index} className="opacity-40">
                              <line 
                                x1={chartInfo.paddingLeft} 
                                y1={y} 
                                x2={chartInfo.width - 20} 
                                y2={y} 
                                stroke="#cbd5e1" 
                                strokeDasharray="4 4"
                              />
                              <text 
                                x={chartInfo.paddingLeft - 10} 
                                y={y + 4} 
                                fill="#64748b" 
                                fontSize="10" 
                                fontWeight="bold" 
                                textAnchor="end"
                              >
                                ₹{val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                              </text>
                            </g>
                          );
                        })}

                        {/* Chart Area */}
                        {chartInfo.areaPath && (
                          <path d={chartInfo.areaPath} fill="url(#areaGrad)" />
                        )}

                        {/* Chart Line */}
                        {chartInfo.linePath && (
                          <path 
                            d={chartInfo.linePath} 
                            fill="none" 
                            stroke="#3b82f6" 
                            strokeWidth="3.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                        )}

                        {/* Interactive Nodes */}
                        {chartInfo.points.map((p, idx) => (
                          <g 
                            key={idx}
                            onMouseEnter={() => setActiveTooltip(p)}
                            onMouseLeave={() => setActiveTooltip(null)}
                            className="cursor-pointer"
                          >
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="5" 
                              fill="#ffffff" 
                              stroke="#3b82f6" 
                              strokeWidth="3"
                              className="transition-all hover:r-7"
                            />
                            {/* Hover highlight circle */}
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="12" 
                              fill="#3b82f6" 
                              opacity="0" 
                              className="hover:opacity-10 transition-opacity"
                            />
                          </g>
                        ))}

                        {/* X-axis labels */}
                        {chartInfo.points.map((p, idx) => (
                          <text 
                            key={idx}
                            x={p.x} 
                            y={chartInfo.height - 15} 
                            fill="#94a3b8" 
                            fontSize="10" 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            {p.label}
                          </text>
                        ))}
                      </svg>

                      {/* Tooltip Overlay */}
                      {activeTooltip && (
                        <div 
                          className="absolute bg-slate-900 text-white rounded-xl px-3 py-2 shadow-xl border border-slate-700 pointer-events-none text-left space-y-0.5 transition-all"
                          style={{
                            left: `${(activeTooltip.x / chartInfo.width) * 100}%`,
                            top: `${(activeTooltip.y / chartInfo.height) * 80}%`,
                            transform: 'translate(-50%, -115%)'
                          }}
                        >
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{activeTooltip.label}</p>
                          <p className="text-xs font-black text-blue-400">₹{activeTooltip.value.toLocaleString('en-IN')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pie / Donut Chart Statuses */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Project Breakdown</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Distribution of platform jobs by project status</p>
                    </div>

                    <div className="flex justify-center items-center py-2 relative">
                      {/* Donut Draw */}
                      {(() => {
                        const statusCounts = [
                          { label: 'Open', count: (stats?.jobs || []).filter(j => j.status === 'open').length, color: '#3b82f6' },
                          { label: 'Hired', count: (stats?.jobs || []).filter(j => j.status === 'in-progress').length, color: '#f59e0b' },
                          { label: 'Delivered', count: (stats?.jobs || []).filter(j => j.status === 'delivered').length, color: '#6366f1' },
                          { label: 'Completed', count: (stats?.jobs || []).filter(j => j.status === 'completed').length, color: '#10b981' }
                        ];

                        const total = statusCounts.reduce((acc, c) => acc + c.count, 0);

                        if (total === 0) {
                          return (
                            <div className="w-36 h-36 rounded-full border-8 border-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                              NO PROJECTS
                            </div>
                          );
                        }

                        let accumulatedPercent = 0;
                        const r = 36;
                        const c = 2 * Math.PI * r; // 226.19

                        return (
                          <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
                              {statusCounts.map((s, idx) => {
                                const percent = s.count / total;
                                const strokeDasharray = `${percent * c} ${c}`;
                                const strokeDashoffset = -accumulatedPercent * c;
                                accumulatedPercent += percent;

                                if (s.count === 0) return null;

                                return (
                                  <circle
                                    key={idx}
                                    cx="50"
                                    cy="50"
                                    r={r}
                                    fill="transparent"
                                    stroke={s.color}
                                    strokeWidth="10"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    className="transition-all hover:stroke-width-12"
                                  />
                                );
                              })}
                            </svg>
                            <div className="absolute text-center">
                              <span className="block text-2xl font-black text-slate-900">{total}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded bg-blue-500"></span> Open ({(stats?.jobs || []).filter(j => j.status === 'open').length})
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Hired ({(stats?.jobs || []).filter(j => j.status === 'in-progress').length})
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> Delivered ({(stats?.jobs || []).filter(j => j.status === 'delivered').length})
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Done ({(stats?.jobs || []).filter(j => j.status === 'completed').length})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary Charts Segment */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Signup Trends Chart */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4 text-left">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Account Signup Growth</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Chronological tracking of registered Clients and Freelancers</p>
                    </div>

                    <div className="relative pt-4 flex justify-center">
                      <svg width="100%" height={signupChartInfo.height} viewBox={`0 0 ${signupChartInfo.width} ${signupChartInfo.height}`} className="overflow-visible">
                        <defs>
                          <linearGradient id="signupAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.00"/>
                          </linearGradient>
                        </defs>

                        {/* Y-axis gridlines & labels */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                          const y = signupChartInfo.paddingTop + signupChartInfo.chartHeight * (1 - ratio);
                          const val = Math.round(signupChartInfo.maxVal * ratio);
                          return (
                            <g key={index} className="opacity-45">
                              <line 
                                x1={signupChartInfo.paddingLeft} 
                                y1={y} 
                                x2={signupChartInfo.width - 20} 
                                y2={y} 
                                stroke="#cbd5e1" 
                                strokeDasharray="4 4"
                              />
                              <text 
                                x={signupChartInfo.paddingLeft - 10} 
                                y={y + 4} 
                                fill="#64748b" 
                                fontSize="10" 
                                fontWeight="bold" 
                                textAnchor="end"
                              >
                                {val}
                              </text>
                            </g>
                          );
                        })}

                        {/* Chart Area */}
                        {signupChartInfo.areaPath && (
                          <path d={signupChartInfo.areaPath} fill="url(#signupAreaGrad)" />
                        )}

                        {/* Chart Line */}
                        {signupChartInfo.linePath && (
                          <path 
                            d={signupChartInfo.linePath} 
                            fill="none" 
                            stroke="#10b981" 
                            strokeWidth="3.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                        )}

                        {/* Nodes */}
                        {signupChartInfo.points.map((p, idx) => (
                          <g 
                            key={idx}
                            onMouseEnter={() => setActiveSignupTooltip(p)}
                            onMouseLeave={() => setActiveSignupTooltip(null)}
                            className="cursor-pointer"
                          >
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="5" 
                              fill="#ffffff" 
                              stroke="#10b981" 
                              strokeWidth="3"
                            />
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="12" 
                              fill="#10b981" 
                              opacity="0" 
                              className="hover:opacity-10 transition-opacity"
                            />
                          </g>
                        ))}

                        {/* X-axis labels */}
                        {signupChartInfo.points.map((p, idx) => (
                          <text 
                            key={idx}
                            x={p.x} 
                            y={signupChartInfo.height - 15} 
                            fill="#94a3b8" 
                            fontSize="10" 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            {p.label}
                          </text>
                        ))}
                      </svg>

                      {/* Tooltip Overlay */}
                      {activeSignupTooltip && (
                        <div 
                          className="absolute bg-slate-900 text-white rounded-xl px-3 py-2.5 shadow-xl border border-slate-700 pointer-events-none text-left space-y-0.5 transition-all text-xs"
                          style={{
                            left: `${(activeSignupTooltip.x / signupChartInfo.width) * 100}%`,
                            top: `${(activeSignupTooltip.y / signupChartInfo.height) * 80}%`,
                            transform: 'translate(-50%, -115%)'
                          }}
                        >
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{activeSignupTooltip.label}</p>
                          <p className="font-extrabold text-emerald-400">Total: {activeSignupTooltip.value} users</p>
                          <p className="text-[9px] text-slate-300">Clients: {activeSignupTooltip.clients} | Freelancers: {activeSignupTooltip.freelancers}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Safety violations quick-view */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between space-y-4 text-left">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Escrow Integrity & Safety</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Summary of safety violations and policy compliance</p>
                    </div>
                    <div className="flex flex-col items-center justify-center py-5 bg-amber-50 border border-amber-100 rounded-2xl">
                      <ShieldCheck className="text-amber-500 mb-2 animate-pulse" size={36} />
                      <span className="text-3xl font-black text-slate-900">{violations.length}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Logged Infractions</span>
                    </div>
                    <button 
                      onClick={() => setActiveTab('violations')} 
                      className="w-full py-3 bg-slate-800 hover:bg-slate-950 text-white font-bold rounded-2xl text-[10px] transition-colors shadow-sm"
                    >
                      Audit Violations Log
                    </button>
                  </div>
                </div>

                {/* Highlight/Disputes Quick Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm mb-4">Pending Approvals Queue</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pending Freelancers Info */}
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Pending Freelancer Approvals</h4>
                        <p className="text-xl font-black text-blue-700 mt-1">{(stats?.users || []).filter(u => u.role === 'freelancer' && !u.isFreelancerApproved).length}</p>
                      </div>
                      <button 
                        onClick={() => { setActiveTab('users'); setUserStatusFilter('pending'); }}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition-colors"
                      >
                        Review
                      </button>
                    </div>

                    {/* Pending Jobs Info */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Pending Job Moderations</h4>
                        <p className="text-xl font-black text-slate-700 mt-1">{(stats?.jobs || []).filter(j => !j.isApproved).length}</p>
                      </div>
                      <button 
                        onClick={() => { setActiveTab('jobs'); setJobApprovalFilter('pending'); }}
                        className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg text-[10px] transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Search & Filter Header */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search users by name or email..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                      value={userRoleFilter}
                      onChange={e => setUserRoleFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="all">All Roles</option>
                      <option value="client">Clients</option>
                      <option value="freelancer">Freelancers</option>
                      <option value="admin">Administrators</option>
                    </select>

                    <select
                      value={userStatusFilter}
                      onChange={e => setUserStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="all">All Verification Statuses</option>
                      <option value="approved">Approved Freelancers</option>
                      <option value="pending">Pending Approval</option>
                    </select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="p-4 pl-6">User Details</th>
                          <th className="p-4">Contact Info</th>
                          <th className="p-4">Verification Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center p-12 text-slate-400 font-medium bg-white">
                              No users match your active search or filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(u => (
                            <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 pl-6 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 uppercase text-xs">
                                  {u.name.substring(0,2)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                    {u.name}
                                    {u.role === 'admin' && (
                                      <span className="bg-purple-100 text-purple-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">ADMIN</span>
                                    )}
                                    {u.isFlagged && (
                                      <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1" title="Auto-flagged for repeated policy violations">
                                        🚩 Flagged
                                      </span>
                                    )}
                                    {u.violationCount > 0 && (
                                      <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded-full font-bold" title="Blocked contact-sharing attempts">
                                        {u.violationCount} violation{u.violationCount === 1 ? '' : 's'}
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    <p className="text-[10px] text-slate-400 capitalize">
                                      {u.role}
                                      {u.role === 'freelancer' && ` (⭐ Admin: ${u.adminRating || 'Unrated'} | Client: ${u.rating || 'Unrated'})`}
                                    </p>
                                    {u.subscriptionPlan && u.subscriptionPlan !== 'none' && (
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${u.subscriptionPlan === 'advanced' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                                        {u.subscriptionPlan} Plan
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-slate-500 font-medium">
                                <p>{u.email}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{u.phoneNumber || 'No phone'}</p>
                              </td>
                              <td className="p-4">
                                {u.role === 'freelancer' ? (
                                  u.isFreelancerApproved ? (
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold uppercase text-[9px] flex items-center gap-1 w-max">
                                      <UserCheck size={10} /> Verified
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-bold uppercase text-[9px] flex items-center gap-1 w-max">
                                      <UserX size={10} /> Pending Approval
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400 text-[10px]">N/A (Client)</span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {u.role === 'freelancer' && (
                                    !u.isFreelancerApproved ? (
                                      <button 
                                        onClick={() => setReviewFreelancerModal({ isOpen: true, freelancer: u })} 
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                                      >
                                        Review Profile
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => revokeFreelancer(u._id)} 
                                        className="px-3 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-[10px] font-bold rounded-lg transition-colors"
                                      >
                                        Revoke Access
                                      </button>
                                    )
                                  )}
                                  
                                  {u.role !== 'admin' && (
                                    <button 
                                      onClick={() => deleteUser(u._id)} 
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete Account"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'jobs' && (
              <motion.div
                key="jobs"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Search & Filter Header */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search jobs by title or client name..."
                      value={jobSearch}
                      onChange={e => setJobSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                      value={jobStatusFilter}
                      onChange={e => setJobStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="all">All Work States</option>
                      <option value="open">Open (Bidding)</option>
                      <option value="in-progress">In Progress</option>
                      <option value="delivered">Delivered (Pending Client)</option>
                      <option value="completed">Completed</option>
                    </select>

                    <select
                      value={jobApprovalFilter}
                      onChange={e => setJobApprovalFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="all">All Moderation Statuses</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending Admin Verification</option>
                    </select>
                  </div>
                </div>

                {/* Jobs Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="p-4 pl-6">Job Details</th>
                          <th className="p-4">Owner (Client)</th>
                          <th className="p-4">Financial Budget</th>
                          <th className="p-4">Platform Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredJobs.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center p-12 text-slate-400 font-medium bg-white">
                              No jobs match your active search or filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredJobs.map(j => (
                            <tr key={j._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 pl-6 space-y-1 max-w-xs">
                                <p className="font-bold text-slate-800 truncate">{j.title}</p>
                                <p className="text-[10px] text-slate-400 line-clamp-1">{j.description}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {j.skills && j.skills.map(s => (
                                    <span key={s} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-semibold text-slate-500">{s}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 font-semibold text-slate-600">
                                {j.client?.name || 'Unknown Client'}
                              </td>
                              <td className="p-4 font-bold text-slate-800">
                                ₹{j.budget.toLocaleString('en-IN')}
                              </td>
                              <td className="p-4 space-y-1">
                                {/* State indicators */}
                                <div>
                                  {j.isApproved ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold text-[9px] uppercase">Approved</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-bold text-[9px] uppercase">Pending Admin</span>
                                  )}
                                </div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                                  Status: {j.status}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {!j.isApproved && (
                                    <button 
                                      onClick={() => setReviewJobModal({ isOpen: true, job: j })} 
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                                    >
                                      Review Job
                                    </button>
                                  )}
                                  
                                  <button 
                                    onClick={() => deleteJob(j._id)} 
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Job"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Search & Filter Header */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search by order ID, client, freelancer..."
                      value={paymentSearch}
                      onChange={e => setPaymentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                      value={paymentStatusFilter}
                      onChange={e => setPaymentStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="all">All Payment Statuses</option>
                      <option value="created">Created (Unfunded)</option>
                      <option value="escrow_funded">Secured in Escrow</option>
                      <option value="released">Released to Talent</option>
                    </select>
                  </div>
                </div>

                {/* Payments Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="p-4 pl-6">Order ID</th>
                          <th className="p-4">Project Title</th>
                          <th className="p-4">Agreed Price Breakdown</th>
                          <th className="p-4">Client vs Talent</th>
                          <th className="p-4">Escrow Badge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredPayments.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center p-12 text-slate-400 font-medium bg-white">
                              No financial orders match your active search or filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredPayments.map(p => (
                            <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 pl-6 font-bold text-slate-800">
                                {p.razorpayOrderId}
                              </td>
                              <td className="p-4 font-semibold text-slate-700 truncate max-w-[200px]">
                                {p.job?.title || 'Job Deleted'}
                              </td>
                              <td className="p-4 space-y-0.5">
                                <p className="font-bold text-slate-800">Total: ₹{(p.amount || 0).toLocaleString('en-IN')}</p>
                                <p className="text-[9px] text-slate-400 font-medium">Platform (5%): ₹{(p.platformFee || 0).toLocaleString('en-IN')}</p>
                                <p className="text-[9px] text-slate-400 font-medium">Talent Share (95%): ₹{(p.freelancerAmount || 0).toLocaleString('en-IN')}</p>
                              </td>
                              <td className="p-4 space-y-1 font-semibold text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Client: {p.client?.name || 'Unknown'}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Talent: {p.freelancer?.name || 'Unknown'}
                                </div>
                              </td>
                              <td className="p-4">
                                {p.status === 'created' && (
                                  <span className="px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-full font-bold uppercase text-[9px]">
                                    Unfunded
                                  </span>
                                )}
                                {p.status === 'escrow_funded' && (
                                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-bold uppercase text-[9px] flex items-center gap-1 w-max">
                                    🔐 Secure Escrow
                                  </span>
                                )}
                                {p.status === 'released' && (
                                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold uppercase text-[9px] flex items-center gap-1 w-max">
                                    🏆 Paid Out
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'disputes' && (
              <motion.div
                key="disputes"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-rose-50/30">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <AlertCircle className="text-rose-500" size={20} />
                      Active Disputes
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Review and resolve conflicts between clients and freelancers. Make sure to check the chat logs before releasing or refunding payments.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                        <tr>
                          <th className="p-4">Job Title</th>
                          <th className="p-4">Client</th>
                          <th className="p-4">Freelancer</th>
                          <th className="p-4">Budget</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(stats?.jobs || []).filter(j => j.status === 'disputed').length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-slate-400">No active disputes. Excellent!</td></tr>
                        ) : (
                          (stats?.jobs || []).filter(j => j.status === 'disputed').map(job => (
                            <tr key={job._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 font-bold text-slate-800">{job.title}</td>
                              <td className="p-4 text-slate-600">{job.client?.name}</td>
                              <td className="p-4 text-slate-600">{job.selectedFreelancer?.name || 'N/A'}</td>
                              <td className="p-4 font-bold text-slate-900">₹{job.budget}</td>
                              <td className="p-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => fetchChatLog(job._id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Chat Log">
                                    <MessageSquare size={16} />
                                  </button>
                                  <button onClick={() => resolveDispute(job._id, 'release')} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold" title="Pay Freelancer">
                                    Release
                                  </button>
                                  <button onClick={() => resolveDispute(job._id, 'refund')} className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold" title="Refund Client">
                                    Refund
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'support' && (
              <motion.div
                key="support"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-indigo-50/30">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <MessageSquare className="text-indigo-500" size={20} />
                      Support Tickets
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Manage user inquiries and feedback submitted via the Contact Us form.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                        <tr>
                          <th className="p-4">Date</th>
                          <th className="p-4">User</th>
                          <th className="p-4">Subject & Message</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contactMessages.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-slate-400">No support tickets found.</td></tr>
                        ) : (
                          contactMessages.map(msg => (
                            <tr key={msg._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 text-xs text-slate-500 whitespace-nowrap">{new Date(msg.createdAt).toLocaleDateString()}</td>
                              <td className="p-4">
                                <p className="font-bold text-slate-800">{msg.name || 'Guest'}</p>
                                <p className="text-[10px] text-slate-500">{msg.email}</p>
                              </td>
                              <td className="p-4 max-w-xs">
                                <p className="font-bold text-slate-800 text-xs truncate">{msg.subject}</p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{msg.message}</p>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  msg.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {msg.status}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {msg.status === 'open' && (
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => setReplyModal({ isOpen: true, messageId: msg._id, email: msg.email, replyText: '' })}
                                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                                    >
                                      Reply
                                    </button>
                                    <button 
                                      onClick={() => resolveContactMessage(msg._id)}
                                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
                                    >
                                      Mark Resolved
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'live-chats' && (
              <motion.div
                key="live-chats"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-150 shadow-sm">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                      <MessageSquare className="text-cyan-500" /> Live Chat Support
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Chat with users in real-time.</p>
                  </div>
                </div>

                <AdminLiveChats />
              </motion.div>
            )}

            {activeTab === 'violations' && (
              <motion.div
                key="violations"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-amber-50/30">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="text-amber-600" size={20} />
                      Safety Policy Violations Log
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Monitor and review contact information sharing infractions. Decrypted contents are only visible to authorized administrators.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    {loadingViolations ? (
                      <div className="p-8 text-center text-blue-600 font-semibold">Loading violations history...</div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                          <tr>
                            <th className="p-4">Timestamp</th>
                            <th className="p-4">Sender</th>
                            <th className="p-4">Receiver</th>
                            <th className="p-4">Job Title</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Flagged Message Content</th>
                          </tr>
                        </thead>
                        <tbody>
                          {violations.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="p-8 text-center text-slate-400">
                                No policy violations logged. Excellent!
                              </td>
                            </tr>
                          ) : (
                            violations.map((v) => (
                              <tr key={v._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                                  {new Date(v.createdAt).toLocaleString()}
                                </td>
                                <td className="p-4">
                                  <p className="font-bold text-slate-800 text-xs">{v.sender?.name || 'Unknown'}</p>
                                  <p className="text-[10px] text-slate-500 capitalize">{v.sender?.role || 'user'}</p>
                                </td>
                                <td className="p-4">
                                  <p className="font-bold text-slate-800 text-xs">{v.receiver?.name || 'Unknown'}</p>
                                  <p className="text-[10px] text-slate-500 capitalize">{v.receiver?.role || 'user'}</p>
                                </td>
                                <td className="p-4 text-slate-700 text-xs max-w-[150px] truncate" title={v.job?.title}>
                                  {v.job?.title || 'Unknown Job'}
                                </td>
                                <td className="p-4">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                                    {v.violationType}
                                  </span>
                                </td>
                                <td className="p-4 max-w-xs font-mono text-[11px] text-rose-600 bg-rose-50/20 whitespace-pre-wrap break-all leading-normal rounded border border-rose-100/30">
                                  {v.originalMessage}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'audit' && (
              <motion.div
                key="audit"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <FileText className="text-slate-600" size={20} />
                      Admin Audit Log
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      A record of destructive and sensitive admin actions (deletions, dispute resolutions, access revocations). Showing the latest 200 entries.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    {loadingAudit ? (
                      <div className="p-8 text-center text-blue-600 font-semibold">Loading audit log...</div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                          <tr>
                            <th className="p-4">Timestamp</th>
                            <th className="p-4">Admin</th>
                            <th className="p-4">Action</th>
                            <th className="p-4">Target</th>
                            <th className="p-4">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="p-8 text-center text-slate-400">
                                No admin actions logged yet.
                              </td>
                            </tr>
                          ) : (
                            auditLogs.map((log) => {
                              const actionColors = {
                                delete_user: 'bg-rose-100 text-rose-700',
                                delete_job: 'bg-rose-100 text-rose-700',
                                resolve_dispute: 'bg-blue-100 text-blue-700',
                                revoke_freelancer: 'bg-amber-100 text-amber-700'
                              };
                              return (
                                <tr key={log._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                                    {new Date(log.createdAt).toLocaleString()}
                                  </td>
                                  <td className="p-4 text-xs font-bold text-slate-800">
                                    {log.admin?.name || log.adminName || 'Admin'}
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${actionColors[log.action] || 'bg-slate-100 text-slate-700'}`}>
                                      {(log.action || '').replace(/_/g, ' ')}
                                    </span>
                                  </td>
                                  <td className="p-4 text-xs text-slate-700 max-w-[180px] truncate" title={log.targetLabel}>
                                    <span className="text-[9px] uppercase text-slate-400 mr-1">{log.targetType}</span>
                                    {log.targetLabel || '—'}
                                  </td>
                                  <td className="p-4 text-[11px] text-slate-500 max-w-xs whitespace-pre-wrap leading-normal">
                                    {log.details || '—'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'subscriptions' && (
              <motion.div
                key="subscriptions"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <CreditCard className="text-blue-600" size={20} />
                      Subscription Payments
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      A record of all freelancer subscription payments. Total Revenue: ₹{(stats?.totalSubscriptionRevenue || 0).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                        <tr>
                          <th className="p-4">Timestamp</th>
                          <th className="p-4">User</th>
                          <th className="p-4">Plan</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Transaction ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!(stats?.subscriptionPayments?.length) ? (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-slate-400">
                              No subscription payments recorded yet.
                            </td>
                          </tr>
                        ) : (
                          stats.subscriptionPayments.map((payment) => (
                            <tr key={payment._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                                {new Date(payment.createdAt).toLocaleString()}
                              </td>
                              <td className="p-4 text-xs font-bold text-slate-800">
                                {payment.user?.name || 'Unknown User'}<br/>
                                <span className="font-normal text-slate-500">{payment.user?.email}</span>
                              </td>
                              <td className="p-4 text-xs uppercase font-bold text-slate-700">
                                {payment.plan}
                              </td>
                              <td className="p-4 text-sm font-black text-slate-900">
                                ₹{payment.amount}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  payment.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                                  payment.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="p-4 font-mono text-[10px] text-slate-500">
                                {payment.razorpayPaymentId || payment.razorpayOrderId || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Dispute Chat Log Modal */}
      <AnimatePresence>
        {chatLogModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatLogModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-2xl bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="text-blue-500" size={20} />
                    Dispute Chat Log
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Arbitration console - reviewing secure decrypted communication
                  </p>
                </div>
                <button
                  onClick={() => setChatLogModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[300px] max-h-[50vh] pr-2 custom-scrollbar">
                {chatLogModal.loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-slate-400 font-semibold">Decrypting message logs...</p>
                  </div>
                ) : chatLogModal.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <MessageSquare size={40} className="stroke-1 mb-2 opacity-50" />
                    <p className="text-xs font-semibold">No communication history found for this contract.</p>
                  </div>
                ) : (
                  chatLogModal.messages.map((msg, idx) => {
                    const isClient = msg.sender?.role === 'client';
                    return (
                      <div
                        key={msg._id || idx}
                        className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-xs ${
                            isClient
                              ? 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50'
                              : 'bg-blue-600 text-white rounded-tr-none'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 opacity-75 font-bold text-[9px] uppercase tracking-wider">
                            <span>{msg.sender?.name || 'Unknown'}</span>
                            <span>•</span>
                            <span>{msg.sender?.role || 'User'}</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <span className="block text-[9px] mt-1.5 text-right opacity-60">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setChatLogModal(prev => ({ ...prev, isOpen: false }))}
                  className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Close Console
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approve & Rate Freelancer Modal */}
      <AnimatePresence>
        {ratingModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRatingModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center z-10"
            >
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <ShieldCheck size={32} />
              </div>

              <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-1">
                Approve & Rate Freelancer
              </h3>
              <p className="text-xs text-slate-500 mb-6 max-w-xs">
                To verify this talent's account, please rate their profile completeness and quality.
              </p>

              {/* Rating Star Selection */}
              <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRatingModal(prev => ({ ...prev, rating: star }))}
                    className="p-1 text-amber-400 hover:scale-110 active:scale-95 transition-transform"
                    title={`Rate ${star} Stars`}
                  >
                    <span className="text-3xl">
                      {star <= ratingModal.rating ? '★' : '☆'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setRatingModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => approveFreelancer(ratingModal.freelancerId, ratingModal.rating)}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-lg hover:shadow-emerald-600/20 transition-all active:scale-95"
                >
                  Approve Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Reply to Contact Us Message Modal */}
      <AnimatePresence>
        {replyModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReplyModal({ isOpen: false, messageId: null, email: '', replyText: '' })}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="text-blue-500" size={20} />
                  Reply to User
                </h3>
                <button
                  onClick={() => setReplyModal({ isOpen: false, messageId: null, email: '', replyText: '' })}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2 font-semibold">Replying to: {replyModal.email}</p>
                <textarea
                  value={replyModal.replyText}
                  onChange={(e) => setReplyModal({ ...replyModal, replyText: e.target.value })}
                  placeholder="Type your response here. This will be sent as an email to the user..."
                  className="w-full h-32 p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setReplyModal({ isOpen: false, messageId: null, email: '', replyText: '' })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReplySubmit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Send Reply
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Freelancer Modal */}
      <AnimatePresence>
        {reviewFreelancerModal.isOpen && reviewFreelancerModal.freelancer && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <UserCheck className="text-emerald-500" size={24} />
                  Review Freelancer Profile
                </h3>
                <button
                  onClick={() => setReviewFreelancerModal({ isOpen: false, freelancer: null })}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-100 to-emerald-100 border border-slate-200 flex flex-shrink-0 items-center justify-center font-black text-slate-600 text-2xl uppercase shadow-sm">
                    {reviewFreelancerModal.freelancer.name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{reviewFreelancerModal.freelancer.name}</h4>
                    <p className="text-sm font-semibold text-slate-500">{reviewFreelancerModal.freelancer.email} • {reviewFreelancerModal.freelancer.phoneNumber || 'No phone provided'}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin size={12} /> {reviewFreelancerModal.freelancer.location || 'Location Not Specified'}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 font-bold rounded-full text-xs">
                      Profile Score: {reviewFreelancerModal.freelancer.profileCompleteness || 0}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Professional Experience</h5>
                    <p className="text-base font-semibold text-slate-800">{reviewFreelancerModal.freelancer.experience} Years</p>
                  </div>
                  <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">External Portfolio</h5>
                    {reviewFreelancerModal.freelancer.portfolioUrl ? (
                      <a href={reviewFreelancerModal.freelancer.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1">
                        View Portfolio <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400 italic">Not provided</span>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-slate-800 mb-2">Claimed Skills</h5>
                  <div className="flex flex-wrap gap-2">
                    {reviewFreelancerModal.freelancer.skills?.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 font-semibold text-xs rounded-full border border-blue-100">
                        {skill}
                      </span>
                    ))}
                    {(!reviewFreelancerModal.freelancer.skills || reviewFreelancerModal.freelancer.skills.length === 0) && (
                      <span className="text-xs text-slate-400 italic">No skills listed</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setReviewFreelancerModal({ isOpen: false, freelancer: null })}
                  className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setRatingModal({ isOpen: true, freelancerId: reviewFreelancerModal.freelancer._id, rating: 5 });
                    setReviewFreelancerModal({ isOpen: false, freelancer: null });
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2"
                >
                  Proceed to Approve & Rate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Job Modal */}
      <AnimatePresence>
        {reviewJobModal.isOpen && reviewJobModal.job && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Briefcase className="text-blue-500" size={24} />
                  Review Job Posting
                </h3>
                <button
                  onClick={() => setReviewJobModal({ isOpen: false, job: null })}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div>
                  <h4 className="text-xl font-extrabold text-slate-900 mb-2">{reviewJobModal.job.title}</h4>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-black">
                    <IndianRupee size={16} /> Target Budget: ₹{reviewJobModal.job.budget?.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Job Description</h5>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {reviewJobModal.job.description}
                  </p>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-slate-800 mb-2">Required Skills</h5>
                  <div className="flex flex-wrap gap-2">
                    {reviewJobModal.job.skills?.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-full border border-indigo-100">
                        {skill}
                      </span>
                    ))}
                    {(!reviewJobModal.job.skills || reviewJobModal.job.skills.length === 0) && (
                      <span className="text-xs text-slate-400 italic">No specific skills listed</span>
                    )}
                  </div>
                </div>

                <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {reviewJobModal.job.client?.name?.substring(0,2).toUpperCase() || 'CL'}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">Posted By Client</h5>
                    <p className="text-base font-bold text-slate-800">{reviewJobModal.job.client?.name || 'Unknown Client'}</p>
                    {reviewJobModal.job.client?.companyName && (
                      <p className="text-xs font-medium text-slate-500">{reviewJobModal.job.client.companyName}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setReviewJobModal({ isOpen: false, job: null })}
                  className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Reject / Cancel
                </button>
                <button
                  onClick={() => {
                    approveJob(reviewJobModal.job._id);
                    setReviewJobModal({ isOpen: false, job: null });
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2"
                >
                  <CheckCircle size={18} /> Approve & Publish Job
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
