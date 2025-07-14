require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const chatRouter = require('./routes/chat');

// CORS configuration - allow both development and production domains
app.use(cors({ 
  origin: [
    "http://localhost:3000", 
    "http://localhost:3010", 
    "https://notechat-frontend.vercel.app",
    "https://notechat.vercel.app"
  ], 
  credentials: true 
}));
app.use(express.json());

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
app.use('/api/chat', chatRouter);

const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
