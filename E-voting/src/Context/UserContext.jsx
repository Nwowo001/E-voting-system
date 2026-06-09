import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config";

const UserContext = createContext(undefined);

let socketInstance = null;

const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
    });
  }
  return socketInstance;
};

export const UserProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [socket] = useState(() => getSocket());
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  const isAdmin = user?.role === "admin";

  // Effect to toggle DOM class list for theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // On mount, restore user from localStorage
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      if (token && userData) {
        const parsed = JSON.parse(userData);
        setUserState(parsed);
      }
    } catch (err) {
      console.error("Error restoring user from localStorage:", err);
      localStorage.clear();
    }
  }, []);

  const setUser = useCallback((userData) => {
    if (userData) {
      // Persist to localStorage
      localStorage.setItem("user", JSON.stringify(userData));
    } else {
      // Clear on logout
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
    setUserState(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUserState(null);
    window.location.href = "/login";
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = {
    user,
    isAdmin,
    socket,
    setUser,
    logout,
    theme,
    toggleTheme,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};

UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
