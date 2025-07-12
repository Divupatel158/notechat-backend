require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");

// CORS configuration - allow both 3000 and 3001 for development
app.use(cors({ 
  origin: ["http://localhost:3000", "http://localhost:3010","https://notechat.vercel.app/"], 
  credentials: true 
}));
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/notes", require("./routes/notes"));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
