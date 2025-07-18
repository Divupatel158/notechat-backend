require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3010",
      "https://notechat-frontend.vercel.app",
      "https://notechat.vercel.app",
      "https://notechat-divupatel158s-projects.vercel.app"
    ],
    credentials: true
  }
});
const cors = require("cors");
const chatRouter = require('./routes/chat');

// Attach io to app for access in routes
app.set('io', io);

// Socket.IO connection handler
io.on('connection', (socket) => {
  // Listen for join event to join a room by email
  socket.on('join', (email) => {
    if (email) {
      socket.join(email);
      console.log(`Socket ${socket.id} joined room: ${email}`);
    }
  });
});

// CORS configuration - allow both development and production domains
app.use(cors({ 
  origin: [
    "http://localhost:3000", 
    "http://localhost:3010", 
    "https://notechat-frontend.vercel.app",
    "https://notechat.vercel.app",
    "https://notechat-divupatel158s-projects.vercel.app"
  ], 
  credentials: true 
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} from ${req.headers.origin || req.ip}`);
  next();
});

// Health check endpoint for Railway
app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "NoteChat Backend is running",
    timestamp: new Date().toISOString(),
    environment: {
      supabase_url: process.env.SUPABASE_URL ? "Set" : "Missing",
      supabase_key: process.env.SUPABASE_ANON_KEY ? "Set" : "Missing",
      jwt_secret: process.env.JWT_SECRET ? "Set" : "Using default",
      node_env: process.env.NODE_ENV || "Not set"
    }
  });
});

// Debug endpoint to test Supabase connection
app.get("/debug", async (req, res) => {
  try {
    const supabase = require("./supabaseClient");
    if (!supabase) {
      return res.json({ 
        status: "ERROR", 
        message: "Supabase client is null",
        environment: {
          supabase_url: process.env.SUPABASE_URL ? "Set" : "Missing",
          supabase_key: process.env.SUPABASE_ANON_KEY ? "Set" : "Missing"
        }
      });
    }
    
    // Test a simple query
    const { data, error } = await supabase.from("users").select("count").limit(1);
    
    if (error) {
      return res.json({ 
        status: "ERROR", 
        message: "Supabase connection failed",
        error: error.message,
        details: error
      });
    }
    
    res.json({ 
      status: "OK", 
      message: "Supabase connection successful",
      data: data
    });
  } catch (error) {
    res.json({ 
      status: "ERROR", 
      message: "Supabase test failed",
      error: error.message
    });
  }
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/notes", require("./routes/notes"));
app.use('/api/chat', (req, res, next) => {
  req.io = io;
  chatRouter(req, res, next);
});

// Add a catch-all error handler at the end
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ status: 'ERROR', message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
