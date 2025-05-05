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
// Import React Icons
import {
  FaHome,
  FaUsers,
  FaHistory,
  FaUser,
  FaSignOutAlt,
  FaChartBar,
  FaVoteYea,
  FaCalendarAlt,
  FaUserCheck,
  FaChartPie,
  FaChartLine,
  FaBars,
  FaTimes,
  FaCircle
} from "react-icons/fa";

const API_URL = "http://localhost:5000/api";
const socket = io("http://localhost:5000");

const LiveBadge = () => (
  <span className="live-badge">
    <FaCircle className="live-dot" />
    LIVE
  </span>
);

const EndedBadge = () => (
  <span className="ended-badge">
    ENDED
  </span>
);

const UserDashboard = () => {
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [availableElections, setAvailableElections] = useState([]);
  const [elections, setElections] = useState({ active: [], upcoming: [], ended: [] });
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  
  // Use the UserContext properly
  const { user } = useUserContext();
  
  // Updated navigation with React Icons
  const navigation = [
    { name: "election", path: "/dashboard", icon: <FaHome /> },
    { name: "candidates", path: "/candidates", icon: <FaUsers /> },
    { name: "voting history", path: "/voting-history", icon: <FaHistory /> },
    { name: "profile", path: "/profile", icon: <FaUser /> },
  ];

  // Function to check if an election has ended
  const hasElectionEnded = (election) => {
    if (!election) return false;
    const now = new Date();
    const endDate = new Date(election.end_date);
    return now > endDate;
  };

  // Function to check if an election is active but not ended
  const isElectionLive = (election) => {
    if (!election) return false;
    return election.isactive && !hasElectionEnded(election);
  };

  // Fix the welcome message effect - make it non-blocking
// Update the welcome message useEffect to make it non-blocking
useEffect(() => {
  // Check if this is the first visit after login
  const hasShownWelcome = sessionStorage.getItem('welcomeShown');
  
  if (user && !hasShownWelcome) {
    setWelcomeVisible(true);
    // Set flag in sessionStorage to prevent showing welcome again on refresh
    sessionStorage.setItem('welcomeShown', 'true');
    
    const timer = setTimeout(() => {
      setWelcomeVisible(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }
}, [user]);


  // Add this useEffect to check for elections that have ended
  useEffect(() => {
    const checkForEndedElections = () => {
      const now = new Date();
      
      // Check if any active elections have ended
      elections.active.forEach(election => {
        const endDate = new Date(election.end_date);
        if (now > endDate) {
          handleElectionEnd(election.electionid);
        }
      });
    };
    
    // Run the check immediately
    checkForEndedElections();
    
    // Set up an interval to check every minute
    const interval = setInterval(checkForEndedElections, 60000);
    
    return () => clearInterval(interval);
  }, [elections.active]);

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
  }, []);

  // Fix the data fetching useEffect
  useEffect(() => {
    const fetchData = async () => {
      try {
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
    
    // Add proper socket event listeners
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
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/elections`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
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
        ended: allElections.filter(
          (election) => new Date(election.end_date) <= now
        ),
      });
    } catch (error) {
      console.error("Error fetching elections:", error.message);
    }
  };

  const fetchElectionStats = async (electionId) => {
    setIsStatsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/stats/elections/${electionId}/stats`,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
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
      // Add token to the request header
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/votes/user`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserVotes(response.data);
    } catch (error) {
      console.error("Error fetching user votes:", error.message);
    }
  };

  const fetchStats = async () => {
    try {
      // Add token to the request header
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/stats`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
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
      // Add token to the request header
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/stats/elections/active/stats`,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
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
      ended: prev.ended
    }));
    await fetchActiveElectionStats();
  };

  const handleElectionEnd = async (electionId) => {
    setElections((prev) => {
      const endedElection = prev.active.find(e => e.electionid === electionId);
      return {
        active: prev.active.filter((e) => e.electionid !== electionId),
        upcoming: prev.upcoming.filter((e) => e.electionid !== electionId),
        ended: endedElection ? [...prev.ended, endedElection] : prev.ended
      };
    });
    
    // If the currently selected election has ended, update the stats
    if (selectedElectionId === electionId) {
      setActiveElectionStats({
        ...activeElectionStats,
        electionEnded: true
      });
    }
  };

  const fetchAvailableElections = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/elections/all`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
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
      setElections({ active: [], upcoming: [], ended: [] });
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

      // Clear local storage and session storage
      localStorage.clear();
      sessionStorage.clear();
      console.log("Local storage cleared");

      // Make the API call
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
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
      sessionStorage.clear();

      // Force a page refresh and redirect
      window.location.href = "/";
    }
  };

  const hasVoted = (electionId) =>
    userVotes.some((vote) => vote.electionid === electionId);

  const calculateTimeRemaining = (endDate) => {
    const diff = new Date(endDate) - new Date();
    if (diff <= 0) return "Election Ended";

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

  const renderElectionSection = (elections, title, isUpcoming = false, isEnded = false) => (
    <section className="election-section">
      <div className="section-header">
        <h2>
          {isUpcoming ? <FaCalendarAlt className="section-icon" /> : 
           isEnded ? <FaHistory className="section-icon" /> : 
           <FaVoteYea className="section-icon" />}
          {title}
          {!isUpcoming && !isEnded && elections.length > 0 && <LiveBadge />}
        </h2>
      </div>
      
      {elections.length > 0 ? (
        <div className="election-grid">
          {elections.map((election) => (
            <div key={election.electionid} className="election-card">
              <div className="election-status">
                {hasVoted(election.electionid) ? (
                  <span className="voted-badge">Voted</span>
                ) : isEnded ? (
                  <EndedBadge />
                ) : election.isactive && !hasElectionEnded(election) ? (
                  <LiveBadge />
                ) : (
                  <span className="pending-badge">Pending</span>
                )}
              </div>
              <p className="time-remaining">
                {isEnded ? 
                  `Ended: ${new Date(election.end_date).toLocaleDateString()}` :
                  election.isactive && !hasElectionEnded(election) ?
                    calculateTimeRemaining(election.end_date) :
                    `Starts: ${new Date(election.start_date).toLocaleDateString()}`
                }
              </p>
              <h3 className="election-card-title">{election.title}</h3>
              {/* Only render clickable button for active elections that haven't ended */}
              {!isUpcoming && !isEnded ? (
                <ButtonComponent
                  onClick={() => handleVoteClick(election.electionid)}
                  disabled={!election.isactive || hasVoted(election.electionid) || hasElectionEnded(election)}
                  className={`vote-btn ${
                    hasVoted(election.electionid) || hasElectionEnded(election) ? "voted disabled" : ""
                  }`}
                >
                  {hasVoted(election.electionid) ? (
                    <>
                      <span style={{ marginRight: "5px" }}>⛔</span>
                      Already Voted
                    </>
                  ) : hasElectionEnded(election) ? (
                    "Election Ended"
                  ) : election.isactive ? (
                    "Vote Now"
                  ) : (
                    "Upcoming"
                  )}
                </ButtonComponent>
              ) : (
                /* For upcoming and ended elections, render a non-clickable div that looks like a button */
                <div className="vote-btn disabled non-interactive">
                  {isEnded ? "Election Ended" : "Upcoming Election"}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-elections-message">
          <p>No {isEnded ? "completed" : isUpcoming ? "upcoming" : "active"} elections at this time.</p>
        </div>
      )}
    </section>
  );
  

  const renderLiveResultsSection = () => (
    <div className="live-results-section">
      <div className="section-header">
        <h2>
          <FaChartBar className="section-icon" />
          Election Results
        </h2>
      </div>
      <div className="election-dropdown">
        <select
          value={selectedElectionId || ""}
          onChange={handleElectionChange}
          className="election-select"
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
          <h3 className="election-title">
            {activeElectionStats.electionTitle}
            {elections.active.some(e => e.electionid === selectedElectionId) ? (
              <LiveBadge />
            ) : elections.ended.some(e => e.electionid === selectedElectionId) ? (
              <EndedBadge />
            ) : null}
          </h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FaVoteYea />
              </div>
              <div className="stat-content">
                <h3>Total Votes</h3>
                <p>{activeElectionStats.totalVotes}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <FaUserCheck />
              </div>
              <div className="stat-content">
                <h3>Voter Turnout</h3>
                <p>{activeElectionStats.voterTurnout}%</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <FaUsers />
              </div>
              <div className="stat-content">
                <h3>Total Candidates</h3>
                <p>{activeElectionStats.totalCandidates}</p>
              </div>
            </div>
          </div>
          <div className="chart-container">
            {activeElectionStats.candidates.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={activeElectionStats.candidates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 12 }}
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
                  <Bar dataKey="votes" fill="#3498db" animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="no-data-message">No candidate data available for this election</p>
            )}
          </div>
        </>
      ) : (
        <p className="select-message">Please select an election to view statistics</p>
      )}
    </div>
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
      
      {/* Mobile Header - Only visible on small screens */}
      <div className="mobile-header">
        <button 
          className="menu-toggle" 
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <FaBars />
        </button>
        <h1>E-Voting Dashboard</h1>
        <button 
          className="mobile-logout" 
          onClick={handleLogout}
          aria-label="Logout"
        >
          <FaSignOutAlt />
        </button>
      </div>
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}
      
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2>E-Voting System</h2>
          <button 
            className="close-menu" 
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* // Find the sidebar-logo section in userDashboard.jsx and replace it with: */}

<div className="sidebar-logo">
  {user?.profileImage ? (
    <img 
      src={user.profileImage} 
      alt="Profile" 
      className="user-profile-image" 
      onError={(e) => {
        // Fallback to logo if profile image fails to load
        e.target.src = logo;
        e.target.onerror = null;
      }}
    />
  ) : (
    <img src={logo} alt="E-voting System" />
  )}
</div>

        
        <div className="user-info">
          <h3>{user?.name}</h3>
          <p>{user?.email}</p>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={activeSection === item.name ? "active" : ""}
                  onClick={() => {
                    setActiveSection(item.name);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-title">
            <h1>Dashboard</h1>
            <p>{new Date().toLocaleDateString()}</p>
          </div>
          <button className="logout-button desktop-only" onClick={handleLogout}>
            <FaSignOutAlt className="logout-icon" />
            <span>Logout</span>
          </button>
        </header>

        <div className="dashboard-content">
          {renderElectionSection(elections.active, "Active Election")}
          {renderElectionSection(elections.upcoming, "Upcoming Elections", true)}
          {renderElectionSection(elections.ended, "Completed Elections", false, true)}
          
          <section className="stats-section">
            <div className="section-header">
              <h2>
                <FaChartPie className="section-icon" />
                Live Election Statistics
              </h2>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaVoteYea />
                </div>
                <div className="stat-content">
                  <h3>Election Name</h3>
                  <p>
                    {activeElectionStats.electionTitle || "No Active Election"}
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaChartBar />
                </div>
                <div className="stat-content">
                  <h3>Total Votes Cast</h3>
                  <p>{stats.totalVotes}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUserCheck />
                </div>
                <div className="stat-content">
                  <h3>Voter Turnout</h3>
                  <p>{stats.totalVoterTurnout}%</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <h3>Total Candidates</h3>
                  <p>{stats.totalCandidates}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaChartLine />
                </div>
                <div className="stat-content">
                  <h3>Active Voters</h3>
                  <p>
                    {stats.activeVoters} <LiveBadge />
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaVoteYea />
                </div>
                <div className="stat-content">
                  <h3>Active Election</h3>
                  <p>{activeElectionStats.electionTitle || "None"}</p>
                </div>
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
