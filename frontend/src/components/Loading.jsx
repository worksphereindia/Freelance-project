import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-blue-50/40 relative overflow-hidden">
      {/* soft ambient glows echoing the logo's orbit colors */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-amber-200/30 blur-3xl" />

      {/* Logo mark inside a spinning rainbow orbit ring */}
      <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
        {/* spinning gradient ring (matches the logo's orbit) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, #f97316, #facc15, #22c55e, #2563eb, #f97316)',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 5px))'
          }}
        />
        {/* actual WorkSphere logo, gently floating */}
        <motion.img
          src="/logo.png"
          alt="WorkSphere"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="w-24 h-24 rounded-2xl object-cover shadow-lg"
        />
      </div>

      {/* Wordmark — matches the site nav */}
      <div className="text-3xl font-extrabold tracking-tight text-blue-600">
        WorkSphere
      </div>

      {/* Tagline */}
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
      >
        Securing your workspace
      </motion.p>

      {/* progress shimmer */}
      <div className="mt-6 w-44 h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
        <motion.div
          animate={{ x: ['-100%', '220%'] }}
          transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut' }}
          className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-blue-600 to-transparent"
        />
      </div>
    </div>
  );
}
