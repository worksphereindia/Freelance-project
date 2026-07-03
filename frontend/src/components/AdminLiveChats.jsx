import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

let socket;

export default function AdminLiveChats() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const getHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem('token')}` });

  const fetchChats = async () => {
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + '/api/support/admin/chats', { headers: getHeaders() });
      setChats(res.data);
    } catch (err) {
      toast.error('Failed to load support chats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
    fetchChats();
    socket = io(import.meta.env.VITE_API_URL, { transports: ['websocket'], upgrade: false });

    socket.on('receive_support_message', (data) => {
      // Refresh chats list to update unread counts
      fetchChats();
      
      if (data.senderModel === 'User') {
        if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
          new Notification("New Support Message", {
            body: data.content,
            icon: "/favicon.ico"
          });
        }
      }
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedChat) return;

    const roomName = `support_${selectedChat.user._id}`;
    socket.emit('join_room', { roomName, userId: 'admin' });

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/support/admin/messages/${selectedChat.user._id}`, { headers: getHeaders() });
        setMessages(res.data);
        scrollToBottom();

        // Mark as read
        if (res.data.some(m => m.senderModel === 'User' && !m.isRead)) {
          socket.emit('mark_support_read', { roomName, userId: selectedChat.user._id, isFromAdmin: true });
          // refresh chat list to clear unread counts
          fetchChats();
        }
      } catch (err) {
        toast.error('Failed to fetch messages');
      }
    };
    fetchMessages();

    const messageHandler = (data) => {
      if (data.user === selectedChat.user._id) {
        setMessages(prev => [...prev, data]);
        scrollToBottom();
        if (data.senderModel === 'User') {
          socket.emit('mark_support_read', { roomName, userId: selectedChat.user._id, isFromAdmin: true });
        }
      } else {
        // Refresh chats to show unread dot
        fetchChats();
      }
    };

    socket.on('receive_support_message', messageHandler);

    return () => {
      socket.off('receive_support_message', messageHandler);
    };
  }, [selectedChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChat) return;

    const roomName = `support_${selectedChat.user._id}`;
    socket.emit('send_support_message', {
      userId: selectedChat.user._id,
      senderModel: 'Admin',
      content: messageText,
      roomName
    });

    setMessageText('');
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading chats...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[600px] flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-100 bg-white">
          <h2 className="font-bold text-slate-800">Live Support Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">No active support chats.</div>
          ) : (
            chats.map(chat => (
              <button
                key={chat.user._id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full text-left p-4 border-b border-slate-100 transition-colors ${selectedChat?.user._id === chat.user._id ? 'bg-blue-50' : 'hover:bg-slate-100 bg-white'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-slate-800">{chat.user.name}</span>
                  {chat.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{chat.unreadCount}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 truncate mt-1">{chat.user.email}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col relative">
          <div className="p-4 border-b border-slate-100 bg-white shadow-sm z-10 flex justify-between items-center">
            <h2 className="font-bold text-slate-800">Chat with {selectedChat.user.name}</h2>
            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 capitalize">{selectedChat.user.role}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafc]">
            {messages.length === 0 && (
              <div className="text-center py-10 text-sm text-slate-400">No messages yet.</div>
            )}
            {messages.map((msg, idx) => {
              const isAdmin = msg.senderModel === 'Admin';
              return (
                <div key={msg._id || idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3.5 rounded-2xl shadow-sm ${isAdmin ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                    <p className="text-sm break-all">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-3 shadow-inner">
            <input 
              type="text" 
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button 
              type="submit"
              disabled={!messageText.trim()}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              Send
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400 text-sm font-medium">
          Select a user to start chatting
        </div>
      )}
    </div>
  );
}
