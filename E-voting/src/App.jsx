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

const AppContent = () => {
  const { user, setUser } = useUserContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const isAdmin = user?.role === "admin";
  const isLoggedIn = Boolean(user);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate
                to={user?.role === "admin" ? "/admin-dashboard" : "/dashboard"}
              />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            isLoggedIn && user?.role === "admin" ? (
              <AdminDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isLoggedIn && user?.role !== "admin" ? (
              <UserDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route path="/vote/:electionId" element={<ElectionCandidates />} />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};

export default App;
