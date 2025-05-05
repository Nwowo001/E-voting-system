import React, { useRef, useState, useEffect, useCallback } from "react";
import { useUserContext } from "../../Context/UserContext";
import axios from "axios";
import Election from "../Components/Election/Election";
import Candidate from "../Components/Candidate/Candidate";
import Voters from "../Components/Voters/Voters";
import Results from "../Components/Results/Results";
import { useMediaQuery } from "react-responsive";
import { Container, Row, Col } from "react-grid-system";
import styled from "styled-components";
import { FaChartBar, FaVoteYea, FaUsers, FaUserTie, FaPoll, FaSignOutAlt, FaTachometerAlt } from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./AdminDashboard.css";

const API_BASE_URL = "http://localhost:5000/api";

// Styled components for better responsiveness
const DashboardWrapper = styled.div`
  display: grid;
  grid-template-columns: ${props => props.isMobile ? '1fr' : '280px 1fr'};
  min-height: 100vh;
  position: relative;
  transition: all 0.3s ease;
`;

const SidebarToggle = styled.button`
  position: fixed;
  top: 10px;
  left: ${props => props.sidebarOpen ? '240px' : '10px'};
  z-index: 1000;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  display: ${props => props.showToggle ? 'flex' : 'none'};
  
  &:hover {
    background: var(--secondary-color);
  }
`;

const Sidebar = styled.aside`
  background: var(--primary-color);
  padding: 2rem 0;
  position: fixed;
  height: 100vh;
  width: 280px;
  box-shadow: var(--card-shadow);
  transform: ${props => props.isMobile && !props.isOpen ? 'translateX(-100%)' : 'translateX(0)'};
  transition: transform 0.3s ease;
  z-index: 100;
  overflow-y: auto;
`;

const MainContent = styled.main`
  grid-column: ${props => props.isMobile || !props.sidebarOpen ? '1 / -1' : '2 / -1'};
  padding: 2rem;
  margin-left: ${props => !props.isMobile && props.sidebarOpen ? '280px' : '0'};
  transition: margin-left 0.3s ease;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center; /* Center content horizontally */
  width: 100%;
  max-width: 1200px; /* Limit maximum width */
  margin: 0 auto; /* Center the container */
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
`;

const ContentContainer = styled.div`
  width: 100%;
  max-width: 1200px;
`;

const LiveBadge = () => (
  <span className="live-badge">
    <span className="live-dot"></span>
    LIVE
  </span>
);

