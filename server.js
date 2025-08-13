const express = require("express");
const http = require("http"); 
const socketIo = require("socket.io"); 
const dotenv = require("dotenv");
const cors = require("cors");
const fs = require('fs'); // Add this import at the top
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

if (!fs.existsSync('uploads/assignments')) {
  fs.mkdirSync('uploads/assignments', { recursive: true });
}

const app = express();
const server = http.createServer(app); 

// ⬅️ Setup Socket.IO
const io = socketIo(server, {
  cors: {
    origin: [
      "https://online-tutor-frontend-gamma.vercel.app",
    ],
    methods: ["GET", "POST"]
  }
});

// ⬅️ IMPORTANT: Update CORS to match Socket.IO origin
app.use(cors({
  origin: [
    "https://online-tutor-frontend-gamma.vercel.app", 
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

// Middleware to parse JSON
app.use(express.json());

// Sample route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ⬅️ Make io accessible to routes
app.set('io', io);

// Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api", authRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

const studentRoutes = require("./routes/studentRoutes");
app.use('/api/student', studentRoutes);

const teacherRoutes = require('./routes/teacherRoutes');
app.use('/api/teacher', teacherRoutes);

const LoginRoute = require('./routes/LoginRoute');
app.use('/api/auth', LoginRoute);

const subjectRoutes = require('./routes/subjectRoutes');
app.use('/api/subjects', subjectRoutes);

const queryRoutes = require('./routes/queryRoutes');
app.use('/api/queries', queryRoutes);

const assignmentRoutes = require('./routes/assignmentRoutes');
app.use('/api/assignments', assignmentRoutes);

// ⬅️ Add live class routes
const liveClassRoutes = require('./routes/liveClassRoutes');
app.use('/api/live-classes', liveClassRoutes);

app.use("/uploads", express.static("uploads"));

// ⬅️ Socket.IO connection handling
const socketHandler = require('./socket/socketHandler');
socketHandler(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => { 
  console.log(`Server running on port ${PORT}`);
});
