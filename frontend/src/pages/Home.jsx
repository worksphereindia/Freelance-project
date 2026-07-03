import { motion, useScroll, useTransform, useMotionValue, useSpring, useInView } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { ShieldCheck, Zap, Lock, ArrowRight, Briefcase, Calculator, Award, Sparkles, MonitorPlay, FileText, ChevronRight, Video, CheckCircle2, Star, Target, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import heroIllustration from '../assets/hero_illustration_transparent.png';

// Enhanced 3D Canvas Mesh
function InteractiveMesh() {
  const canvasRef = useRef(null);
  const isInView = useInView(canvasRef);
  const isInViewRef = useRef(isInView);

  useEffect(() => {
    isInViewRef.current = isInView;
  }, [isInView]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles = [];
    const maxParticles = 80;
    const connectionDist = 150;
    const mouse = { x: null, y: null, radius: 200 };

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.radius = Math.random() * 3 + 1;
        this.baseColor = Math.random() > 0.5 ? 'rgba(99, 102, 241,' : 'rgba(236, 72, 153,'; // Indigo or Pink
      }

      update() {
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        this.x += this.vx;
        this.y += this.vy;

        if (mouse.x !== null && mouse.y !== null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x += (dx / dist) * force * 3;
            this.y += (dy / dist) * force * 3;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${this.baseColor} 0.6)`;
        ctx.fill();
        
        // Add a subtle glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = `${this.baseColor} 0.8)`;
      }
    }

    for (let i = 0; i < maxParticles; i++) particles.push(new Particle());

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => { mouse.x = null; mouse.y = null; };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    });

    const animate = () => {
      if (isInViewRef.current) {
        ctx.clearRect(0, 0, width, height);
        ctx.shadowBlur = 0; // Reset shadow for lines

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.hypot(dx, dy);

          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.25;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`; // Violet connections
            ctx.lineWidth = 1.5;
            ctx.stroke();
            }
          }
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animationId);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto opacity-60 mix-blend-multiply" />;
}

