import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import { io } from "socket.io-client";

const UserContext = createContext(undefined);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null); // WebSocket state

  const isAdmin = user?.role === "admin";

  // Helper function to retrieve a token from cookies
  const getCookie = (name) => {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
  };

  // Fetch user data based on the token in the cookie
  const fetchUserFromToken = useCallback(async () => {
    try {
      const token = getCookie("authToken"); // Retrieve the token from cookies
      if (!token) return;

      const response = await fetch("http://localhost:5000/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensure cookies are sent with the request
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);

        // Establish WebSocket connection if authenticated
        const newSocket = io("http://localhost:5000", {
          transports: ["websocket", "polling"],
          reconnection: true,
        });
        setSocket(newSocket);
      } else {
        console.error("Failed to authenticate user");
        setUser(null);
      }
    } catch (err) {
      console.error("Error fetching user from token:", err);
      setUser(null);
    }
  }, []);

  const setUserAndPersist = useCallback((userData) => {
    if (userData) {
      document.cookie = `authToken=${encodeURIComponent(
        userData.token
      )}; path=/; Secure; HttpOnly; SameSite=lax`;

      // Establish WebSocket connection
      const newSocket = io("http://localhost:5000", {
        transports: ["websocket", "polling"],
        reconnection: true,
      });
      setSocket(newSocket);
    } else {
      document.cookie =
        "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"; // Clear cookie
      setSocket(null); // Disconnect the WebSocket
    }
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    document.cookie =
      "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"; // Clear cookie
    setUser(null);
    if (socket) {
      socket.disconnect(); // Disconnect the WebSocket on logout
    }
  }, [socket]);

  const value = {
    user,
    isAdmin,
    socket, // Expose the socket to the app
    setUser: setUserAndPersist,
    logout,
  };

  useEffect(() => {
    fetchUserFromToken(); // Fetch user data on initial load
    return () => {
      if (socket) {
        socket.disconnect(); // Clean up the WebSocket connection
      }
    };
  }, [fetchUserFromToken, socket]);

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
