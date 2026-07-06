import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function SubscriptionCheckout() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const queryParams = new URLSearchParams(search);
  const plan = queryParams.get('plan'); // 'basic' or 'advanced'

  useEffect(() => {
    if (!plan || !['basic', 'advanced'].includes(plan)) {
      navigate('/dashboard');
    }
  }, [plan, navigate]);

  const basePrice = plan === 'advanced' ? 150 : 50;
  const tax = basePrice * 0.02; // 2% GST
  const total = basePrice + tax;

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/users/subscribe`, { plan }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { isMock, order, amount } = res.data;

      if (isMock) {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/users/verify-subscription`, {
          razorpay_order_id: order.id,
          plan
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(`Successfully subscribed to ${plan === 'advanced' ? 'Pro' : 'Basic'} plan! (Mock)`);
        refreshUser();
        navigate('/dashboard');
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'mock',
        amount: order.amount,
        currency: "INR",
        name: "WorkSphere",
        description: `${plan === 'advanced' ? 'PRO' : 'BASIC'} Plan Subscription`,
        order_id: order.id,
        handler: async function (response) {
          try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/users/verify-subscription`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Successfully subscribed to ${plan === 'advanced' ? 'Pro' : 'Basic'} plan!`);
            refreshUser();
            navigate('/dashboard');
          } catch (verifyErr) {
            toast.error(verifyErr.response?.data?.message || "Payment verification failed.");
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phoneNumber || ""
        },
        theme: {
          color: "#2563eb"
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(response.error.description || "Payment failed");
        setIsProcessing(false);
      });
      rzp.open();

    } catch (err) {
      toast.error(err.response?.data?.message || "Checkout initialization failed.");
      setIsProcessing(false);
    }
  };

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center font-sans">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Receipt Details */}
        <div className="flex-1 p-8 md:p-12 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-center">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-sm font-semibold text-slate-500 hover:text-blue-600 mb-8 transition-colors w-max"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </button>
          
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Checkout</h1>
          <p className="text-slate-500 font-medium mb-8">Review your subscription plan before payment.</p>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Plan Selected</p>
                <p className="text-lg font-bold text-slate-800 capitalize">{plan} Plan</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount</p>
                <p className="text-lg font-bold text-slate-800">₹{basePrice.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm font-medium text-slate-600 pt-2">
              <span>Subtotal</span>
              <span>₹{basePrice.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm font-medium text-slate-600">
              <span>GST (2%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-end">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Due</span>
            <span className="text-4xl font-black text-blue-600 tracking-tight">₹{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Right Side: Features & Pay Button */}
        <div className="w-full md:w-80 bg-slate-900 text-white p-8 md:p-10 flex flex-col">
          <h3 className="text-xl font-bold mb-6 text-white/90">What you get</h3>
          <ul className="space-y-4 mb-auto">
            {plan === 'advanced' ? (
              <>
                <li className="flex items-start"><CheckCircle2 size={20} className="text-blue-400 mr-3 shrink-0" /><span className="text-sm font-medium text-slate-300">Unlimited Bids</span></li>
                <li className="flex items-start"><CheckCircle2 size={20} className="text-blue-400 mr-3 shrink-0" /><span className="text-sm font-medium text-slate-300">Priority Support</span></li>
                <li className="flex items-start"><CheckCircle2 size={20} className="text-blue-400 mr-3 shrink-0" /><span className="text-sm font-medium text-slate-300">Featured Profile Badge</span></li>
                <li className="flex items-start"><CheckCircle2 size={20} className="text-blue-400 mr-3 shrink-0" /><span className="text-sm font-medium text-slate-300">Access to Premium Jobs</span></li>
              </>
            ) : (
              <>
                <li className="flex items-start"><CheckCircle2 size={20} className="text-blue-400 mr-3 shrink-0" /><span className="text-sm font-medium text-slate-300">3 Bids per Month</span></li>
                <li className="flex items-start"><CheckCircle2 size={20} className="text-blue-400 mr-3 shrink-0" /><span className="text-sm font-medium text-slate-300">Standard Support</span></li>
                <li className="flex items-start"><CheckCircle2 size={20} className="text-slate-600 mr-3 shrink-0" /><span className="text-sm font-medium text-slate-500 line-through">Featured Profile Badge</span></li>
              </>
            )}
          </ul>
          
          <div className="mt-8 pt-8 border-t border-slate-700/50">
            <button 
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isProcessing ? <><Loader2 className="animate-spin mr-2" size={20} /> Processing...</> : 'Confirm & Pay'}
            </button>
            <p className="text-center text-xs font-medium text-slate-500 mt-4 flex items-center justify-center">
              <ShieldCheck size={14} className="mr-1" /> Secure checkout by Razorpay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
