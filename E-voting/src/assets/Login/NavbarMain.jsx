import React from "react";
import { useUserContext } from "../../Context/UserContext";
import { useNavigate } from "react-router-dom";
import { FaVoteYea, FaSignOutAlt, FaSun, FaMoon } from "react-icons/fa";

const NavbarMain = ({ onLogout }) => {
  const { user, theme, toggleTheme } = useUserContext();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  return (
    <nav className="sticky top-0 z-50 bg-bg/90 backdrop-blur-xl border-b border-border px-6 py-3 transition-colors duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => navigate(isAdmin ? "/admin-dashboard" : "/dashboard")}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FaVoteYea className="text-white text-sm" />
          </div>
          <span className="font-bold text-text text-sm">AcuVote</span>
        </div>

        {/* Nav Links */}
        <ul className="hidden md:flex items-center gap-6">
          <li>
            <button
              onClick={() => navigate(isAdmin ? "/admin-dashboard" : "/dashboard")}
              className="text-text-muted hover:text-text text-sm font-medium transition-colors duration-200 cursor-pointer"
            >
              Dashboard
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("/profile")}
              className="text-text-muted hover:text-text text-sm font-medium transition-colors duration-200 cursor-pointer"
            >
              Profile Settings
            </button>
          </li>
        </ul>

        {/* Right side buttons */}
        <div className="flex items-center gap-4">
          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-surface-2/40 border border-border text-text hover:bg-surface-2 hover:text-primary transition-all duration-200 flex items-center justify-center cursor-pointer"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <FaMoon className="text-sm" /> : <FaSun className="text-sm" />}
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all duration-200 text-sm font-medium cursor-pointer"
            >
              <FaSignOutAlt />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavbarMain;
