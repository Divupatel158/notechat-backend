require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");

// CORS configuration - allow both 3000 and 3001 for development
app.use(cors({ 
  origin: ["http://localhost:3000", "http://localhost:3010","https://NoteChat.onrender.com","https://notechat.vercel.app"], 
  credentials: true 
}));
app.use(express.json());

// Health check endpoint for Railway
app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "NoteChat Backend is running",
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/notes", require("./routes/notes"));

const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
