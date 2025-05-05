import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./assets/Login/Login";
import UserDashboard from "./assets/Pages/userDashboard";
import AdminDashboard from "./assets/Pages/adminDashboard";
import { useUserContext } from "./Context/UserContext";
import ElectionCandidates from "./assets/Components/ElectionCandidates/ElectionCandidates";
import { UserProvider } from "./Context/UserContext";
import Profile from "./assets/Pages/Profile";
import VotingHistory from "./assets/Pages/VotingHistory";
import Candidates from "./assets/Pages/Candidates";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";

const AppContent = () => {
  const { user, setUser } = useUserContext();
  const [loading, setLoading] = useState(true);

  // Load user data from localStorage on app initialization
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      
      console.log("Loading user data from localStorage:", userData);
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        console.log("Parsed user role:", parsedUser.role);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  // Centralized logout function
  const handleLogout = () => {
    console.log("Logging out user");
    
    // Clear localStorage
    localStorage.clear();
    
    // Update context
    setUser(null);
    
    // Force a complete page reload to ensure clean state
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Check if user is admin
  const isAdmin = user?.role === "admin";
  console.log("Current user role:", user?.role);
  console.log("Is admin?", isAdmin);
  
  const isLoggedIn = Boolean(user);

  return (
    <Router>
      <Routes>
        {/* Root route - redirects based on auth status and role */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate to={isAdmin ? "/admin-dashboard" : "/dashboard"} />
            ) : (
              <Login />
            )
          }
        />
        
        {/* Login route */}
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to={isAdmin ? "/admin-dashboard" : "/dashboard"} />
            ) : (
              <Login />
            )
          }
        />
        
        {/* Admin Dashboard - protected */}
        <Route
          path="/admin-dashboard"
          element={
            isLoggedIn && isAdmin ? (
              <AdminDashboard onLogout={handleLogout} />
            ) : isLoggedIn ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        {/* User Dashboard - protected */}
        <Route
          path="/dashboard"
          element={
            isLoggedIn ? (
              <UserDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        {/* Voting route */}
        <Route 
          path="/vote/:electionId" 
          element={
            isLoggedIn ? (
              <ElectionCandidates />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        
        {/* Other protected routes */}
        <Route
          path="/candidates"
          element={isLoggedIn ? <Candidates /> : <Navigate to="/login" />}
        />
        <Route
          path="/voting-history"
          element={isLoggedIn ? <VotingHistory /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={isLoggedIn ? <Profile /> : <Navigate to="/login" />}
        />
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <UserProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppContent />
      </ThemeProvider>
    </UserProvider>
  );
};

export default App;
