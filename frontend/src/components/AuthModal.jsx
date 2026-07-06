import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { signInWithGoogle } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthModal() {
  const { authModal, closeAuth, login } = useAuth();
  const navigate = useNavigate();
  
  const validatePassword = (pwd) => {
    if (pwd.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one special character.";
    return null;
  };

  const [isLogin, setIsLogin] = useState(true);
  
  // Forgot Password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState('email'); // 'email' or 'reset'
  const [resetEmail, setResetEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const otpRefs = useRef([]);

  useEffect(() => {
    if (authModal) {
      document.body.style.overflow = 'hidden';
      setIsLogin(authModal === 'login');
      setIsForgotPassword(false);
      setForgotPasswordStep('email');
      setResetEmail('');
      setOtpDigits(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [authModal]);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState(localStorage.getItem('rememberedEmail') || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [error, setError] = useState('');
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  
  // Validation Errors
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);

  // For Google Role Selection
  const [requiresRole, setRequiresRole] = useState(false);
  const [googleData, setGoogleData] = useState(null);
  const [selectedRole, setSelectedRole] = useState('client');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;
    
    const newDigits = [...otpDigits];
    // Take only the last character entered
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    
    // Auto focus next box if we entered a digit
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // If current box is empty, delete previous digit and focus it
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpRefs.current[index - 1]?.focus();
      } else if (otpDigits[index]) {
        // If current box has a value, clear it
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    if (!isLogin) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        setEmailError('Please enter a valid email address.');
      } else {
        setEmailError('');
      }
    } else {
      setEmailError('');
    }
  };

  const handlePhoneChange = (val) => {
    setPhoneNumber(val);
    if (!isLogin) {
      // Indian mobile numbers must start with 6, 7, 8, or 9 and be exactly 10 digits
      const phoneRegex = /^[6-9]\d{9}$/;
      if (val.length > 0 && !/^\d+$/.test(val)) {
        setPhoneError('Phone number can only contain digits.');
      } else if (!phoneRegex.test(val)) {
        setPhoneError('Must be a valid 10-digit Indian number starting with 6-9.');
      } else {
        setPhoneError('');
      }
    }
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (!isLogin) {
      setPasswordError(validatePassword(val) || '');
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pasteData)) return; // Only paste 6 digit numeric code
    
    const newDigits = pasteData.split('');
    setOtpDigits(newDigits);
    otpRefs.current[5]?.focus();
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (forgotPasswordStep === 'email') {
        const res = await axios.post(import.meta.env.VITE_API_URL + '/api/auth/forgot-password', { email: resetEmail });
        toast.success(res.data.message || 'OTP sent successfully!');
        setForgotPasswordStep('reset');
      } else {
        const fullOtp = otpDigits.join('');
        if (fullOtp.length !== 6) {
          toast.error('Please enter the full 6-digit OTP code');
          setIsSubmitting(false);
          return;
        }
        if (newPassword !== confirmNewPassword) {
          toast.error('Passwords do not match');
          setIsSubmitting(false);
          return;
        }
        if (newPassword.length < 6) {
          toast.error('Password must be at least 6 characters long');
          setIsSubmitting(false);
          return;
        }

        const pwdError = validatePassword(newPassword);
        if (pwdError) {
          toast.error(pwdError);
          setIsSubmitting(false);
          return;
        }

        const res = await axios.post(import.meta.env.VITE_API_URL + '/api/auth/reset-password', {
          email: resetEmail,
          otp: fullOtp,
          newPassword
        });
        toast.success(res.data.message || 'Password reset successfully!');
        setIsLogin(true);
        setIsForgotPassword(false);
        setForgotPasswordStep('email');
        setEmail(resetEmail);
        setPassword('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!isLogin) {
      if (emailError || phoneError || passwordError) {
        setError('Please fix the errors before submitting.');
        setIsSubmitting(false);
        return;
      }
      if (!acceptPolicies) {
        setError('You must accept the Privacy Policy and Cookie Consent.');
        setIsSubmitting(false);
        return;
      }
      const pwdError = validatePassword(password);
      if (pwdError) {
        setPasswordError(pwdError);
        setError('Please fix the password errors.');
        setIsSubmitting(false);
        return;
      }
    }
    setError('');
    
    try {
      if (isLogin) {
        const res = await axios.post(import.meta.env.VITE_API_URL + '/api/auth/login', { email, password });
        login(res.data.token, res.data);
        localStorage.removeItem('rememberedEmail');
        toast.success('Successfully logged in!');
        closeAuth();
      } else {
        await axios.post(import.meta.env.VITE_API_URL + '/api/auth/register', { name, email, password, role, phoneNumber });
        toast.success('Registration successful! Enter the OTP sent to your email.');
        closeAuth();
        navigate('/verify-otp', { state: { email } });
      }
    } catch (err) {
      if (err.message === 'Network Error') {
        toast.error('Unable to connect to server. Please try again.');
      } else if (err.response?.data?.requireVerification) {
        // Account exists but email not verified — send them to the OTP screen
        toast('Please verify your email to continue.', { icon: '📧' });
        closeAuth();
        navigate('/verify-otp', { state: { email: err.response.data.email || email } });
      } else {
        toast.error(err.response?.data?.message || (isLogin ? 'Login failed' : 'Registration failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setIsSubmitting(true);
    try {
      const user = await signInWithGoogle();
      const res = await axios.post(import.meta.env.VITE_API_URL + '/api/auth/google', { 
        name: user.displayName, 
        email: user.email,
        photoURL: user.photoURL
      });
      
      if (res.status === 202 && res.data.requiresRole) {
        setGoogleData({ name: res.data.name, email: res.data.email, photoURL: res.data.photoURL });
        setRequiresRole(true);
      } else {
        login(res.data.token, res.data);
        toast.success('Successfully logged in with Google!');
        closeAuth();
      }
    } catch (err) {
      console.error(err);
      if (err.message === 'Network Error') {
        toast.error('Unable to connect to server. Please try again.');
      } else {
        toast.error(err.response?.data?.message || err.message || 'Google Sign-In Failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRoleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL + '/api/auth/google/complete', {
        name: googleData.name,
        email: googleData.email,
        role: selectedRole,
        photoURL: googleData.photoURL
      });
      login(res.data.token, res.data);
      toast.success('Registration complete!');
      closeAuth();
    } catch (err) {
      if (err.message === 'Network Error') {
        toast.error('Unable to connect to server. Please try again.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to complete Google registration');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeAuth}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      ></motion.div>

      <div style={{ perspective: 1500 }} className="w-full max-w-md relative z-10 max-h-[90vh]">
        <AnimatePresence mode="wait">
          {requiresRole ? (
            <motion.div 
              key="role-selection"
              initial={{ opacity: 0, rotateX: 90 }}
              animate={{ opacity: 1, rotateX: 0 }}
              exit={{ opacity: 0, rotateX: -90 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
              className="relative backdrop-blur-xl bg-white/80 border border-white shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-8 rounded-3xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button onClick={closeAuth} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100/50 hover:bg-slate-200 p-2 rounded-full">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Complete Registration</h2>
              <p className="text-sm text-slate-500 text-center mb-6">Are you joining as a Client or a Freelancer?</p>
              
              <div className="space-y-4 mb-6">
                <label className={`block p-4 border rounded-xl cursor-pointer transition-all duration-300 ${selectedRole === 'client' ? 'border-blue-400 bg-blue-50/80 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-slate-200 hover:border-blue-200 bg-white/50'}`}>
                  <input type="radio" className="hidden" name="role" value="client" checked={selectedRole === 'client'} onChange={(e) => setSelectedRole(e.target.value)} />
                  <div className="font-semibold text-slate-900">Client</div>
                  <div className="text-sm text-slate-500">I am a Client.</div>
                </label>
                
                <label className={`block p-4 border rounded-xl cursor-pointer transition-all duration-300 ${selectedRole === 'freelancer' ? 'border-slate-400 bg-slate-50/80 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-slate-200 hover:border-slate-200 bg-white/50'}`}>
                  <input type="radio" className="hidden" name="role" value="freelancer" checked={selectedRole === 'freelancer'} onChange={(e) => setSelectedRole(e.target.value)} />
                  <div className="font-semibold text-slate-900">Freelancer</div>
                  <div className="text-sm text-slate-500">I am a Freelancer.</div>
                </label>
              </div>

              <button 
                onClick={handleGoogleRoleSubmit}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 rounded-xl shadow-md transition-all disabled:opacity-70 transform hover:-translate-y-1"
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : 'Continue to Dashboard'}
              </button>
            </motion.div>
          ) : isForgotPassword ? (
            <motion.div 
              key="forgot-password"
              initial={{ opacity: 0, rotateY: 90, scale: 0.9 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: -90, scale: 0.9 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
              className="relative backdrop-blur-xl bg-white/80 border border-white shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-6 md:p-8 rounded-3xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button onClick={closeAuth} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full z-10 shadow-sm">
                <X size={18} />
              </button>

              <h2 className="text-2xl font-extrabold text-slate-900 mb-4 text-center tracking-tight mt-6 md:mt-4">
                {forgotPasswordStep === 'email' ? 'Forgot Password' : 'Reset Password'}
              </h2>

              <p className="text-sm text-slate-500 text-center mb-6">
                {forgotPasswordStep === 'email' 
                  ? 'Enter your registered email and we will send you an OTP to reset your password.'
                  : `Enter the OTP sent to ${resetEmail} and your new password.`}
              </p>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                {forgotPasswordStep === 'email' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-900 placeholder-slate-400"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Verification Code (6-Digit OTP)</label>
                      <div className="flex gap-2 justify-center mb-1" onPaste={handleOtpPaste}>
                        {otpDigits.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => (otpRefs.current[index] = el)}
                            type="text"
                            name={`reset-otp-${index}`}
                            autoComplete="off"
                            inputMode="numeric"
                            maxLength="1"
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="w-12 h-12 text-center text-xl font-bold rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-slate-900 placeholder-slate-400 shrink-0"
                            required
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                      <div className="relative">
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-900 placeholder-slate-400 pr-10"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Confirm New Password</label>
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-900 placeholder-slate-400"
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3.5 mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all transform hover:-translate-y-1 disabled:opacity-70 disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    forgotPasswordStep === 'email' ? 'Send Reset OTP' : 'Reset Password'
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between mt-6 text-sm">
                <button 
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsLogin(true);
                  }}
                  className="font-bold text-blue-600 hover:underline transition-colors focus:outline-none bg-transparent border-none"
                >
                  Back to Log In
                </button>
                {forgotPasswordStep === 'reset' && (
                  <button 
                    type="button"
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        const res = await axios.post(import.meta.env.VITE_API_URL + '/api/auth/forgot-password', { email: resetEmail });
                        toast.success(res.data.message || 'OTP resent successfully!');
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'Failed to resend OTP');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="font-bold text-blue-600 hover:underline transition-colors disabled:opacity-50 focus:outline-none bg-transparent border-none"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, rotateY: isLogin ? -90 : 90, scale: 0.9 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: isLogin ? 90 : -90, scale: 0.9 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
              className="relative backdrop-blur-xl bg-white/80 border border-white shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-6 md:p-8 rounded-3xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button onClick={closeAuth} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full z-10 shadow-sm">
                <X size={18} />
              </button>

              {/* Toggle Header */}
              <div className="flex bg-slate-100/80 p-1 rounded-xl mb-4 backdrop-blur-md border border-slate-200/50 mt-6 md:mt-4">
                <button 
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Log In
                </button>
                <button 
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Sign Up
                </button>
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 mb-4 text-center tracking-tight">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">I want to...</label>
                      <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl">
                        <button 
                          type="button"
                          onClick={() => setRole('client')}
                          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'client' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Hire (Client)
                        </button>
                        <button 
                          type="button"
                          onClick={() => setRole('freelancer')}
                          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'freelancer' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Work (Freelancer)
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-900 placeholder-slate-400"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-slate-500 font-medium text-sm border-r border-slate-200 pr-2">+91</span>
                        <input 
                          type="tel" 
                          className={`w-full pl-14 pr-3 py-2.5 rounded-xl bg-white/60 border ${phoneError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'} focus:outline-none focus:ring-2 transition-all text-sm text-slate-900 placeholder-slate-400`}
                          placeholder="10 digit number"
                          value={phoneNumber}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          required={!isLogin}
                        />
                      </div>
                      {phoneError && <p className="text-red-500 text-[10px] mt-1 font-medium">{phoneError}</p>}
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isLogin ? 'Email or Name' : 'Email'}</label>
                  <input 
                    type="text" 
                    className={`w-full px-3 py-2.5 rounded-xl bg-white/60 border ${emailError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'} focus:outline-none focus:ring-2 transition-all text-sm text-slate-900 placeholder-slate-400`}
                    placeholder={isLogin ? "Enter email or name" : "you@example.com"}
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    required
                  />
                  {emailError && <p className="text-red-500 text-[10px] mt-1 font-medium">{emailError}</p>}
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      className={`w-full px-3 py-2.5 rounded-xl bg-white/60 border ${passwordError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'} focus:outline-none focus:ring-2 transition-all text-sm text-slate-900 placeholder-slate-400 pr-10`}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {!isLogin && (
                    <div className="mt-2 text-[10px] text-slate-500 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="font-bold text-slate-600 mb-1">Password requirements:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li className={password.length >= 8 ? 'text-green-600 font-medium transition-colors' : 'transition-colors'}>At least 8 characters</li>
                        <li className={/[A-Z]/.test(password) ? 'text-green-600 font-medium transition-colors' : 'transition-colors'}>One uppercase letter</li>
                        <li className={/[a-z]/.test(password) ? 'text-green-600 font-medium transition-colors' : 'transition-colors'}>One lowercase letter</li>
                        <li className={/[0-9]/.test(password) ? 'text-green-600 font-medium transition-colors' : 'transition-colors'}>One number</li>
                        <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600 font-medium transition-colors' : 'transition-colors'}>One special character</li>
                      </ul>
                    </div>
                  )}
                  {passwordError && <p className="text-red-500 text-[10px] mt-1 font-medium">{passwordError}</p>}
                </div>
                
                {!isLogin && (
                  <div className="flex items-start gap-3 mt-4 mb-2 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                    <input 
                      type="checkbox"
                      id="acceptPolicies"
                      required
                      checked={acceptPolicies}
                      onChange={(e) => setAcceptPolicies(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="acceptPolicies" className="text-xs text-slate-500 leading-relaxed select-none cursor-pointer">
                      I accept the <a href="#" onClick={(e) => { e.preventDefault(); alert("Privacy Policy: Your data is secure."); }} className="text-blue-600 hover:underline font-bold transition-colors">Privacy Policy</a> and consent to cookies.
                    </label>
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-end mt-4 mb-4">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotPasswordStep('email');
                        setResetEmail(email.includes('@') ? email : '');
                      }} 
                      className="text-sm font-bold text-blue-600 hover:underline transition-colors focus:outline-none bg-transparent border-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                
                {error && (
                  <div className="mt-2 mb-2 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 flex items-start gap-2">
                    <X size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3.5 mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all transform hover:-translate-y-1 disabled:opacity-70 disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    isLogin ? 'Log In Securely' : 'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-8 flex items-center">
                <div className="flex-1 border-t border-slate-200"></div>
                <span className="px-4 text-slate-400 text-xs font-bold uppercase tracking-widest">Or continue with</span>
                <div className="flex-1 border-t border-slate-200"></div>
              </div>

              <button 
                onClick={handleGoogle} 
                disabled={isSubmitting}
                className="w-full mt-6 py-3.5 flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 font-bold transition-all shadow-sm disabled:opacity-70 group"
              >
                <div className="group-hover:scale-110 transition-transform">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                </div>
                Google
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
