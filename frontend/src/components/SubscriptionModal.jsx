import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SubscriptionModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleSubscribe = (plan) => {
    onClose();
    navigate(`/checkout/subscription?plan=${plan}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-50 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Upgrade Your Workspace</h2>
            <p className="text-sm text-slate-500">Select a plan to unlock bidding power and more features.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Plan */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 relative overflow-hidden flex flex-col shadow-sm">
              <div className="flex-1 relative z-10">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Basic Plan</h3>
                <div className="text-3xl font-black text-blue-600 mb-6">₹50<span className="text-sm font-normal text-slate-500">/month</span></div>
                
                <ul className="space-y-3 mb-6 text-sm">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-slate-600 font-medium"><span className="text-slate-900 font-bold">3 Bids</span> per month</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-slate-600 font-medium">Standard Profile Customization</span>
                  </li>
                </ul>
              </div>
              
              <div className="mt-auto relative z-10">
                <button 
                  onClick={() => handleSubscribe('basic')}
                  disabled={user?.subscriptionPlan === 'basic'}
                  className={`w-full py-4 rounded-xl font-bold text-sm transition-all border ${
                    user?.subscriptionPlan === 'basic' 
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {user?.subscriptionPlan === 'basic' ? 'Current Plan' : 'Subscribe to Basic'}
                </button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-2xl p-6 border-2 border-purple-500 relative overflow-hidden flex flex-col shadow-lg shadow-purple-500/10">
              {user?.subscriptionPlan === 'advanced' && (
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  Active
                </div>
              )}
              
              <div className="flex-1 relative z-10">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Pro Plan</h3>
                <div className="text-3xl font-black text-purple-600 mb-6">₹150<span className="text-sm font-normal text-slate-500">/month</span></div>
                
                <ul className="space-y-3 mb-6 text-sm">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-purple-600 mt-0.5 shrink-0" />
                    <span className="text-slate-600 font-medium"><span className="text-slate-900 font-bold">Unlimited</span> Bids</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-purple-600 mt-0.5 shrink-0" />
                    <span className="text-slate-600 font-medium">Premium Profile Customization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-purple-600 mt-0.5 shrink-0" />
                    <span className="text-slate-600 font-medium"><span className="text-slate-900 font-bold">Priority Live Support</span> & Dispute Resolution</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-purple-600 mt-0.5 shrink-0" />
                    <span className="text-slate-600 font-medium"><span className="text-slate-900 font-bold">Magic AI</span> Proposal Generator</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-purple-600 mt-0.5 shrink-0" />
                    <span className="text-slate-600 font-medium"><span className="text-slate-900 font-bold">Verified Pro Badge</span> & Boosted Search</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-purple-600 mt-0.5 shrink-0" />
                    <span className="text-slate-600 font-medium"><span className="text-slate-900 font-bold">Early Access</span> to Premium Jobs</span>
                  </li>
                </ul>
              </div>
              
              <div className="mt-auto relative z-10">
                <button 
                  onClick={() => handleSubscribe('advanced')}
                  disabled={user?.subscriptionPlan === 'advanced'}
                  className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
                    user?.subscriptionPlan === 'advanced' 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200' 
                      : 'bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]'
                  }`}
                >
                  {user?.subscriptionPlan === 'advanced' ? 'Current Plan' : 'Subscribe to Pro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
