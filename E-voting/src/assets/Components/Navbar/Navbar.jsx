import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirect
import { useUserContext } from "../../context/UserContext"; // Import UserContext
import NavbarMain from "../../Login/Navbarmain";
import Login from "../Login/Login"; // Assuming Login component is present

const Navbar = () => {
  const { setUser } = useUserContext(); // Access setUser from context
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate(); // For redirection

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Assume loginRequest is a function to handle login API request
      const response = await loginRequest();
      if (response.status === 200) {
        const userData = response.data;
        setUser(userData); // Set user context
        localStorage.setItem("user", JSON.stringify(userData)); // Save user to localStorage

        console.log("Login successful:", userData);

        // Redirect based on user role (admin or regular user)
        if (userData.role === "admin") {
          navigate("/admin-dashboard"); // Redirect admin to admin dashboard
        } else {
          navigate("/dashboard"); // Redirect regular user to user dashboard
        }

        setIsLoggedIn(true); // Set logged-in state to true
      }
    } catch (error) {
      console.error("Error during authentication:", error);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false); // Set logged-in state to false
    setUser(null); // Clear user context
    localStorage.removeItem("user"); // Remove user from localStorage
    navigate("/login"); // Redirect to login page after logout
  };

  return (
    <div>
      {/* Render Login component if not logged in */}
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <NavbarMain onLogout={handleLogout} />
          <div className="content">
            <p>Welcome to your dashboard!</p>
          </div>
        </>
      )}
    </div>
  );
};

export default Navbar;
