import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader2, MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import SkillsInput from '../components/SkillsInput';

export default function CompleteProfile() {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    companyName: '',
    skills: [],
    portfolioUrl: '',
    experience: '',
    upiId: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // Pre-fill phone number if available
  useEffect(() => {
    if (user?.phoneNumber && !formData.phoneNumber) {
      setFormData(prev => ({ ...prev, phoneNumber: user.phoneNumber }));
    }
  }, [user]);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        const city = res.data.city || res.data.locality || '';
        const country = res.data.countryName || '';
        const locString = [city, country].filter(Boolean).join(', ');
        
        if (locString) {
          setFormData(prev => ({ ...prev, location: locString }));
          toast.success('Location detected successfully!');
        } else {
          toast.error('Could not determine exact city');
        }
      } catch (err) {
        toast.error('Failed to fetch location data');
      } finally {
        setFetchingLocation(false);
      }
    }, () => {
      toast.error('Permission denied. Please allow location access.');
      setFetchingLocation(false);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Strict validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phoneNumber.trim())) {
      toast.error('Please enter exactly 10 digits for the phone number (no spaces or country code).');
      return;
    }

    if (user?.role === 'client') {
      if (!formData.companyName.trim()) {
        toast.error('Please enter your company name.');
        return;
      }
    } else {
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(formData.upiId.trim())) {
        toast.error('Please enter a valid UPI ID (e.g., yourname@okicici or yourname@ybl).');
        return;
      }

      if (!formData.skills || formData.skills.length === 0) {
        toast.error('Please enter at least one skill.');
        return;
      }

      if (!formData.portfolioUrl.trim()) {
        toast.error('Please enter your portfolio or GitHub URL.');
        return;
      }
      
      
      if (!formData.experience.trim()) {
        toast.error('Please enter your years of professional experience.');
        return;
      }
      
      if (!formData.location.trim()) {
        toast.error('Please enter or detect your location.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = { ...formData, companyName: formData.companyName };

      const res = await axios.put(
        import.meta.env.VITE_API_URL + '/api/auth/complete-profile',
        payload
        // axios already has the auth header set globally from AuthContext
      );

      // login() will decode the new token which now has isProfileComplete: true
      login(res.data.token, res.data);

      // Force full reload to avoid any React Router state race condition with AuthContext
      toast.success('Profile completed successfully!');
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('CompleteProfile error:', err);
      toast.error(err.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-xl border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🚀</div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Almost there!</h2>
          <p className="text-slate-500 text-sm">Complete your {user?.role} profile to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="10 digits e.g. 9876543210"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
            
            {user?.role === 'client' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Your Company Name"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
            )}
            
            {user?.role !== 'client' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Portfolio URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="https://github.com/yourname"
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  />
                  <div className="mt-2 flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p><strong>Warning:</strong> Using your portfolio to share direct contact details or request off-platform payments will result in an immediate and permanent account ban.</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between items-center">
                    <span>Location <span className="text-red-500">*</span></span>
                    <button 
                      type="button" 
                      onClick={fetchLocation} 
                      disabled={fetchingLocation}
                      className="text-xs text-blue-600 font-bold hover:underline disabled:text-slate-400 flex items-center gap-1"
                    >
                      {fetchingLocation ? 'Detecting...' : <>Auto-Detect <MapPin size={14} /></>}
                    </button>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="e.g. Bangalore, India"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          {user?.role !== 'client' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Skills <span className="text-red-500">*</span>
                </label>
                <SkillsInput
                  skills={formData.skills}
                  onChange={(newSkills) => setFormData({ ...formData, skills: newSkills })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Professional Experience <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Years of experience (e.g. 3)"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  UPI ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="yourname@okicici"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-1">🔒 Encrypted with AES-256 before storage</p>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Go to Dashboard →'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
