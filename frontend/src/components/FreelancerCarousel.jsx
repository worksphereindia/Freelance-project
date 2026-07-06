import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { ChevronLeft, ChevronRight, Star, MapPin, MessageSquare, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FreelancerCarousel() {
  const { user } = useAuth();
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchFreelancers = async () => {
      try {
        const token = user?.token || sessionStorage.getItem('token');
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

    if (user?.role === 'client') {
      fetchFreelancers();
    } else {
      setLoading(false);
    }
  }, [user]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 300;
      if (direction === 'left') {
        current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  if (user?.role !== 'client') return null;
  if (loading) return <div className="p-8 text-center text-slate-500">Loading freelancers...</div>;
  if (freelancers.length === 0) return null;

  return (
    <div className="mb-10 w-full relative">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Available Freelancers</h2>
          <p className="text-sm text-slate-500">Find the perfect freelancer for your project</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => scroll('left')} 
            className="p-2 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => scroll('right')} 
            className="p-2 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef} 
        className="flex overflow-x-auto gap-6 pb-4 snap-x hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {freelancers.map((freelancer) => (
          <motion.div 
            key={freelancer._id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-w-[280px] w-[280px] bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all snap-start flex flex-col items-center p-6 text-center"
          >
            <div className="relative mb-3">
              <Avatar name={freelancer.name} src={freelancer.profilePicture} size={70} className="ring-4 ring-blue-50 shadow-sm" />
              {freelancer.isVerified && (
                <div className="absolute bottom-0 right-0 bg-white rounded-full">
                  <CheckCircle size={18} className="text-blue-500" />
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-800">{freelancer.name}</h3>
            
            <div className="flex items-center gap-1 mt-1 text-sm text-slate-600">
              <div className="flex text-blue-400">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} size={14} fill={star <= Math.round(freelancer.rating) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="font-semibold ml-1">{freelancer.rating?.toFixed(1) || '0.0'}</span>
              <span className="text-slate-400 text-xs">(0)</span>
            </div>

            <div className="text-xs text-slate-400 mt-1 line-clamp-1">
              {freelancer.experience || 'Professional freelancer'}
            </div>

            <div className="flex gap-2 mt-3 mb-4">
              <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded text-[10px] font-medium">
                New Freelancer
              </span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">
                Fresh Talent
              </span>
            </div>

            <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">
              {freelancer.skills?.join(', ') || 'Professional freelancer ready to help with your projects.'}
            </p>

            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium mb-5 w-full justify-center">
              <div className="flex items-center gap-1">
                <MapPin size={12} />
                <span className="truncate max-w-[80px]">{freelancer.location || 'Remote'}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare size={12} />
                <span>0 reviews</span>
              </div>
            </div>

            <div className="mt-auto w-full flex items-center justify-between border-t border-slate-100 pt-4">
              <button className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded text-xs transition-colors flex items-center gap-1.5 shadow-sm">
                <Avatar name={freelancer.name} src={freelancer.profilePicture} size={14} /> View Profile
              </button>
              <div className="text-right">
                <span className="text-slate-900 font-bold">
                  {freelancer.hourlyRate > 0 ? `₹${freelancer.hourlyRate}` : 'Negotiable'}
                </span>
                <div className="text-[10px] text-slate-400 font-medium -mt-1">per hour</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
