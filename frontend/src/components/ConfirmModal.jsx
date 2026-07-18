import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title = "Confirm Action", 
  message = "Are you sure you want to continue?",
  description = "Please review the action details before confirming to proceed.",
  requireInput = false,
  inputValue = '',
  onInputChange = () => {},
  inputPlaceholder = 'Enter required link/value...',
  inputType = 'text',
  variant = 'info', // 'info', 'danger', 'warning', 'success'
  confirmText = "Yes, Continue",
  cancelText = "Cancel",
  isLoading = false
}) {
  const isValidUrl = (str) => {
    try {
      new URL(str.includes('http') ? str : `https://${str}`);
      return str.includes('.') && str.length > 4;
    } catch {
      return false;
    }
  };

  const isConfirmDisabled = requireInput 
    ? (inputType === 'url' ? !isValidUrl(inputValue.trim()) : !inputValue.trim())
    : false;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Variant Configuration
  const variants = {
    info: {
      icon: <HelpCircle size={32} />,
      iconBg: "bg-blue-50 border-blue-100 text-blue-600",
      buttonBg: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500",
      shadow: "hover:shadow-blue-500/25",
      textColor: "text-blue-600"
    },
    danger: {
      icon: <AlertTriangle size={32} />,
      iconBg: "bg-red-50 border-red-100 text-red-600",
      buttonBg: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500",
      shadow: "hover:shadow-red-500/25",
      textColor: "text-red-600"
    },
    warning: {
      icon: <AlertTriangle size={32} />,
      iconBg: "bg-amber-50 border-amber-100 text-amber-600",
      buttonBg: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 focus:ring-amber-500",
      shadow: "hover:shadow-amber-500/25",
      textColor: "text-amber-600"
    },
    success: {
      icon: <CheckCircle2 size={32} />,
      iconBg: "bg-green-50 border-green-100 text-green-600",
      buttonBg: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-green-500",
      shadow: "hover:shadow-green-500/25",
      textColor: "text-green-600"
    }
  };

  const currentVariant = variants[variant] || variants.info;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onCancel}
            className="absolute inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col items-center text-center z-10 overflow-hidden"
          >
            {/* Top decorative gradient based on variant */}
            <div className={`absolute top-0 inset-x-0 h-1.5 ${currentVariant.buttonBg}`} />

            {/* Animated Icon */}
            <motion.div
              initial={{ rotate: -15, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.1, bounce: 0.5 }}
              className={`w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center mb-6 relative ${currentVariant.iconBg}`}
            >
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20"></div>
              {currentVariant.icon}
            </motion.div>

            {/* Title & Prompt */}
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              {title}
            </h3>
            
            <p className={`text-sm font-bold ${currentVariant.textColor} mb-3 tracking-wide uppercase`}>
              {message}
            </p>
            
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-8">
              {description}
            </p>

            {requireInput && (
              <div className="w-full mb-8 text-left relative group">
                <input
                  type={inputType === 'url' ? 'url' : 'text'}
                  value={inputValue}
                  onChange={(e) => onInputChange(e.target.value)}
                  placeholder={inputPlaceholder}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium placeholder:font-normal shadow-inner"
                  required
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-all hover:shadow-inner active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isConfirmDisabled || isLoading}
                className={`flex-1 py-4 px-4 text-white font-bold rounded-2xl text-sm shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 flex items-center justify-center gap-2 ${currentVariant.buttonBg} ${currentVariant.shadow}`}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                {isLoading ? 'Processing...' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
