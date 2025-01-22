import React, { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import ButtonComponent from "../Components/Button/buttonComponent";
import { useUserContext } from "../../Context/UserContext";
import axios from "axios";
import logo from "../../assets/Images/vote-pakistan_1142-4388.jpg";
import "./UserDashboard.css";

const UserDashboard = ({ onLogout }) => {
  const { user, socket } = useUserContext(); // Access user and socket from context
  const navigate = useNavigate();

  const [elections, setElections] = useState([]);
  const [stats, setStats] = useState({
    registeredParty: "",
    totalVotes: 0,
  });

  useEffect(() => {
    fetchElections();

    socket.on("election_created", (newElection) => {
      setElections((prev) => [...prev, newElection]);
    });

    return () => socket.off("election_created");
  }, [socket]);

  const fetchElections = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/elections");
      setElections(response.data);
    } catch (err) {
      console.error("Error fetching elections", err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token is missing.");
      }

      const response = await fetch("http://localhost:5000/api/stats", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 403) {
        throw new Error("Access denied. Admin access is required.");
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data); // Set the stats data
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate("/"); // Redirect to sign-in page after logout
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (!user) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar Section */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="E-voting System" />
        </div>
        <ul>
          <li>
            <NavLink to="/elections">Elections</NavLink>
          </li>
          <li>
            <NavLink to="/candidates">Candidates</NavLink>
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="user-dashboard">
        <header className="dashboard-header">
          <h1>Welcome, {user.name}!</h1>
          <ButtonComponent onClick={handleLogout}>Logout</ButtonComponent>
        </header>

        <section className="election-section">
          <h2>Available Elections</h2>
          <div className="elections-list">
            {elections.map((election) => (
              <div className="election" key={election.electionid}>
                {" "}
                {/* Use election_id instead of id */}
                <h3>{election.title}</h3>
                <p>{election.date}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="stats-section">
          <h2>Election Stats</h2>
          <p>Registered Party: {stats.registeredParty}</p>
          <p>Total Votes: {stats.totalVotes}</p>
        </section>
      </main>
    </div>
  );
};

export default UserDashboard;
