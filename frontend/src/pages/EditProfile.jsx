import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera } from 'lucide-react';
import Avatar from '../components/Avatar';

export default function EditProfile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    phoneNumber: '',
    skills: '',
    portfolioUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

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
          portfolioUrl: data.portfolioUrl || ''
        });
        setPreviewUrl(data.profilePicture || '');
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

      const resUpdate = await axios.put(import.meta.env.VITE_API_URL + '/api/auth/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update context with the latest user data including new token if issued, else use current token
      const tokenToUse = resUpdate.data.token || sessionStorage.getItem('token');
      login(tokenToUse, { ...resUpdate.data, profilePicture: updatedUser?.profilePicture });
      
      toast.success('Profile updated successfully!');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed"
              value={formData.name}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed"
              value={formData.email}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Skills (comma separated)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.skills}
                  onChange={(e) => setFormData({...formData, skills: e.target.value})}
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
