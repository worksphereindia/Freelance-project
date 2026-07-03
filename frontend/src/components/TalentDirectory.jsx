import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  MapPin, 
  Search, 
  CheckCircle, 
  Award, 
  IndianRupee, 
  X, 
  Globe, 
  User, 
  MessageSquare,
  ChevronRight,
  FileCode,
  Image,
  Database,
  ExternalLink,
  Laptop
} from 'lucide-react';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TalentDirectory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');

  // Popup Modals States
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [portfolioTarget, setPortfolioTarget] = useState(null);
  const [selectedFile, setSelectedFile] = useState('dashboard_design.fig');

  // Fetch freelancers list
  useEffect(() => {
    const fetchFreelancers = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const res = await axios.get(import.meta.env.VITE_API_URL + '/api/users/freelancers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFreelancers(res.data);
      } catch (err) {
        console.error('Failed to load freelancers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFreelancers();
  }, []);

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-semibold">Scanning network for active talent...</p>
      </div>
    );
  }

  // Filter list
  const allSkills = Array.from(new Set(freelancers.flatMap(f => f.skills || [])));

  const filteredFreelancers = freelancers.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || 
                          (f.skills && f.skills.some(s => s.toLowerCase().includes(search.toLowerCase())));
    const matchesMin = minRate === '' || (f.hourlyRate || 0) >= Number(minRate);
    const matchesMax = maxRate === '' || (f.hourlyRate || 0) <= Number(maxRate);
    const matchesSkill = skillFilter === 'all' || (f.skills && f.skills.includes(skillFilter));
    return matchesSearch && matchesMin && matchesMax && matchesSkill;
  });

  // Simulated portfolio data database
  const getMockPortfolio = (name) => {
    const username = name.toLowerCase().replace(/\s+/g, '');
    return {
      url: `https://${username}.github.io/portfolio`,
      files: [
        { 
          name: 'dashboard_design.fig', 
          type: 'figma', 
          icon: <Image size={14} className="text-pink-500" />,
          title: 'SaaS Platform Analytics Canvas',
          description: 'A dark-themed business control panel containing vector layout layers, gradients, and custom components.',
          details: {
            colors: ['#0f172a', '#3b82f6', '#10b981', '#6366f1'],
            screens: ['Overview Console', 'Transactions Ledger', 'Admin Settings Panel']
          }
        },
        { 
          name: 'api_controller.js', 
          type: 'code', 
          icon: <FileCode size={14} className="text-yellow-500" />,
          title: 'Secure Node/Express Escrow Controller',
          description: 'A production-grade backend router utilizing cryptographic verify checks to securely capture platform escrow balances.',
          code: `const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');

// Escrow Funding Controller
router.post('/fund-escrow', protect, async (req, res) => {
  const { jobId, amount, razorpayOrderId } = req.body;
  try {
    const payment = await Payment.create({
      job: jobId,
      client: req.user.id,
      amount,
      razorpayOrderId,
      status: 'escrow_funded'
    });
    res.status(201).json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;`
        },
        { 
          name: 'database_schema.sql', 
          type: 'sql', 
          icon: <Database size={14} className="text-blue-500" />,
          title: 'Escrow Ledger DB Schema',
          description: 'Optimized schema relations representing client agreements, deposits, and payouts with safety constraints.',
          code: `-- Database Creation Script for Escrow System
CREATE TABLE escrow_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id VARCHAR(50) NOT NULL,
  freelancer_id VARCHAR(50) NOT NULL,
  job_id VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  escrow_status ENUM('pending', 'funded', 'released') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (freelancer_id) REFERENCES users(id)
);`
        }
      ]
    };
  };

  const handleMessageClick = (freelancerId) => {
    // Navigate contextually to chat
    navigate('/chat', { state: { directUserId: freelancerId } });
  };

  return (
    <div className="space-y-6">
      
      {/* Filtering Header Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name, skills (e.g. React)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Rate (₹)</span>
            <input 
              type="number" 
              placeholder="Min" 
              value={minRate}
              onChange={e => setMinRate(e.target.value)}
              className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input 
              type="number" 
              placeholder="Max" 
              value={maxRate}
              onChange={e => setMaxRate(e.target.value)}
              className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
            />
          </div>

          <select
            value={skillFilter}
            onChange={e => setSkillFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
          >
            <option value="all">All Skills</option>
            {allSkills.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Freelancers Results Directory */}
      {filteredFreelancers.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-white border border-dashed rounded-3xl p-10">
          No freelancers found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFreelancers.map((freelancer) => (
            <motion.div 
              key={freelancer._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex flex-col p-6 relative overflow-hidden group"
            >
              {/* Top Details Card */}
              <div className="flex items-start gap-4 mb-4">
                <div className="relative flex-shrink-0">
                  <Avatar name={freelancer.name} src={freelancer.profilePicture} size={60} className="ring-4 ring-blue-50 shadow-sm" />
                  {freelancer.isFreelancerApproved && (
                    <div className="absolute bottom-0 right-0 bg-white rounded-full p-0.5 border border-slate-100 shadow-sm">
                      <CheckCircle size={14} className="text-blue-500 fill-blue-50" />
                    </div>
                  )}
                </div>

                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-800 text-md tracking-tight flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                    {freelancer.name}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    {freelancer.experience || 'Professional Talent'}
                  </p>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    <span>{freelancer.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-slate-400 font-semibold text-[10px]">(0 reviews)</span>
                  </div>
                  {freelancer.adminRating > 0 && (
                    <div className="inline-flex items-center gap-1 mt-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-bold text-[9px] uppercase tracking-wide">
                      <CheckCircle size={10} className="text-blue-500" />
                      Admin Verified: {freelancer.adminRating} <Star size={8} className="fill-blue-600 text-blue-600 inline ml-0.5 -mt-0.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Taglist */}
              <div className="flex flex-wrap gap-1.5 mb-4 max-h-16 overflow-hidden">
                {freelancer.skills?.map(skill => (
                  <span key={skill} className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg text-[9px] font-bold">
                    {skill}
                  </span>
                ))}
              </div>

              {/* Location and Rates info */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-t border-slate-50 pt-4 mt-auto">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin size={12} />
                  <span>{freelancer.location || 'Remote'}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-blue-600">
                    {freelancer.hourlyRate > 0 ? `₹${freelancer.hourlyRate.toLocaleString('en-IN')}` : 'Rate Negotiable'}
                  </span>
                  <span className="text-[9px] text-slate-400 block -mt-1 font-semibold">per hour</span>
                </div>
              </div>

              {/* Main Actions Panel */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                <button 
                  onClick={() => setSelectedFreelancer(freelancer)}
                  className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <User size={13} /> View Profile
                </button>
                <button 
                  onClick={() => handleMessageClick(freelancer._id)}
                  className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center"
                  title="Message Freelancer"
                >
                  <MessageSquare size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 1. Profile Details Modal Popup */}
      {createPortal(
        <AnimatePresence>
          {selectedFreelancer && (
            <div 
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm"
              onClick={() => setSelectedFreelancer(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
              >
              {/* Profile Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start relative">
                <button 
                  onClick={() => setSelectedFreelancer(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 bg-white hover:bg-slate-100 rounded-full border border-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>

                <div className="flex gap-4 items-center">
                  <Avatar name={selectedFreelancer.name} src={selectedFreelancer.profilePicture} size={64} className="ring-4 ring-blue-50 shadow-sm" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-1.5">
                      {selectedFreelancer.name}
                      {selectedFreelancer.isFreelancerApproved && (
                        <CheckCircle size={16} className="text-blue-500" />
                      )}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                      {selectedFreelancer.experience || 'Professional Talent'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-1">
                      <MapPin size={10} /> {selectedFreelancer.location || 'Remote'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Bio / Skills Body */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar text-xs">
                {/* Stats Ledger */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hourly Cost</p>
                    <p className="text-xl font-black text-blue-600 mt-1">
                      {selectedFreelancer.hourlyRate > 0 ? `₹${selectedFreelancer.hourlyRate.toLocaleString('en-IN')}` : 'Rate Negotiable'}
                    </p>
                  </div>
                  <div className="text-center border-l border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Average Rating</p>
                    <p className="text-xl font-black text-slate-800 mt-1 flex items-center justify-center gap-1">
                      <Star size={16} className="text-amber-500 fill-amber-500" />
                      {selectedFreelancer.rating?.toFixed(1) || '0.0'}
                    </p>
                  </div>
                </div>

                {/* About Profile */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Biography / Background</h4>
                  <p className="text-slate-500 leading-relaxed text-[11px]">
                    Passionate software engineer and design professional offering enterprise development services. Over 5 years of industry experience creating reactive user interfaces, backend databases, and robust microservices integrations.
                  </p>
                </div>

                {/* Skills section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Skill Core Competencies</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFreelancer.skills?.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-slate-50 border border-slate-100 text-slate-600 rounded-lg font-bold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Portfolios Action Panel */}
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="text-blue-600" size={20} />
                    <div className="text-left">
                      <p className="font-bold text-slate-800">Showcase Portfolio</p>
                      <p className="text-[10px] text-slate-500">Launch sandbox environment browser viewer</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setPortfolioTarget(selectedFreelancer);
                      setSelectedFile('dashboard_design.fig');
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    Open Portfolio Viewer <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Direct Hires footer */}
              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setSelectedFreelancer(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleMessageClick(selectedFreelancer._id);
                    setSelectedFreelancer(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5"
                >
                  <MessageSquare size={14} /> Initiate Discussion
                </button>
              </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 2. Interactive simulated Portfolio Browser Modal Popup */}
      {createPortal(
        <AnimatePresence>
          {portfolioTarget && (
            <div 
              className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[500] p-4 backdrop-blur-md"
              onClick={() => setPortfolioTarget(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col text-slate-300"
              >
              {/* Simulated Browser Bar */}
              <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                {/* Mac Circle Control Panel */}
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => setPortfolioTarget(null)}
                    className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                  ></button>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>

                {/* Simulated URL input bar */}
                <div className="bg-slate-950 border border-slate-800 text-slate-400 font-semibold px-4 py-1.5 rounded-xl text-[10px] w-96 flex items-center gap-2 justify-center text-center">
                  <Globe size={11} className="text-slate-500" />
                  <span>{portfolioTarget.portfolioUrl || getMockPortfolio(portfolioTarget.name).url}</span>
                </div>

                {/* Visitor check buttons */}
                <a 
                  href={portfolioTarget.portfolioUrl ? (portfolioTarget.portfolioUrl.startsWith('http') ? portfolioTarget.portfolioUrl : `https://${portfolioTarget.portfolioUrl}`) : "https://github.com"} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                >
                  Visit Host <ExternalLink size={10} />
                </a>
              </div>

              {/* Viewport Workspace */}
              <div className="flex-1 flex overflow-hidden bg-slate-950">
                {portfolioTarget.portfolioUrl ? (
                  <div className="flex-1 flex flex-col">
                    <iframe 
                      src={portfolioTarget.portfolioUrl.startsWith('http') ? portfolioTarget.portfolioUrl : `https://${portfolioTarget.portfolioUrl}`}
                      className="flex-1 w-full border-none bg-white"
                      title="Freelancer Portfolio"
                    />
                    <div className="bg-slate-900 border-t border-slate-800 px-6 py-3 flex justify-end gap-3">
                      <button
                        onClick={() => setPortfolioTarget(null)}
                        className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition-colors cursor-pointer"
                      >
                        Close Viewer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex overflow-hidden">
                    {/* File Explorer Directory Sidebar */}
                    <div className="w-64 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Project Artifacts</p>
                        <div className="space-y-1">
                          {getMockPortfolio(portfolioTarget.name).files.map(file => (
                            <button
                              key={file.name}
                              onClick={() => setSelectedFile(file.name)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-all ${selectedFile === file.name ? 'bg-slate-800 text-white border border-slate-700' : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'}`}
                            >
                              {file.icon}
                              <span className="truncate">{file.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Profile badge details */}
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-2">
                        <Avatar name={portfolioTarget.name} src={portfolioTarget.profilePicture} size={30} className="border border-slate-700" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-white truncate">{portfolioTarget.name}</p>
                          <p className="text-[8px] text-emerald-400 font-bold uppercase flex items-center gap-0.5 tracking-wider">
                            <Award size={8} /> Verified Dev
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Explorer File View Panel */}
                    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
                      {(() => {
                        const mockFile = getMockPortfolio(portfolioTarget.name).files.find(f => f.name === selectedFile);
                        if (!mockFile) return null;

                        return (
                          <div className="space-y-4">
                            <div>
                              <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-950/40 border border-blue-900/50 px-2 py-0.5 rounded-md">
                                {mockFile.type} Preview
                              </span>
                              <h3 className="text-lg font-bold text-white mt-2">{mockFile.title}</h3>
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{mockFile.description}</p>
                            </div>

                            {/* Rendering by Type */}
                            {mockFile.type === 'figma' && (
                              <div className="border border-slate-800 rounded-2xl bg-slate-900/20 p-4 space-y-4 shadow-inner">
                                {/* Color Palettes preview */}
                                <div className="space-y-2">
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Interactive Color Variables</p>
                                  <div className="flex gap-2">
                                    {mockFile.details.colors.map(col => (
                                      <div key={col} className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg p-1.5 pr-3">
                                        <div className="w-4 h-4 rounded" style={{ backgroundColor: col }}></div>
                                        <span className="text-[10px] font-mono text-slate-400 uppercase">{col}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Canvas list mockup */}
                                <div className="space-y-2">
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Design Artboards</p>
                                  <div className="space-y-1.5">
                                    {mockFile.details.screens.map(scr => (
                                      <div key={scr} className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
                                        <span className="text-xs text-slate-300 font-semibold">{scr}</span>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Canvas Layer</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {(mockFile.type === 'code' || mockFile.type === 'sql') && (
                              <div className="border border-slate-800 rounded-2xl bg-slate-900/10 overflow-hidden font-mono text-[10px] leading-relaxed shadow-lg">
                                {/* Editor Top Control Bar */}
                                <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex justify-between items-center text-slate-500 font-sans">
                                  <span>Source File Viewer</span>
                                  <span>UTF-8</span>
                                </div>
                                <pre className="p-4 text-emerald-400 overflow-x-auto select-all bg-slate-950/60 custom-scrollbar max-h-72">
                                  <code>{mockFile.code}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Portfolio footer action */}
                      <div className="pt-6 border-t border-slate-800 flex justify-end gap-3 mt-6">
                        <button
                          onClick={() => setPortfolioTarget(null)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition-colors"
                        >
                          Close Viewer
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
