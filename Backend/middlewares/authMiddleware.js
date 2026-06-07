import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  // Support both Bearer token header (React SPA) and cookie-based auth
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies["authToken"]) {
    token = req.cookies["authToken"];
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired. Please log in again." });
    }
    return res.status(403).json({ message: "Invalid or malformed token." });
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "staff")) {
    return res.status(403).json({ error: "Forbidden: Administrator access is required." });
  }
  next();
};
