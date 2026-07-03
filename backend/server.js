const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars FIRST
dotenv.config({ path: __dirname + "/.env" });

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const reviewRoutes = require('./routes/reviews');
const http = require('http');
const { Server } = require('socket.io');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/support', require('./routes/support'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);

// Simple test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// Setup Socket.io for Real-time chat
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
app.set('io', io);

const Message = require('./models/Message');
const SupportMessage = require('./models/SupportMessage');
const User = require('./models/User');
const Violation = require('./models/Violation');
const { encrypt, decrypt } = require('./utils/crypto');
const { sendEmail, sendProfessionalEmail } = require('./utils/email');

// Regex to detect personal details
const { detectPersonalInfo } = require('./utils/detectPersonalInfo');

// After this many blocked attempts, the user is auto-flagged for admin review
const VIOLATION_FLAG_THRESHOLD = 5;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Join a general updates room for a specific user (Dashboard refresh)
  socket.on('join_updates', (data) => {
    if (data && data.userId) {
      socket.join(`updates_${data.userId}`);
      console.log(`User ${data.userId} joined global updates room`);
    }
  });

  // Join a room based on Job ID
  socket.on('join_room', async (data) => {
    const roomName = typeof data === 'string' ? data : data.roomName;
    socket.join(roomName);
    console.log(`User joined room: ${roomName}`);

    // Mark messages received by the user joining as read in DB and inform others
    if (typeof data === 'object' && data.userId && data.jobId) {
      try {
        await Message.updateMany(
          { job: data.jobId, receiver: data.userId, isRead: false },
          { $set: { isRead: true } }
        );
        socket.to(roomName).emit('messages_marked_read', { userId: data.userId });
      } catch (err) {
        console.error('Error marking messages read on join:', err);
      }
    }
  });

  socket.on('typing', (data) => {
    // data expected: { roomName, username }
    socket.to(data.roomName).emit('user_typing', { username: data.username });
  });

  socket.on('stop_typing', (data) => {
    // data expected: { roomName, username }
    socket.to(data.roomName).emit('user_stopped_typing', { username: data.username });
  });

  socket.on('mark_read', async (data) => {
    // data expected: { roomName, userId, jobId }
    const { roomName, userId, jobId } = data;
    try {
      await Message.updateMany(
        { job: jobId, receiver: userId, isRead: false },
        { $set: { isRead: true } }
      );
      socket.to(roomName).emit('messages_marked_read', { userId });
    } catch (err) {
      console.error('Error marking messages read via sockets:', err);
    }
  });

  socket.on('send_message', async (data) => {
    // data expected: { senderId, receiverId, jobId, content, roomName }
    const { senderId, receiverId, jobId, content, roomName } = data;

    // Concatenate recent messages from the same sender to catch split evasion (e.g. sending 5 digits per message)
    let textToAnalyze = content;
    try {
      const recentMessages = await Message.find({ sender: senderId, job: jobId })
        .sort({ createdAt: -1 })
        .limit(4);
      const recentText = recentMessages.reverse().map(m => decrypt(m.content)).join(' ');
      textToAnalyze = recentText + ' ' + content;
    } catch (err) {
      console.error('Error fetching recent messages for filter:', err);
    }

    // Block (do not deliver) any message that shares personal contact / payment details
    const { flagged, types } = detectPersonalInfo(textToAnalyze);

    if (flagged) {
      // Log the violation with the original (encrypted) message for admin review
      try {
        await Violation.create({
          sender: senderId,
          receiver: receiverId,
          job: jobId,
          originalMessage: encrypt(content),
          violationType: types.join(', ')
        });
      } catch (err) {
        console.error('Error logging safety violation:', err);
      }

      // Track repeat offenders and auto-flag for admin review
      try {
        const updated = await User.findByIdAndUpdate(
          senderId,
          { $inc: { violationCount: 1 } },
          { new: true }
        );
        if (updated && updated.violationCount >= VIOLATION_FLAG_THRESHOLD && !updated.isFlagged) {
          updated.isFlagged = true;
          await updated.save();
        }
      } catch (err) {
        console.error('Error updating violation count:', err);
      }

      // Tell the sender the message was blocked; nothing is stored or broadcast
      socket.emit('message_blocked', {
        message: 'Message blocked: sharing contact or payment details (phone, email, UPI, social handles) is not allowed. This attempt has been logged.',
        types
      });
      return;
    }

    const displayContent = content;

    // Check if receiver is in the room
    const roomClients = io.sockets.adapter.rooms.get(roomName || jobId);
    const isReadImmediately = roomClients && roomClients.size >= 2;

    const encryptedContent = encrypt(displayContent);

    try {
      const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        job: jobId,
        content: encryptedContent,
        isRead: isReadImmediately
      });

      // Broadcast to room
      io.to(roomName || jobId).emit('receive_message', {
        _id: message._id,
        sender: senderId,
        receiver: receiverId,
        job: jobId,
        content: displayContent,
        isRead: isReadImmediately,
        createdAt: message.createdAt
      });

      if (!isReadImmediately) {
        // Receiver is likely offline, send email notification
        const receiver = await User.findById(receiverId);
        if (receiver && receiver.email) {
          sendProfessionalEmail(
            receiver.email,
            'New Message on WorkSphere',
            'New Message Received',
            `<p>You have received a new secure message.</p>
             <div style="margin-top: 25px;">
               <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Reply</a>
             </div>`
          );
        }
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('mark_support_read', async (data) => {
    // data expected: { roomName, userId, isFromAdmin }
    const { roomName, userId, isFromAdmin } = data;
    try {
      await SupportMessage.updateMany(
        { user: userId, senderModel: isFromAdmin ? 'User' : 'Admin', isRead: false },
        { $set: { isRead: true } }
      );
      socket.to(roomName).emit('support_messages_marked_read', { userId });
    } catch (err) {
      console.error('Error marking support messages read:', err);
    }
  });

  socket.on('send_support_message', async (data) => {
    // data expected: { userId, senderModel, content, roomName }
    const { userId, senderModel, content, roomName } = data;

    const encryptedContent = encrypt(content);
    const roomClients = io.sockets.adapter.rooms.get(roomName);
    const isReadImmediately = roomClients && roomClients.size >= 2;

    try {
      const message = await SupportMessage.create({
        user: userId,
        senderModel,
        content: encryptedContent,
        isRead: isReadImmediately
      });

      io.to(roomName).emit('receive_support_message', {
        _id: message._id,
        user: userId,
        senderModel,
        content: content,
        isRead: isReadImmediately,
        createdAt: message.createdAt
      });
    } catch (err) {
      console.error('Error saving support message:', err);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
