import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/UserContext";
import Login from "../Login/Login";

const Navbar = () => {
  const { setUser } = useUserContext();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await loginRequest();
      if (response.status === 200) {
        const userData = response.data;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));

        if (userData.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/dashboard");
        }

        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("Error during authentication:", error);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className="content">
          <p>Welcome to your dashboard!</p>
        </div>
      )}
    </div>
  );
};

export default Navbar;
