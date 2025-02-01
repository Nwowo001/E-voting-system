import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ButtonComponent from "../Components/Button/buttonComponent";
import axios from "axios";
import logo from "../../assets/Images/vote-pakistan_1142-4388.jpg";
import "./UserDashboard.css";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";
import { useUserContext } from "../../Context/UserContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = "http://localhost:5000/api";
const socket = io("http://localhost:5000");

const LiveBadge = () => (
  <span className="live-badge">
    <span className="live-dot"></span>
    LIVE
  </span>
);

const UserDashboard = () => {
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [availableElections, setAvailableElections] = useState([]);
  const [elections, setElections] = useState({ active: [], upcoming: [] });
  const [userVotes, setUserVotes] = useState([]);
  const [stats, setStats] = useState({
    totalVotes: 0,
    totalVoterTurnout: 0,
    totalCandidates: 0,
    activeVoters: 0,
  });
  const [activeSection, setActiveSection] = useState("election");
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [activeElectionStats, setActiveElectionStats] = useState({
    candidates: [],
    totalVotes: 0,
    electionId: null,
    electionTitle: "",
    voterTurnout: 0,
    totalCandidates: 0,
    activeVoters: 0,
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const navigation = [
    { name: "election", path: "/dashboard", icon: "🏠" },
    { name: "candidates", path: "/candidates", icon: "👥" },
    { name: "voting history", path: "/voting-history", icon: "📜" },
    { name: "profile", path: "/profile", icon: "👤" },
  ];

  const renderLiveResultsSection = () => (
    <div className="live-results-section">
      <div className="election-dropdown">
        <select
          value={selectedElectionId || ""}
          onChange={handleElectionChange}
          className="w-full md:w-64 p-2 border rounded-lg bg-white shadow-sm"
        >
          <option value="">Select an election</option>
          {availableElections.map((election) => (
            <option key={election.electionid} value={election.electionid}>
              {election.title}
            </option>
          ))}
        </select>
      </div>

      {isStatsLoading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading election stats...</p>
        </div>
      ) : selectedElectionId ? (
        <>
          <h3>
            Election Results: {activeElectionStats.electionTitle}
            {elections.active.some(
              (e) => e.electionid === selectedElectionId
            ) && <LiveBadge />}
          </h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <h3>Total Votes</h3>
              </div>
              <p>{activeElectionStats.totalVotes}</p>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <h3>Voter Turnout</h3>
              </div>
              <p>{activeElectionStats.voterTurnout}%</p>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <h3>Total Candidates</h3>
              </div>
              <p>{activeElectionStats.totalCandidates}</p>
            </div>
          </div>
          <div className="chart-container" style={{ height: "400px" }}>
            {activeElectionStats.candidates.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeElectionStats.candidates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis />
                  <Tooltip
                    content={({ payload, label }) => {
                      if (payload && payload.length) {
                        return (
                          <div className="custom-tooltip">
                            <p>{`${label} (${payload[0]?.payload.party})`}</p>
                            <p>{`Votes: ${payload[0]?.value}`}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="votes" fill="#8884d8" animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>No candidate data available for this election</p>
            )}
          </div>
        </>
      ) : (
        <p>Please select an election to view statistics</p>
      )}
    </div>
  );

  useEffect(() => {
    if (user) {
      setWelcomeVisible(true);
      const timer = setTimeout(() => {
        setWelcomeVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    fetchAvailableElections();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("stats_update", (newStats) => {
        setStats((prev) => ({
          ...prev,
          ...newStats,
        }));
      });

      socket.on("active_voters_update", (count) => {
        setStats((prev) => ({
          ...prev,
          activeVoters: count,
        }));
      });

      return () => {
        socket.off("stats_update");
        socket.off("active_voters_update");
      };
    }
  }, [socket]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("user"));
        if (userData) {
          setUser(userData);
        }
        await Promise.all([
          fetchElections(),
          fetchUserVotes(),
          fetchStats(),
          fetchActiveElectionStats(),
        ]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
    socket.on("election_updated", handleElectionUpdate);
    socket.on("vote_cast", handleVoteUpdate);
    socket.on("election_started", handleElectionStart);
    socket.on("election_ended", handleElectionEnd);

    return () => {
      socket.off("connect_error");
      socket.off("election_updated");
      socket.off("vote_cast");
      socket.off("election_started");
      socket.off("election_ended");
    };
  }, []);

  const handleElectionChange = (event) => {
    const electionId = event.target.value;
    setSelectedElectionId(electionId);
    fetchElectionStats(electionId);
  };

  const fetchElections = async () => {
    try {
      const response = await axios.get(`${API_URL}/elections`, {
        withCredentials: true,
      });
      const allElections = response.data;
      const now = new Date();

      setElections({
        active: allElections.filter(
          (election) => election.isactive && new Date(election.end_date) > now
        ),
        upcoming: allElections.filter(
          (election) =>
            !election.isactive && new Date(election.start_date) > now
        ),
      });
    } catch (error) {
      console.error("Error fetching elections:", error.message);
    }
  };

  const fetchElectionStats = async (electionId) => {
    setIsStatsLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/stats/elections/${electionId}/stats`,
        {
          withCredentials: true,
        }
      );

      const { candidates, totalVotes, title, voterTurnout } = response.data;
      setActiveElectionStats({
        candidates: candidates.map((c) => ({
          name: c.name,
          votes: c.voteCount || 0,
          party: c.party,
        })),
        totalVotes,
        electionId: electionId,
        electionTitle: title,
        voterTurnout: voterTurnout || 0,
        totalCandidates: candidates.length,
      });
    } catch (error) {
      console.error("Error fetching election stats:", error);
      setActiveElectionStats({
        candidates: [],
        totalVotes: 0,
        electionId: null,
        electionTitle: "",
        voterTurnout: 0,
        totalCandidates: 0,
      });
    } finally {
      setIsStatsLoading(false);
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
        ...response.data,
        activeVoters: response.data.activeVoters || 0,
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

  const handleElectionUpdate = (updatedElection) => {
    setElections((prev) => {
      const newState = { ...prev };
      if (updatedElection.isactive) {
        newState.active = [updatedElection];
        newState.upcoming = prev.upcoming.filter(
          (e) => e.electionid !== updatedElection.electionid
        );
      } else {
        newState.upcoming = prev.upcoming.map((election) =>
          election.electionid === updatedElection.electionid
            ? updatedElection
            : election
        );
      }
      return newState;
    });
  };
  const fetchActiveElectionStats = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/stats/elections/active/stats`,
        {
          withCredentials: true,
        }
      );

      const activeStats = response.data[0] || {};
      setActiveElectionStats({
        candidates: activeStats.candidates || [],
        totalVotes: activeStats.total_votes || 0,
        electionId: activeStats.electionid,
        electionTitle: activeStats.title || "",
        voterTurnout: activeStats.voter_turnout || 0,
        totalCandidates: activeStats.candidate_count || 0,
        activeVoters: activeStats.voter_count || 0,
      });
    } catch (error) {
      console.error("Error fetching active election stats:", error);
      setActiveElectionStats({
        candidates: [],
        totalVotes: 0,
        electionId: null,
        electionTitle: "",
        voterTurnout: 0,
        totalCandidates: 0,
        activeVoters: 0,
      });
    }
  };

  const handleVoteUpdate = async (voteData) => {
    if (voteData.electionId === activeElectionStats.electionId) {
      await fetchActiveElectionStats();
    }
  };

  const handleElectionStart = async (election) => {
    setElections((prev) => ({
      active: [election],
      upcoming: prev.upcoming.filter(
        (e) => e.electionid !== election.electionid
      ),
    }));
    await fetchActiveElectionStats();
  };

  const handleElectionEnd = async (electionId) => {
    setElections((prev) => ({
      active: [],
      upcoming: prev.upcoming.filter((e) => e.electionid !== electionId),
    }));
    setActiveElectionStats({
      candidates: [],
      totalVotes: 0,
      electionId: null,
      electionTitle: "",
    });
  };

  const fetchAvailableElections = async () => {
    try {
      const response = await axios.get(`${API_URL}/elections/all`, {
        withCredentials: true,
      });
      setAvailableElections(response.data);
      if (!selectedElectionId && response.data.length > 0) {
        setSelectedElectionId(response.data[0].electionid);
        fetchElectionStats(response.data[0].electionid);
      }
    } catch (error) {
      console.error("Error fetching available elections:", error);
    }
  };

  const handleLogout = async () => {
    console.log("Starting logout process...");
    try {
      setLoading(true);
      console.log("Making logout API call...");

      // First clear all states and storage
      setUser(null);
      setElections({ active: [], upcoming: [] });
      setUserVotes([]);
      setStats({
        totalVotes: 0,
        totalVoterTurnout: 0,
        totalCandidates: 0,
        activeVoters: 0,
      });

      // Disconnect socket
      if (socket) {
        socket.disconnect();
        console.log("Socket disconnected");
      }

      // Clear local storage
      localStorage.clear();
      console.log("Local storage cleared");

      // Make the API call
      const response = await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          withCredentials: true,
          // Add timeout to prevent hanging
          timeout: 5000,
        }
      );
      console.log("Logout API response:", response);

      // Small delay to ensure state updates are processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Use window.location for a full page refresh and redirect
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error details:", error);

      // Clear everything even if API call fails
      localStorage.clear();
      setUser(null);

      // Force a page refresh and redirect
      window.location.href = "/";
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

  const handleVoteClick = (electionId) => {
    if (!hasVoted(electionId)) {
      navigate(`/vote/${electionId}`);
    }
  };

  const renderElectionSection = (elections, title, isUpcoming = false) => (
    <section className="election-section">
      <h2>
        {title}
        {!isUpcoming && elections.length > 0 && <LiveBadge />}
      </h2>
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
                : `Starts: ${new Date(
                    election.start_date
                  ).toLocaleDateString()}`}
            </p>
            <h3>{election.title}</h3>
            <ButtonComponent
              onClick={() => handleVoteClick(election.electionid)}
              disabled={!election.isactive || hasVoted(election.electionid)}
              className={`vote-btn ${
                hasVoted(election.electionid) ? "voted disabled" : ""
              }`}
            >
              {hasVoted(election.electionid) ? (
                <>
                  <span style={{ marginRight: "5px" }}>⛔</span>
                  Already Voted
                </>
              ) : election.isactive ? (
                "Vote Now"
              ) : (
                "Upcoming"
              )}
            </ButtonComponent>
          </div>
        ))}
      </div>
    </section>
  );

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
      {welcomeVisible && (
        <div className="welcome-overlay">
          <h1>Welcome, {user?.name}! 👋</h1>
        </div>
      )}
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
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={activeSection === item.name ? "active" : ""}
                  onClick={() => setActiveSection(item.name)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                </Link>
              </li>
            ))}
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
          {renderElectionSection(elections.active, "Active Election")}
          {renderElectionSection(
            elections.upcoming,
            "Upcoming Elections",
            true
          )}
          <section className="stats-section">
            <h2>Live Election Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Election Name</h3>
                <p>
                  {activeElectionStats.electionTitle || "No Active Election"}
                </p>
              </div>
              <div className="stat-card">
                <h3>Total Votes Cast</h3>
                <p>{stats.totalVotes}</p>
              </div>
              <div className="stat-card">
                <h3>Voter Turnout</h3>
                <p>{stats.totalVoterTurnout}%</p>
              </div>
              <div className="stat-card">
                <h3>Total Candidates</h3>
                <p>{stats.totalCandidates}</p>
              </div>
              <div className="stat-card">
                <h3>Active Voters</h3>
                <p>
                  {stats.activeVoters} <LiveBadge />
                </p>
              </div>
              <div className="stat-card">
                <h3>Active Election</h3>
                <p>{activeElectionStats.electionTitle || "None"}</p>
              </div>
            </div>
          </section>
        </div>
        {renderLiveResultsSection()}
      </main>
    </div>
  );
};

export default UserDashboard;
