import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

// Import Routes
import candidateRoutes from "./routes/candidateRoutes.js";
import electionRoutes from "./routes/electionRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import statsRoutes from "./routes/statsRoute.js";
import votersRoutes from "./routes/votersRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("Error: JWT_SECRET is not defined in .env file.");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on("vote_cast", async (data) => {
    try {
      const result = await recordVote(data);
      io.emit("vote_updated", result);
    } catch (error) {
      socket.emit("vote_error", error.message);
    }
  });
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/api/candidates", candidateRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/voters", votersRoutes);
app.use("/api/auth", adminRoutes);

// Default Route
app.get("/", (req, res) => {
  res.send("E-voting backend is running.");
});

// Start Server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Error Handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason, promise);
});