const AdminDashboard = ({ onLogout }) => {
  // Get user data directly from context
  const { user, logout, socket } = useUserContext();
  
  // Debug logs to check user data
  console.log("AdminDashboard - User:", user);
  console.log("AdminDashboard - User role:", user?.role);
  
  // Explicitly check admin status
  const isAdmin = user?.role === "admin";
  console.log("AdminDashboard - isAdmin check:", isAdmin);

  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [availableElections, setAvailableElections] = useState([]);
  const [activeElectionData, setActiveElectionData] = useState(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeElectionStats, setActiveElectionStats] = useState({
    candidates: [],
    totalVotes: 0,
    electionId: null,
    electionTitle: "",
    voterTurnout: 0,
    totalCandidates: 0,
    activeVoters: 0,
  });
  const [dashboardData, setDashboardData] = useState({
    voters: [],
    elections: [],
    candidates: [],
    stats: {
      activeVoters: 0,
      activeElections: 0,
      recentCandidates: [],
      voterParticipation: 0,
      totalVotes: 0,
    },
  });

  // Responsive breakpoints
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });

  // Set sidebar state based on screen size
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const fetchElectionStats = async (electionId) => {
    if (!electionId) return;
    
    setIsStatsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/stats/elections/${electionId}/stats`,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
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
      
      // Update dashboard data with the active election stats
      setDashboardData(prevData => ({
        ...prevData,
        stats: {
          ...prevData.stats,
          totalVotes: totalVotes,
          voterParticipation: voterTurnout || 0
        }
      }));
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
  

  const handleElectionChange = (event) => {
    const electionId = event.target.value;
    setSelectedElectionId(electionId);
    fetchElectionStats(electionId);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      };
      
      const [voters, elections, candidates] = await Promise.all([
        axios.get(`${API_BASE_URL}/voters`, {
          withCredentials: true,
          headers
        }),
        axios.get(`${API_BASE_URL}/elections`, {
          withCredentials: true,
          headers
        }),
        axios.get(`${API_BASE_URL}/candidates`, {
          withCredentials: true,
          headers
        }),
      ]);

      const activeElections = elections.data.filter(
        (election) =>
          new Date(election.startDate) <= new Date() &&
          new Date(election.endDate) > new Date()
      );

      const currentActiveElection = activeElections[0] || null;
      setActiveElectionData(currentActiveElection);

      const activeVoters = currentActiveElection
        ? voters.data.filter(
            (voter) => voter.electionId === currentActiveElection.id
          ).length
        : 0;

      setDashboardData({
        voters: voters.data,
        elections: elections.data,
        candidates: candidates.data,
        stats: {
          activeVoters,
          activeElections: activeElections.length,
          recentCandidates: candidates.data.slice(0, 5),
          voterParticipation: calculateParticipation(
            voters.data,
            currentActiveElection?.id
          ),
          totalVotes: currentActiveElection?.totalVotes || 0,
        },
      });
      
      // If we have an active election and it matches our selected election, update the stats
      if (currentActiveElection && currentActiveElection.id === selectedElectionId) {
        fetchElectionStats(selectedElectionId);
      }
      // If we have an active election but no selected election, set it as selected
      else if (currentActiveElection && !selectedElectionId) {
        setSelectedElectionId(currentActiveElection.id);
        fetchElectionStats(currentActiveElection.id);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [selectedElectionId]);

  const calculateParticipation = (voters, activeElectionId) => {
    if (!activeElectionId) return 0;
    const eligibleVoters = voters.filter(
      (voter) => voter.electionId === activeElectionId
    );
    const votedVoters = eligibleVoters.filter((voter) => voter.hasVoted).length;
    return eligibleVoters.length > 0
      ? (votedVoters / eligibleVoters.length) * 100
      : 0;
  };

// Update the socket event handlers in the useEffect
useEffect(() => {
  const fetchAvailableElections = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/elections/all`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

  if (!isAdmin) {
    logout();
    return;
  }

  fetchDashboardData();
  fetchAvailableElections();

  // Improved socket event handling for real-time updates
  if (socket) {
    // When a voter is registered, update all dashboard data
    socket.on("voter_registered", () => {
      console.log("Voter registered event received");
      fetchDashboardData();
      // Also refresh election stats if an election is selected
      if (selectedElectionId) {
        fetchElectionStats(selectedElectionId);
      }
    });
    
    // When a vote is cast, update all relevant data
    socket.on("vote_cast", (data) => {
      console.log("Vote cast event received", data);
      // Always update dashboard data for any vote
      fetchDashboardData();
      
      // If the vote is for the currently selected election, update its stats
      if (selectedElectionId && data.electionId === selectedElectionId) {
        fetchElectionStats(selectedElectionId);
      }
      // If we have an active election displayed but not selected, update that too
      else if (activeElectionData && data.electionId === activeElectionData.id) {
        fetchElectionStats(activeElectionData.id);
      }
    });

    // When an election is created or updated
    socket.on("election_updated", () => {
      console.log("Election updated event received");
      fetchDashboardData();
      fetchAvailableElections();
    });

    // When a candidate is added or updated
    socket.on("candidate_updated", () => {
      console.log("Candidate updated event received");
      fetchDashboardData();
      if (selectedElectionId) {
        fetchElectionStats(selectedElectionId);
      }
    });

    // Reduced polling interval for more frequent updates (every 5 seconds instead of 30)
    const interval = setInterval(() => {
      fetchDashboardData();
      if (selectedElectionId) {
        fetchElectionStats(selectedElectionId);
      }
    }, 5000);

    // Clean up socket listeners and interval on unmount
    return () => {
      socket.off("voter_registered");
      socket.off("vote_cast");
      socket.off("election_updated");
      socket.off("candidate_updated");
      clearInterval(interval);
    };
  }
}, [isAdmin, fetchDashboardData, socket, selectedElectionId, activeElectionData]);


  const handleLogout = () => {
    console.log("AdminDashboard: Logout initiated");
    
    // Use the onLogout prop if available
    if (typeof onLogout === 'function') {
      onLogout();
      return;
    }
    
    // Fallback logout implementation
    if (socket) {
      try {
        socket.disconnect();
      } catch (e) {
        console.error("Socket disconnect error:", e);
      }
    }
    
    localStorage.clear();
    window.location.href = "/login";
  };

  const renderLiveResultsSection = () => (
    <div className="live-results-section">
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
            Election Results: {activeElectionStats.electionTitle}
            <LiveBadge />
          </h3>
          <StatsGrid>
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
          </StatsGrid>
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

  // Access denied view for non-admin users
  if (!isAdmin) {
    return (
      <div className="auth-error">
        <h3>Access Denied</h3>
        <p>Administrator access required.</p>
        <button 
          className="logout-button" 
          onClick={handleLogout}
        >
          Return to Login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { id: "elections", label: "Elections", icon: <FaVoteYea /> },
    { id: "candidates", label: "Candidates", icon: <FaUserTie /> },
    { id: "voters", label: "Voters", icon: <FaUsers /> },
    { id: "results", label: "Results", icon: <FaPoll /> },
  ];

  return (
    <DashboardWrapper isMobile={isMobile}>
      <SidebarToggle 
        onClick={() => setSidebarOpen(!sidebarOpen)} 
        sidebarOpen={sidebarOpen}
        showToggle={isMobile}
      >
        ☰
      </SidebarToggle>
      
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen}>
        <div className="sidebar-header">
          <h2>E-Voting Admin</h2>
        </div>
        <nav>
          <ul className="sidebar-menu">
            {menuItems.map((item) => (
              <li
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={activeSection === item.id ? "active" : ""}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-text">{item.label}</span>
              </li>
            ))}
            <li onClick={handleLogout} className="logout-item">
              <span className="menu-icon"><FaSignOutAlt /></span>
              <span className="menu-text">Logout</span>
            </li>
          </ul>
        </nav>
      </Sidebar>

      <MainContent isMobile={isMobile} sidebarOpen={sidebarOpen}>
        <ContentContainer>
          <header className="content-header">
            <h1>{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h1>
          </header>

          {activeSection === "dashboard" && (
            <div className="dashboard-overview">
              <StatsGrid>
                <div className="stat-card">
                  <div className="stat-icon">
                    <FaUsers />
                  </div>
                  <div className="stat-content">
                    <h3>Active Voters</h3>
                    <p>{dashboardData.stats.activeVoters}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <FaVoteYea />
                  </div>
                  <div className="stat-content">
                    <h3>Active Elections</h3>
                    <p>{dashboardData.stats.activeElections}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <FaChartBar />
                  </div>
                  <div className="stat-content">
                    <h3>Total Votes</h3>
                    <p>{dashboardData.stats.totalVotes}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <FaPoll />
                  </div>
                  <div className="stat-content">
                    <h3>Voter Participation</h3>
                    <p>{dashboardData.stats.voterParticipation.toFixed(1)}%</p>
                  </div>
                </div>
              </StatsGrid>
              {renderLiveResultsSection()}
            </div>
          )}
          {activeSection === "elections" && <Election />}
          {activeSection === "candidates" && <Candidate />}
          {activeSection === "voters" && <Voters voters={dashboardData.voters} />}
          {activeSection === "results" && <Results />}
        </ContentContainer>
      </MainContent>
    </DashboardWrapper>
  );
};

export default AdminDashboard;
