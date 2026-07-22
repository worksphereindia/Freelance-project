import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft, ShieldCheck, CreditCard, CheckCircle2, FileText, User, Briefcase, Calendar, Star, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import Avatar from '../components/Avatar';

// Helper to dynamically load Razorpay checkout SDK
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const TermsModal = ({ isOpen, onConfirm, onCancel }) => {
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds delay

  useEffect(() => {
    let timer;
    if (isOpen) {
      setTimeLeft(10);
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-100"
      >
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 text-blue-600">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <FileText size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Contract Terms & Conditions</h3>
          </div>
          
          <div className="text-sm text-slate-600 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <p className="font-semibold text-slate-800">Please read carefully before proceeding:</p>
            <ul className="space-y-3 list-disc pl-5">
              <li>If you share personal details and get work done outside this platform, we are not responsible for any issues.</li>
              <li>Maintain 100% trust on this platform for all your communications and transactions.</li>
              <li>For any errors or problems in the project or payment processing on our platform, we take full responsibility.</li>
              <li>Your payment will be securely held in escrow and released only upon successful completion.</li>
              <li>Any disputes will be resolved strictly through our platform's arbitration process.</li>
            </ul>
          </div>
          
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button 
              onClick={onCancel}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors w-full sm:w-auto"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              disabled={timeLeft > 0}
              className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {timeLeft > 0 ? (
                `Please read (${timeLeft}s)`
              ) : (
                <>I Agree & Proceed</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function PaymentPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJob(res.data);
    } catch (err) {
      console.error("Failed to load job details for payment", err);
      toast.error("Failed to load project billing details.");
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const handlePaymentInitiation = () => {
    setShowConfirmModal(true);
  };

  const handlePayEscrow = async () => {
    setShowConfirmModal(false);
    setIsPaying(true);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      
      // Step 1: Create Order
      const orderRes = await axios.post(import.meta.env.VITE_API_URL + '/api/payments/create-order', { jobId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { isMock, order, payment } = orderRes.data;
      
      // Step 2: Handle simulated payment if credentials are missing
      if (isMock) {
        toast.loading('Connecting to secure bank gateway...', { duration: 1500 });
        setTimeout(async () => {
          try {
            await axios.post(import.meta.env.VITE_API_URL + '/api/payments/verify', {
              razorpay_order_id: order.id,
              razorpay_payment_id: `mock_pay_${Math.random().toString(36).substring(7)}`,
              razorpay_signature: 'mock_sig_verified'
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('🎉 Payment Verified! Escrow is fully funded. You will receive an email receipt shortly.');
            fetchJobDetails(); // Reload job data
            setIsPaying(false);
            setTimeout(() => navigate(`/job/${jobId}`), 3000); // Redirect to job section
          } catch (verifyErr) {
            toast.error('Mock payment verification failed.');
            setIsPaying(false);
          }
        }, 1500);
        return;
      }
      
      // Step 3: Real Razorpay Flow
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        toast.error('Failed to load Razorpay Payment Gateway. Check internet connection.');
        setIsPaying(false);
        return;
      }
      
      // Fetch public key from backend
      const keyRes = await axios.get(import.meta.env.VITE_API_URL + '/api/payments/config/key', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const options = {
        key: keyRes.data.key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "WorkSphere Ltd.",
        description: `Escrow Funding - Job ID: ${jobId.substring(0, 8)}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            toast.loading('Verifying secure transaction...', { duration: 1500 });
            await axios.post(import.meta.env.VITE_API_URL + '/api/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('🎉 Escrow funded successfully! You will receive an email receipt shortly.');
            fetchJobDetails();
            setTimeout(() => navigate(`/job/${jobId}`), 3000); // Redirect to job section
          } catch (err) {
            toast.error('Payment verification failed. Contact support.');
          } finally {
            setIsPaying(false);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phoneNumber || "9999999999"
        },
        theme: {
          color: "#7c3aed"
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initialize escrow payment.');
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={40} className="animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium text-sm">Generating real-time invoice and contract details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <p className="text-slate-500 font-medium">Job contract details could not be found.</p>
        <button onClick={() => navigate('/dashboard')} className="px-5 py-2 bg-blue-600 text-white rounded-xl">Back to Workspace</button>
      </div>
    );
  }

  const bidAmount = job.acceptedPrice || job.budget;
  const platformFee = Math.round(bidAmount * 0.05);
  const totalAmount = bidAmount + platformFee;
  const clientName = job.client?.name || 'Client';
  const clientCompany = job.client?.companyName || 'Freelance Client';
  const freelancerName = job.selectedFreelancer?.name || 'Freelancer';
  const category = job.category || 'Web Design';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      
      {/* Confirm Action Popup */}
      <TermsModal 
        isOpen={showConfirmModal}
        onConfirm={handlePayEscrow}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="text-right">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            Secure Escrow Transaction
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Client & Freelancer Profiles + Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Briefcase className="text-blue-600" size={24} /> Contract Details
            </h2>

            {/* Job Title / Meta */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                    {category}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 mt-2">{job.title}</h3>
                </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed mt-1 line-clamp-3">
                {job.description}
              </p>
            </div>

            {/* Double profile cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Client Profile */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={clientName} src={job.client?.profilePicture} size={40} className="border-blue-100 text-blue-600" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 truncate">{clientName}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">{clientCompany}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>💼 Role: Contract Client</p>
                </div>
              </div>

              {/* Freelancer Profile */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={freelancerName} src={job.selectedFreelancer?.profilePicture} size={40} className="border-slate-100 text-slate-600" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 truncate">{freelancerName}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Verified Freelancer</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-1"><Star size={14} className="text-amber-500 fill-amber-500" /> Rating:</span>
                    <span className="font-semibold text-slate-700">{job.selectedFreelancer?.rating || '4.8'}/5.0</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Escrow Mechanism Explainer Card */}
            <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/30 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-800">Secure WorkSphere Escrow Protected</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your funds are held securely in a dynamic vault. They will be released directly to the freelancer only after you verify and approve the final work deliverables.
                </p>
              </div>
            </div>

            {/* Step Timeline tracker */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-800">Contract Lifecycle progress</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/30 text-center">
                  <div className="text-xs font-bold text-blue-700">1. Hired Contract</div>
                  <div className="text-[10px] text-blue-500 mt-0.5">Agreement Confirmed</div>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${job.paymentStatus !== 'pending' ? 'border-blue-200 bg-blue-50/30 text-blue-700' : 'border-slate-200 text-slate-400'}`}>
                  <div className={`text-xs font-bold ${job.paymentStatus !== 'pending' ? 'text-blue-700' : ''}`}>2. Fund Escrow</div>
                  <div className="text-[10px] mt-0.5">{job.paymentStatus !== 'pending' ? 'Completed & Held' : 'Awaiting Payment'}</div>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${job.status === 'completed' ? 'border-blue-200 bg-blue-50/30 text-blue-700' : 'border-slate-200 text-slate-400'}`}>
                  <div className={`text-xs font-bold ${job.status === 'completed' ? 'text-blue-700' : ''}`}>3. Project Payout</div>
                  <div className="text-[10px] mt-0.5">{job.status === 'completed' ? 'Funds Released' : 'Held until approval'}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Small printed thermal-style receipt */}
        <div className="lg:col-span-5 flex flex-col items-center">
          
          {/* Thermal Receipt Container */}
          <div className="w-full max-w-sm bg-white border border-slate-200/80 shadow-2xl relative p-6 pt-8 pb-10 flex flex-col gap-4 font-mono text-slate-800 rounded-lg">
            
            {/* Top Tear simulation effect */}
            <div className="absolute top-0 inset-x-0 h-3 flex overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-4 h-4 bg-slate-50 border-b border-slate-200 transform rotate-45 -translate-y-2 flex-shrink-0" />
              ))}
            </div>

            {/* Receipt Content Header */}
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <img src="/logo.png" alt="WorkSphere Logo" className="h-8 w-auto grayscale" />
                <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">WorkSphere</h1>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Secure Escrow Receipt</p>
              <p className="text-[9px] text-slate-400">Mangalore, MAQ - India</p>
            </div>

            {/* Dashed Separator */}
            <div className="border-t border-dashed border-slate-300 w-full my-1"></div>

            {/* Transaction metadata */}
            <div className="text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>RECEIPT ID:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[180px]">{`WS-${jobId.substring(0, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span className="font-semibold text-slate-900">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>CATEGORY:</span>
                <span className="font-semibold text-slate-900 uppercase">{category}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CLIENT:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[150px]">{clientName.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>TALENT:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[150px]">{freelancerName.toUpperCase()}</span>
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="border-t border-dashed border-slate-300 w-full my-1"></div>

            {/* Itemized pricing section */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>ITEM DESCRIPTION</span>
                <span>PRICE</span>
              </div>
              
              <div className="flex justify-between text-slate-600">
                <span className="text-left max-w-[180px] truncate uppercase">
                  {job.isRehire ? `MAINTENANCE: ${job.title}` : job.title}
                </span>
                <span>₹{bidAmount.toLocaleString('en-IN')}.00</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>PLATFORM FEE (5.0%)</span>
                <span>₹{platformFee.toLocaleString('en-IN')}.00</span>
              </div>
            </div>

            {/* Dashed Separator */}
            <div className="border-t border-dashed border-slate-300 w-full my-1"></div>

            {/* Total Billing */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm font-black text-slate-900">
                <span>GRAND TOTAL:</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}.00</span>
              </div>
              <p className="text-[8px] text-slate-400 text-right uppercase tracking-wider">Prices include 5% platform facilitation fee</p>
            </div>

            {/* Dashed Separator */}
            <div className="border-t border-dashed border-slate-300 w-full my-1"></div>

            {/* Barcode representation */}
            <div className="flex flex-col items-center gap-1.5 my-2">
              <div className="h-10 w-full bg-slate-950 flex items-center justify-between px-2 py-1 select-none overflow-hidden">
                {Array.from({ length: 48 }).map((_, i) => {
                  const widths = [1, 2, 3, 4];
                  const width = widths[Math.floor(Math.random() * widths.length)];
                  const bg = Math.random() > 0.4 ? 'bg-white' : 'bg-transparent';
                  return <div key={i} className={`h-full ${bg} flex-grow`} style={{ minWidth: `${width}px` }} />;
                })}
              </div>
              <span className="text-[9px] tracking-[6px] text-slate-400 select-none">{jobId.substring(0, 12).toUpperCase()}</span>
            </div>

            {/* Stamp indicator watermarked */}
            <div className="flex justify-center my-1">
              {job.paymentStatus === 'pending' ? (
                <div className="border-2 border-dashed border-blue-500 text-blue-500 font-extrabold text-sm px-6 py-1.5 rotate-[-4deg] rounded tracking-widest uppercase">
                  UNPAID / ESCROW PENDING
                </div>
              ) : (
                <div className="border-2 border-dashed border-blue-600 text-blue-600 font-extrabold text-sm px-6 py-1.5 rotate-[-4deg] rounded tracking-widest uppercase flex items-center gap-1 animate-pulse">
                  <CheckCircle2 size={16} /> PAID & ESCROWED
                </div>
              )}
            </div>

            <p className="text-[9px] text-center text-slate-400 leading-normal mt-2">
              Thank you for trusting WorkSphere Escrow. Retain this digital thermal receipt for billing verification purposes.
            </p>

            {/* Bottom Tear simulation effect */}
            <div className="absolute bottom-0 inset-x-0 h-3 flex overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-4 h-4 bg-slate-50 border-t border-slate-200 transform rotate-45 translate-y-2 flex-shrink-0" />
              ))}
            </div>

          </div>

          {/* Action Button for Payment */}
          {job.paymentStatus === 'pending' && user?.role === 'client' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePaymentInitiation}
              disabled={isPaying}
              className="mt-6 w-full max-w-sm py-4 bg-gradient-to-r from-blue-600 to-slate-600 hover:from-blue-700 hover:to-slate-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {isPaying ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard size={20} /> Secure Pay Escrow (₹{totalAmount.toLocaleString('en-IN')})
                </>
              )}
            </motion.button>
          )}

          {job.paymentStatus !== 'pending' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-center text-xs font-semibold max-w-sm">
              🚀 Escrow funds are secured! The freelancer can now proceed to deliver the project work.
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
