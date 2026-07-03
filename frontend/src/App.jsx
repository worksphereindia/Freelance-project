import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, ShieldCheck, ChevronDown, Menu, X, Home as HomeIcon, Info, Briefcase, MessageSquare } from 'lucide-react';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import Loading from './components/Loading';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider, useAuth } from './context/AuthContext';
import Avatar from './components/Avatar';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import ContactUs from './components/ContactUs';
import Breadcrumbs from './components/Breadcrumbs';
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const VerifyOtp = lazy(() => import('./pages/VerifyOtp'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const JobDetails = lazy(() => import('./pages/JobDetails'));
const NotFound = lazy(() => import('./pages/NotFound'));

function AppNav() {
  const { user, logout, openAuth } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <>
      <nav className="w-full bg-white/80 backdrop-blur-md shadow-sm fixed top-0 left-0 z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 cursor-pointer">
                <img src="/logo.png" alt="WorkOwn Logo" className="h-8 w-auto" />
                <span className="text-2xl font-extrabold text-blue-600 tracking-tight">WorkOwn</span>
              </motion.div>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
              <Link to="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
              {user && <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Jobs</Link>}
              {user && <Link to="/chat" className="hover:text-blue-600 transition-colors">Messages</Link>}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {!user ? (
              <button onClick={() => openAuth('login')} className="text-sm font-semibold px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
                Sign In <span className="hidden md:inline">/ Join</span>
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Avatar name={user.name} src={user.profilePicture} size={32} />
                  <ChevronDown size={16} className="text-slate-400" />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                      </div>
                      
                      <div className="p-2 space-y-1">
                        <Link to="/edit-profile" onClick={() => setDropdownOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                          <Settings size={16} /> Edit Profile
                        </Link>
                        
                        {user.role === 'admin' && (
                          <Link to="/admin" onClick={() => setDropdownOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                            <ShieldCheck size={16} /> Admin Panel
                          </Link>
                        )}
                        
                        <div className="h-px bg-slate-100 my-1"></div>
                        
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button 
              className="md:hidden p-2 -mr-2 text-slate-600 hover:bg-slate-100 hover:text-blue-600 rounded-full transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-900/30 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed inset-y-0 right-0 w-[85%] max-w-sm z-[100] md:hidden bg-white shadow-2xl flex flex-col border-l border-slate-100"
          >
            {/* Header inside overlay */}
            <div className="flex justify-between items-center px-6 h-20 border-b border-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="WorkOwn Logo" className="h-8 w-auto" />
                <span className="text-xl font-extrabold text-blue-600 tracking-tight">WorkOwn</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Menu Links */}
            <div className="flex-1 overflow-y-auto py-6 px-6 space-y-6">
              
              {user && (
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                  <Avatar name={user.name} src={user.profilePicture} size={48} />
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 capitalize truncate">{user.role}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Link to="/" className="flex items-center gap-4 p-4 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-bold transition-all" onClick={() => setMobileMenuOpen(false)}>
                  <HomeIcon size={22} className="text-slate-400" /> Home
                </Link>
                
                <Link to="/about" className="flex items-center gap-4 p-4 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-bold transition-all" onClick={() => setMobileMenuOpen(false)}>
                  <Info size={22} className="text-slate-400" /> About Us
                </Link>
                
                {user && (
                  <>
                    <Link to="/dashboard" className="flex items-center gap-4 p-4 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-bold transition-all" onClick={() => setMobileMenuOpen(false)}>
                      <Briefcase size={22} className="text-slate-400" /> Jobs
                    </Link>
                    
                    <Link to="/chat" className="flex items-center gap-4 p-4 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-bold transition-all" onClick={() => setMobileMenuOpen(false)}>
                      <MessageSquare size={22} className="text-slate-400" /> Messages
                    </Link>
                    
                    <div className="h-px bg-slate-100 my-4"></div>
                    
                    <Link to="/edit-profile" className="flex items-center gap-4 p-4 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-bold transition-all" onClick={() => setMobileMenuOpen(false)}>
                      <Settings size={22} className="text-slate-400" /> Edit Profile
                    </Link>

                    {user.role === 'admin' && (
                      <Link to="/admin" className="flex items-center gap-4 p-4 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-bold transition-all" onClick={() => setMobileMenuOpen(false)}>
                        <ShieldCheck size={22} className="text-slate-400" /> Admin Panel
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
              {!user ? (
                <button onClick={() => { setMobileMenuOpen(false); openAuth('login'); }} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2">
                  <User size={18} /> Sign In / Join
                </button>
              ) : (
                <button onClick={handleLogout} className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2">
                  <LogOut size={18} /> Sign Out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Protected Route Wrapper
function ProtectedRoute({ children, requireCompleteProfile = true }) {
  const { user, loading, openAuth } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !user) {
      openAuth('login');
      navigate('/', { replace: true });
    }
  }, [user, loading, openAuth, navigate]);

  if (loading) return <Loading />;
  
  if (!user) {
    return null;
  }

  // If user hasn't completed their profile, redirect to complete-profile
  if (requireCompleteProfile && !user.isProfileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function LoginRedirect() {
  const { openAuth } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    openAuth('login');
    navigate('/', { replace: true });
  }, [openAuth, navigate]);
  return null;
}

function AppRoutes() {
  return (
    <main className="w-full">
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          
          {/* Semi-Protected (Requires auth, but not completed profile) */}
          <Route 
            path="/complete-profile" 
            element={<ProtectedRoute requireCompleteProfile={false}><CompleteProfile /></ProtectedRoute>} 
          />
          <Route 
            path="/edit-profile" 
            element={<ProtectedRoute requireCompleteProfile={false}><EditProfile /></ProtectedRoute>} 
          />
          
          {/* Fully Protected Routes */}
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><div className="max-w-7xl mx-auto px-4 py-8"><Dashboard /></div></ProtectedRoute>} 
          />
          <Route 
            path="/chat" 
            element={<ProtectedRoute><div className="max-w-7xl mx-auto px-4 py-8"><Chat /></div></ProtectedRoute>} 
          />
          <Route 
            path="/payment/:jobId" 
            element={<ProtectedRoute><div className="max-w-7xl mx-auto px-4 py-8"><PaymentPage /></div></ProtectedRoute>} 
          />
          <Route 
            path="/job/:id" 
            element={<ProtectedRoute><JobDetails /></ProtectedRoute>} 
          />

          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={<AdminRoute><AdminPanel /></AdminRoute>} 
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </main>
  );
}



function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <AppNav />
      <AuthModal />
      <div className={`pt-16 flex flex-col min-h-screen ${isAdmin ? 'h-[calc(100vh-64px)] overflow-hidden' : ''}`}>
        {!isAdmin && <Breadcrumbs />}
        <AppRoutes />
        {!isAdmin && <ContactUs />}
        {!isAdmin && <Footer />}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              fontSize: '16px',
              padding: '16px 24px',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
              maxWidth: '500px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        >
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <div className="relative flex items-center w-full min-w-[280px]">
                  <div className="mr-3">{icon}</div>
                  <div className="flex-1 text-sm font-bold mr-4 text-slate-800">{message}</div>
                  {t.type !== 'loading' && (
                    <button 
                      onClick={() => toast.dismiss(t.id)} 
                      className="text-slate-400 hover:text-slate-700 font-extrabold focus:outline-none p-1.5 hover:bg-slate-100 rounded-lg transition-colors ml-auto cursor-pointer"
                      style={{ background: 'none', border: 'none' }}
                      title="Close"
                    >
                      ✕
                    </button>
                  )}
                  {t.type !== 'loading' && (
                    <div className="absolute bottom-[-16px] left-[-24px] right-[-24px] h-[4px] overflow-hidden rounded-b-xl opacity-50">
                      <div 
                        className={`h-full ${t.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'} toast-progress-bar`}
                        style={{ animationDuration: `${t.duration || 5000}ms` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </ToastBar>
          )}
        </Toaster>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
