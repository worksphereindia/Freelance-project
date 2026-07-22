import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, Image as ImageIcon, MapPin, AlertTriangle } from 'lucide-react';
import Avatar from '../components/Avatar';
import SkillsInput from '../components/SkillsInput';

export default function EditProfile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    phoneNumber: '',
    skills: '',
    portfolioUrl: '',
    experience: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(import.meta.env.VITE_API_URL + '/api/auth/me');
        const data = res.data;
        setFormData({
          name: data.name || '',
          email: data.email || '',
          companyName: data.companyName || '',
          phoneNumber: data.phoneNumber || '',
          skills: data.skills ? data.skills.join(', ') : '',
          portfolioUrl: data.portfolio && data.portfolio.length > 0 ? data.portfolio[0] : '',
          experience: data.experience || '',
          location: data.location || ''
        });
        setPreviewUrl(data.profilePicture || '');
        setCoverPreviewUrl(data.coverImage || '');
      } catch (err) {
        toast.error('Failed to load profile data');
      }
    };
    if (user) fetchProfile();
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setProfilePictureFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setCoverImageFile(file);
      setCoverPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = sessionStorage.getItem('token');
      let updatedUser = user;

      // Handle profile picture upload if a new file is selected
      if (profilePictureFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('profilePicture', profilePictureFile);
        const uploadRes = await axios.post(import.meta.env.VITE_API_URL + '/api/users/profile-picture', formDataUpload, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}` 
          }
        });
        updatedUser = uploadRes.data.user;
      }

      if (coverImageFile) {
        const formCoverUpload = new FormData();
        formCoverUpload.append('coverImage', coverImageFile);
        const uploadRes = await axios.post(import.meta.env.VITE_API_URL + '/api/users/cover-image', formCoverUpload, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}` 
          }
        });
        updatedUser = uploadRes.data.user;
      }

      const resUpdate = await axios.put(import.meta.env.VITE_API_URL + '/api/auth/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update context with the latest user data including new token if issued, else use current token
      const tokenToUse = resUpdate.data.token || sessionStorage.getItem('token');
      login(tokenToUse, { ...resUpdate.data, profilePicture: updatedUser?.profilePicture, coverImage: updatedUser?.coverImage });
      
      toast.success('Profile updated successfully!');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error('Update Profile Error:', err, err.response);
      toast.error(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Edit Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Profile Picture Upload Section */}
          <div className="flex flex-col items-center justify-center mb-6 relative">
            <div className="relative group cursor-pointer">
              <Avatar src={previewUrl || user?.profilePicture} name={user?.name || "User"} size={100} />
              
              <label className="absolute inset-0 bg-slate-900/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white" size={24} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-3">Click to update photo</p>
          </div>

          {/* Cover Image Upload (Pro Only) */}
          {user?.role === 'freelancer' && user?.subscriptionPlan === 'pro' && (
            <div className="flex flex-col items-center mb-8 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="block text-sm font-bold text-slate-700 mb-2 w-full text-left">Cover Image (Pro)</label>
              <div className="relative w-full h-32 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300">
                {coverPreviewUrl ? (
                  <img src={coverPreviewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <ImageIcon size={32} />
                    <span className="text-xs font-semibold mt-1">Upload Banner</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleCoverChange}
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed"
              value={formData.name}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email <span className="text-red-500">*</span></label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed"
              value={formData.email}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
            <input 
              type="tel" 
              className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
            />
          </div>
          
          {user?.role === 'client' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              />
            </div>
          )}

          {user?.role === 'freelancer' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Skills (press Enter to add)</label>
                <SkillsInput 
                  skills={formData.skills} 
                  onChange={(newSkills) => setFormData({...formData, skills: newSkills})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Portfolio URL</label>
                <input 
                  type="url" 
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({...formData, portfolioUrl: e.target.value})}
                />
                <div className="mt-2 flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <p><strong>Warning:</strong> Using your portfolio to share direct contact details or request off-platform payments will result in an immediate and permanent account ban.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Experience (Years)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between items-center">
                  <span>Location</span>
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
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </>
          )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
