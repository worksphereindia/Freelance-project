import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, User as UserIcon, Send, MessageSquare, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function ContactUs() {
  const { user, openAuth } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuth('login');
      return;
    }
    
    if (!subject || !message) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(import.meta.env.VITE_API_URL + '/api/contact', {
        subject,
        message
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Message sent successfully! We will get back to you soon.');
      setSubject('');
      setMessage('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative py-24 bg-white overflow-hidden" id="contact">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold">
              <Mail size={16} />
              <span>Get in Touch</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Have a question? <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Let's talk.</span>
            </h2>
            
            <p className="text-lg text-slate-600 font-medium max-w-md">
              Whether you're facing an issue with escrow, need help with a job posting, or just want to share feedback, our support team is here for you.
            </p>

            <div className="space-y-6 pt-4">
              <a href="mailto:support@WorkSphere.com" className="flex items-start gap-4 group cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-600 shadow-sm group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all">
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1 group-hover:text-blue-600 transition-colors">Email Us</h4>
                  <p className="text-slate-600 font-medium">support@WorkSphere.com</p>
                </div>
              </a>
              <div onClick={() => { if (!user) openAuth('login'); else navigate('/chat'); }} className="flex items-start gap-4 group cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-600 shadow-sm group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1 group-hover:text-blue-600 transition-colors">Live Chat</h4>
                  <p className="text-slate-600 font-medium">Available for verified users in dashboard</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2.5rem] transform rotate-3 scale-105 opacity-10 blur-xl"></div>
            
            <div className="bg-white border-2 border-slate-100 p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 relative z-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <UserIcon size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={user?.name || ''}
                        readOnly
                        placeholder={user ? "" : "Login required"}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-500 font-medium cursor-not-allowed focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Mail size={18} />
                      </div>
                      <input 
                        type="email" 
                        value={user?.email || ''}
                        readOnly
                        placeholder={user ? "" : "Login required"}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-500 font-medium cursor-not-allowed focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={!user}
                    placeholder="How can we help?"
                    className="w-full px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={!user}
                    placeholder="Provide as much detail as possible..."
                    rows={4}
                    className="w-full px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800 resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                    !user 
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40'
                  } disabled:opacity-70 disabled:cursor-not-allowed`}
                >
                  {!user ? (
                    <>
                      <Lock size={18} />
                      Login to Send Message
                    </>
                  ) : isSubmitting ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send size={18} />
                      Send Message
                    </>
                  )}
                </button>
                
                {!user && (
                  <p className="text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5 mt-4">
                    <Lock size={12} />
                    You must be logged in to verify your identity.
                  </p>
                )}
              </form>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
