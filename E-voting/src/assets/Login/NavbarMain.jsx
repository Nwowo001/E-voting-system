import React from "react";
import { useUserContext } from "../../Context/UserContext"; // Import UserContext
import ButtonComponent from "../Components/Button/buttonComponent";
import logo from "../../assets/Images/vote-pakistan_1142-4388.jpg";
import "./NavbarMain.css";

const NavbarMain = ({ onLogout }) => {
  const { user } = useUserContext(); // Access user context
  const isAdmin = user?.role === "admin"; // Check if the user is an admin

  return (
    <div className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <img src={logo} alt="E-voting" />
        </div>
        <div className="navbar-links">
          <ul>
            <li>
              <a href="/home">Home</a>
            </li>
            <li>
              <a href={isAdmin ? "/admin-dashboard" : "/dashboard"}>
                {isAdmin ? "Admin Dashboard" : "Dashboard"}
              </a>
            </li>
            <li>
              <a href="#">About</a>
            </li>
            <li>
              <a href="#">Contact</a>
            </li>
          </ul>
        </div>
        <div className="navbar-logout">
          <ButtonComponent
            backgroundColor="#201e50"
            fontSize="16px"
            borderRadius="8px"
            color="white"
            border="none"
            margin="0 0 0 25px"
            padding="14px 28.8px"
            cursor="pointer"
            fontFamily="Arial"
            className="Logout"
            onClick={onLogout}
          >
            Logout
          </ButtonComponent>
        </div>
      </div>
    </div>
  );
};

export default NavbarMain;
