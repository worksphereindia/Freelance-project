import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helper to decode JWT and extract user data
const decodeToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      role: payload.role,
      isProfileComplete: payload.isProfileComplete,
      name: payload.name,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      profilePicture: payload.profilePicture,
    };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  
  // Auth Modal State
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const openAuth = (type = 'login') => setAuthModal(type);
  const closeAuth = () => setAuthModal(null);

  const fetchUser = async (authToken) => {
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`);
      setUser({ ...res.data, token: authToken });
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser(token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const refreshUser = () => {
    if (token) fetchUser(token);
  };

  const login = (newToken, userData) => {
    sessionStorage.setItem('token', newToken);
    // Ensure any leftover localStorage tokens from before the fix are cleared
    localStorage.removeItem('token');
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    
    // Set loading to true so ProtectedRoute shows a spinner
    // instead of crashing on an incomplete user object or redirecting prematurely.
    setLoading(true);
    setToken(newToken);
    // useEffect will now trigger and call fetchUser(newToken)
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authModal, openAuth, closeAuth, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