// 3D Tilt Card Component
function TiltCard({ children, className }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`perspective-1000 ${className}`}
    >
      <div style={{ transform: "translateZ(30px)" }} className="w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [estimateCategory, setEstimateCategory] = useState('Web Design');
  const [estimateBudget, setEstimateBudget] = useState(40000);
  const platformFee = Math.round(estimateBudget * 0.05);
  const totalInvoice = estimateBudget + platformFee;

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get(import.meta.env.VITE_API_URL + '/api/jobs');
        const fetchedJobs = res.data.jobs ? res.data.jobs : res.data;
        if (Array.isArray(fetchedJobs)) {
          setJobs(fetchedJobs.slice(0, 6));
        } else {
          setJobs([]);
        }
      } catch (err) {
        console.error("Failed to load jobs");
      }
    };
    fetchJobs();
  }, []);

  const categoriesData = [
    { name: 'Web Design', icon: <Briefcase size={24} />, desc: 'Next.js, Tailwind layouts, and interactive WebGL assets.', shortText: 'UI/UX & Web Dev', hoverText: 'Build responsive, modern interfaces', color: 'from-blue-500 to-indigo-500' },
    { name: 'Video Editing', icon: <Video size={24} />, desc: 'SaaS promos, corporate reviews, color grading, and SFX.', shortText: 'Motion & Post-Production', hoverText: 'Professional video editing services', color: 'from-slate-500 to-pink-500' },
    { name: 'Reels Making', icon: <MonitorPlay size={24} />, desc: 'High retention captions, fast-paced transitions, TikTok.', shortText: 'Short-Form Content', hoverText: 'Engaging clips for social media', color: 'from-blue-500 to-purple-500' },
    { name: 'Copywriting', icon: <FileText size={24} />, desc: 'High-converting ad copies, sales sequences, and blogs.', shortText: 'Sales Copy & Blogs', hoverText: 'Persuasive writing that converts', color: 'from-slate-500 to-teal-500' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      
      {/* 1. Hero Section with 3D Elements */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32 px-4 bg-grid-pattern overflow-hidden">
        {/* Glow behind hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-300/30 rounded-full blur-[120px] pointer-events-none"></div>
        
        <InteractiveMesh />
        
        {/* Floating 3D Orbs/Elements */}
        <div className="absolute top-32 left-20 animate-float">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-slate-500 blur-sm opacity-80 shadow-[0_0_50px_rgba(139,92,246,0.6)]"></div>
        </div>
        <div className="absolute bottom-40 right-20 animate-float-delayed">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 blur-sm opacity-70 shadow-[0_0_50px_rgba(56,189,248,0.6)]"></div>
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-bold text-blue-700 shadow-sm backdrop-blur-xl">
              <Sparkles size={16} className="text-slate-500" />
              <span>Decentralized Escrow Talent Portal</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Where elite talent <br />
              meets <span className="text-gradient">frictionless trust.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 max-w-xl font-medium leading-relaxed">
              WorkSphere connects top-tier designers, creators, and marketers. Secured by automated digital contracts and real-time bank escrow vaults.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/dashboard" className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 transition-all transform hover:-translate-y-1 flex items-center gap-2 group">
                Start Hiring <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/dashboard" className="px-8 py-4 glass-panel text-slate-800 rounded-2xl font-bold hover:bg-white/80 transition-all transform hover:-translate-y-1">
                Find Freelance Work
              </Link>
            </div>
          </motion.div>

          {/* 3D Hero Visual Element */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            <div className="w-full max-w-lg mx-auto">
              <img src={heroIllustration} alt="Secure Escrow Talent Portal" className="w-full h-auto object-contain transform transition-transform duration-700 animate-float" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Core Disciplines (3D Glass Grid) */}
      <section className="py-32 relative z-10 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center max-w-3xl mx-auto mb-20 space-y-4"
          >
            <span className="text-sm font-bold text-blue-600 tracking-widest uppercase">Core Disciplines</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Harness elite creative and tech</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoriesData.map((cat, idx) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative p-1 rounded-3xl bg-gradient-to-b from-slate-100 to-white shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity rounded-3xl z-0 pointer-events-none ${cat.color}`} style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}></div>
                <div className="bg-white h-full w-full rounded-[23px] p-6 flex flex-col justify-between relative z-10 border border-slate-100">
                  <div className="space-y-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center shadow-md transform group-hover:rotate-12 transition-transform duration-300`}>
                      {cat.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{cat.name}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{cat.desc}</p>
                  </div>
                  <div className="mt-8 flex justify-between items-center text-sm font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                    <span className="block group-hover:hidden">{cat.shortText}</span>
                    <span className="hidden group-hover:block transition-all">{cat.hoverText}</span>
                    <ChevronRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Live Jobs Preview (Floating Cards) */}
      <section className="py-32 bg-slate-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-4"
          >
            <div className="space-y-3">
              <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Active Board</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Vetted opportunities in the market</h2>
            </div>
            <Link to={user ? "/dashboard" : "/login"} className="group text-slate-900 font-bold flex items-center gap-2 bg-white border-2 border-slate-900 px-6 py-3 rounded-full text-sm transition-all hover:bg-slate-900 hover:text-white">
              View All Projects <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 perspective-1000">
            {Array.isArray(jobs) && jobs.length > 0 ? jobs.map((job, idx) => (
              <motion.div 
                initial={{ opacity: 0, rotateX: 10, y: 50 }}
                whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, type: "spring" }}
                whileHover={{ y: -10, rotateX: 5, rotateY: -5 }}
                key={job._id} 
                className="glass-panel p-8 rounded-3xl cursor-pointer group flex flex-col justify-between min-h-[260px] transform-gpu transition-shadow hover:shadow-2xl hover:shadow-slate-500/10"
                onClick={() => navigate(user ? "/dashboard" : "/login")}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-xs font-bold px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider shadow-inner">
                      {job.category || 'Freelance'}
                    </span>
                    <span className="text-xl font-black text-slate-900">₹{job.budget.toLocaleString('en-IN')}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-slate-600 transition-all line-clamp-2">{job.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-6">{job.description}</p>
                </div>
                <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-200/50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center"><Globe size={12} className="text-slate-500"/></div>
                    <span className="text-xs text-slate-600 font-semibold">{job.client?.companyName || 'Verified Client'}</span>
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 bg-slate-900 text-white rounded-full">
                    {job.skills?.[0] || job.category || 'General'}
                  </span>
                </div>
              </motion.div>
            )) : (
              [1, 2, 3].map(i => (
                <div key={i} className="glass-panel p-8 rounded-3xl h-64 animate-pulse flex flex-col justify-between">
                  <div>
                    <div className="w-20 h-6 bg-slate-200/50 rounded-full mb-6"></div>
                    <div className="h-6 bg-slate-200/50 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-slate-200/50 rounded w-full mb-2"></div>
                  </div>
                  <div className="h-10 bg-slate-200/50 rounded w-full"></div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 4. Interactive Widget Section */}
      <section className="py-32 bg-white relative z-10 overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1/2 h-[800px] bg-gradient-to-bl from-blue-50 to-transparent rounded-l-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8 relative z-10"
            >
              <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">Transparent Pricing</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                No hidden fees. <br />Only a <span className="text-gradient">5.0% platform fee</span>.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed font-medium max-w-lg">
                Clients pay a flat 5.0% facilitation fee to secure the bank escrow, while the freelancer receives 100% of their proposal quote. Pure transparency.
              </p>
              
              <div className="space-y-5 pt-4">
                {[
                  "Funds released only after mileslate approval",
                  "Digital receipt generation with tax itemization",
                  "Razorpay secure integration & payment simulation"
                ].map((text, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.3 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm"><CheckCircle2 size={16} /></div>
                    <span className="text-base font-semibold text-slate-800">{text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative perspective-1000"
            >
              <TiltCard>
                <div className="glass-panel p-10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] relative overflow-hidden border-2 border-white/60">
                  <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="relative z-10 space-y-8">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Calculator size={24} /></div>
                      Fee Estimator
                    </h3>
                    
                    <div className="space-y-6">
                      

                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Freelancer Bid</label>
                          <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-slate-600">₹{estimateBudget.toLocaleString('en-IN')}</span>
                        </div>
                        <input 
                          type="range" 
                          min="5000" 
                          max="200000" 
                          step="5000"
                          value={estimateBudget}
                          onChange={(e) => setEstimateBudget(Number(e.target.value))}
                          className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600 shadow-inner"
                        />
                      </div>

                      <div className="bg-slate-900 p-6 rounded-2xl shadow-xl space-y-4 font-mono text-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none"></div>
                        <div className="flex justify-between text-slate-400">
                          <span>FREELANCER BID:</span>
                          <span className="text-white">₹{estimateBudget.toLocaleString('en-IN')}.00</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>PLATFORM FEE (5%):</span>
                          <span className="text-slate-400">₹{platformFee.toLocaleString('en-IN')}.00</span>
                        </div>
                        <div className="border-t border-dashed border-slate-700 w-full my-4"></div>
                        <div className="flex justify-between text-lg font-black text-white">
                          <span>TOTAL BILLING:</span>
                          <span>₹{totalInvoice.toLocaleString('en-IN')}.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 5. Trust & Escrow Features (Bento Box Layout) */}
      <section className="py-32 bg-slate-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20 space-y-4"
          >
            <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Platform Safeguards</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Built for unbreakable trust</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              className="md:col-span-2 glass-panel p-10 rounded-[2rem] flex flex-col justify-center relative overflow-hidden"
            >
              <div className="absolute -right-10 -bottom-10 opacity-10 text-slate-500"><ShieldCheck size={200} /></div>
              <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center shadow-md mb-6 relative z-10"><ShieldCheck size={28} /></div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 relative z-10">Military-Grade Escrow</h3>
              <p className="text-slate-600 font-medium leading-relaxed relative z-10 max-w-md">Payments are deposited into secure virtual accounts before work begins. Funds are strictly released only after client approval.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="glass-panel p-10 rounded-[2rem] bg-gradient-to-b from-white to-slate-100"
            >
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-md mb-6"><Zap size={28} /></div>
              <h3 className="text-xl font-black text-slate-900 mb-3">Vetted Matches</h3>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">System-verified freelancers ensure top quality execution.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              className="glass-panel p-10 rounded-[2rem] bg-gradient-to-b from-white to-slate-100"
            >
              <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center shadow-md mb-6"><Lock size={28} /></div>
              <h3 className="text-xl font-black text-slate-900 mb-3">Encrypted Comms</h3>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">End-to-end encryption for all project chats and file sharing.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              className="md:col-span-2 glass-panel p-10 rounded-[2rem] flex flex-col justify-center relative overflow-hidden bg-gradient-to-br from-slate-100 to-white"
            >
              <div className="absolute -right-10 -top-10 opacity-5 text-slate-400"><Target size={200} /></div>
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-md mb-6 relative z-10"><Target size={28} /></div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 relative z-10">Arbitration Guarantee</h3>
              <p className="text-slate-600 font-medium leading-relaxed relative z-10 max-w-md">Dispute? Our unbiased admin arbitration team steps in to review deliverables and ensure fair resolution instantly.</p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
