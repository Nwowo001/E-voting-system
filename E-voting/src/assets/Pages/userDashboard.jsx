import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ButtonComponent from "../Components/Button/buttonComponent";
import axios from "axios";
import logo from "../../assets/Images/vote-pakistan_1142-4388.jpg";
import "./UserDashboard.css";
import { io } from "socket.io-client";

const API_URL = "http://localhost:5000/api";
const socket = io("http://localhost:5000"); // Initialize socket connection outside the component

const UserDashboard = () => {
  const [elections, setElections] = useState([]);
  const [userVotes, setUserVotes] = useState([]);
  const [stats, setStats] = useState({
    registeredParty: "",
    totalVotes: 0,
    participatedElections: 0,
    lastVoteDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("user"));
        if (userData) {
          setUser(userData);
        }

        await Promise.all([fetchElections(), fetchUserVotes(), fetchStats()]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for election updates via Socket.IO
    socket.on("election_updated", (updatedElection) => {
      setElections((prevElections) =>
        prevElections.map((election) =>
          election.electionid === updatedElection.electionid
            ? updatedElection
            : election
        )
      );
    });

    return () => {
      socket.off("election_updated"); // Clean up event listener
    };
  }, []);

  const fetchElections = async () => {
    try {
      const response = await axios.get(`${API_URL}/elections`, {
        withCredentials: true,
      });
      setElections(response.data);
    } catch (error) {
      console.error("Error fetching elections:", error.message);
    }
  };

  const fetchUserVotes = async () => {
    try {
      const response = await axios.get(`${API_URL}/votes/user`, {
        withCredentials: true,
      });
      setUserVotes(response.data);
    } catch (error) {
      console.error("Error fetching user votes:", error.message);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats`, {
        withCredentials: true,
      });
      setStats({
        registeredParty: response.data.registeredParty || "Not Registered",
        totalVotes: response.data.totalVotes || 0,
        participatedElections: response.data.participatedElections || 0,
        lastVoteDate: response.data.lastVoteDate
          ? new Date(response.data.lastVoteDate).toLocaleDateString()
          : "No votes yet",
      });
    } catch (error) {
      console.error("Error fetching stats:", error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
      localStorage.clear(); // Clear user data from local storage
      navigate("/"); // Redirect to the login page
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  const hasVoted = (electionId) =>
    userVotes.some((vote) => vote.electionid === electionId);

  const calculateTimeRemaining = (endDate) => {
    const diff = new Date(endDate) - new Date();
    if (diff <= 0) return "Election Closed";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}d ${hours}h ${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="E-voting System" />
        </div>
        <div className="user-info">
          <h3>Welcome, {user?.name}</h3>
          <p>{user?.email}</p>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <a href="/elections" className="active">
                Elections
              </a>
            </li>
            <li>
              <a href="/candidates">Candidates</a>
            </li>
            <li>
              <a href="/voting-history">Voting History</a>
            </li>
            <li>
              <a href="/profile">Profile</a>
            </li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-title">
            <h1>Dashboard</h1>
            <p>{new Date().toLocaleDateString()}</p>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <div className="dashboard-grid">
          <section className="election-section">
            <h2>Active Elections</h2>
            <div className="election-grid">
              {elections.map((election) => (
                <div key={election.electionid} className="election-card">
                  <div className="election-status">
                    {hasVoted(election.electionid) ? (
                      <span className="voted-badge">Voted</span>
                    ) : election.isactive ? (
                      <span className="live-badge">Live</span>
                    ) : (
                      <span className="pending-badge">Pending</span>
                    )}
                  </div>

                  <p className="time-remaining">
                    {election.isactive
                      ? calculateTimeRemaining(election.end_date)
                      : "Not started yet"}
                  </p>

                  <h3>{election.title}</h3>
                  <ButtonComponent
                    onClick={() => navigate(`/vote/${election.electionid}`)}
                    disabled={
                      !election.isactive || hasVoted(election.electionid)
                    }
                    className={`vote-btn ${
                      hasVoted(election.electionid) ? "voted" : ""
                    }`}
                  >
                    {hasVoted(election.electionid)
                      ? "Already Voted"
                      : election.isactive
                      ? "Vote Now"
                      : "Pending"}
                  </ButtonComponent>
                </div>
              ))}
            </div>
          </section>

          <section className="stats-section">
            <h2>Voting Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Registered Party</h3>
                <p>{stats.registeredParty}</p>
              </div>
              <div className="stat-card">
                <h3>Total Votes</h3>
                <p>{stats.totalVotes}</p>
              </div>
              <div className="stat-card">
                <h3>Elections Participated</h3>
                <p>{stats.participatedElections}</p>
              </div>
              <div className="stat-card">
                <h3>Last Vote</h3>
                <p>{stats.lastVoteDate}</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
