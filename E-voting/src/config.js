export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000"
    : "https://e-voting-system-o6bd.onrender.com"
);

export const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000/api"
    : "https://e-voting-system-o6bd.onrender.com/api"
);

export const BACKEND_URL = SOCKET_URL;
