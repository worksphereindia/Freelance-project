import { motion } from 'framer-motion';
import aboutUsIllustration from '../assets/about_us_illustration.png';

export default function AboutUs() {
  return (
    <div className="min-h-[85vh] py-16 px-4 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6"
        >
          Empowering Indian <br/> <span className="text-blue-600">Freelancers & Startups</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-slate-600 mb-12"
        >
          WorkSphere was built to solve the trust deficit in the freelance market. By combining AI-driven matching algorithms with Razorpay escrow payments and military-grade chat encryption, we ensure that both clients and talent can collaborate with complete peace of mind.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-3xl mx-auto mb-16 relative group mix-blend-multiply"
        >
          <img src={aboutUsIllustration} alt="About WorkSphere" loading="lazy" decoding="async" className="w-full h-auto object-contain transform transition-transform duration-700 group-hover:scale-105" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 text-left mt-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 bg-slate-50 rounded-2xl border border-slate-100"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h3>
            <p className="text-slate-600 leading-relaxed">
              To create a seamless bridge between rapidly growing Indian startups and top-tier independent professionals. We believe that talent has no boundaries, and opportunity shouldn't either.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 bg-slate-50 rounded-2xl border border-slate-100"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Trust & Safety</h3>
            <p className="text-slate-600 leading-relaxed">
              Every job on WorkSphere is backed by Escrow. We hold the funds until the milestones are met. Our chat communications are actively monitored by algorithms to prevent the sharing of personal contact info to keep the platform secure.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
