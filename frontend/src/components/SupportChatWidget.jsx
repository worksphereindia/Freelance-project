import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

let socket;

export default function SupportChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Only render for advanced freelancers
  if (user?.role !== 'freelancer' || user?.subscriptionPlan !== 'advanced') {
    return null;
  }

  useEffect(() => {
    if (isOpen) {
      socket = io(import.meta.env.VITE_API_URL);
      
      socket.emit('join_room', `support_${user.id}`);

      // Load history
      axios.get(`${import.meta.env.VITE_API_URL}/api/support/messages`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      }).then(res => {
        setMessages(res.data);
      }).catch(err => console.error("Failed to load support history", err));

      socket.on('receive_support_message', (msg) => {
        setMessages(prev => [...prev, msg]);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isOpen, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgData = {
      content: newMessage,
      userId: user.id,
      senderModel: 'User',
      roomName: `support_${user.id}`
    };

    // Optimistic update
    setMessages(prev => [...prev, { ...msgData, createdAt: new Date().toISOString(), senderModel: 'User', user: user.id }]);
    
    socket.emit('send_support_message', msgData);
    setNewMessage('');
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full text-white shadow-xl shadow-purple-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-[100]"
          >
            <div className="relative">
              <MessageSquare size={24} />
              <Crown size={12} className="absolute -top-3 -right-3 text-amber-300 fill-amber-300 transform rotate-12" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-[100] overflow-hidden"
          >
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Crown size={20} className="text-purple-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Pro Priority Support</h3>
                  <p className="text-[10px] text-slate-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-3">
                  <MessageSquare size={40} className="text-slate-400" />
                  <p className="text-xs text-slate-500 font-semibold max-w-[200px]">How can we help you today? An admin will join shortly.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderModel === 'User';
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                        isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 mx-1 font-medium">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-md transition-all active:scale-95"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
