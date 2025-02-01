import React, { useRef, useState, useEffect, useCallback } from "react";
import { useUserContext } from "../../Context/UserContext";
import axios from "axios";
import Election from "../Components/Election/Election";
import Candidate from "../Components/Candidate/Candidate";
import Voters from "../Components/Voters/Voters";
import Results from "../Components/Results/Results";
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

const LiveBadge = () => (
  <span className="live-badge">
    <span className="live-dot"></span>
    LIVE
  </span>
);

const AdminDashboard = ({ onLogout }) => {
  const { isAdmin, logout, socket } = useUserContext();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [availableElections, setAvailableElections] = useState([]);
  const [activeElectionData, setActiveElectionData] = useState(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
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

  const fetchElectionStats = async (electionId) => {
    setIsStatsLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/stats/elections/${electionId}/stats`,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

  const handleElectionChange = (event) => {
    const electionId = event.target.value;
    setSelectedElectionId(electionId);
    fetchElectionStats(electionId);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const [voters, elections, candidates] = await Promise.all([
        axios.get(`${API_BASE_URL}/voters`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`${API_BASE_URL}/elections`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`${API_BASE_URL}/candidates`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

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

    socket?.on("voter_registered", fetchDashboardData);
    socket?.on("vote_cast", (data) => {
      if (activeElectionData?.id === data.electionId) {
        fetchDashboardData();
      }
    });

    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      socket?.off("voter_registered");
      socket?.off("vote_cast");
      clearInterval(interval);
    };
  }, [isAdmin, logout, fetchDashboardData, socket, activeElectionData]);

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
            <LiveBadge />
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

  if (!isAdmin) {
    return (
      <div className="auth-error">
        <h3>Access Denied</h3>
        <p>Administrator access required.</p>
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

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </header>

      <aside className="admin-sidebar">
        <nav>
          <ul>
            {["dashboard", "elections", "candidates", "voters", "results"].map(
              (section) => (
                <li
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={activeSection === section ? "active" : ""}
                >
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </li>
              )
            )}
          </ul>
        </nav>
      </aside>

      <main className="admin-content">
        {activeSection === "dashboard" && (
          <div className="dashboard-overview">
            <div className="stats-cards">
              <div className="stat-card">
                <h3>
                  Active Voters
                  {/* <LiveBadge /> */}
                </h3>
                <p>{dashboardData.stats.activeVoters}</p>
              </div>
              <div className="stat-card">
                <h3>
                  Active Elections
                  {/* <LiveBadge /> */}
                </h3>
                <p>{dashboardData.stats.activeElections}</p>
              </div>
              <div className="stat-card">
                <h3>
                  Total Votes
                  {/* <LiveBadge /> */}
                </h3>
                <p>{dashboardData.stats.totalVotes}</p>
              </div>
              <div className="stat-card">
                <h3>
                  Voter Participation
                  {/* <LiveBadge /> */}
                </h3>
                <p>{dashboardData.stats.voterParticipation.toFixed(1)}%</p>
              </div>
            </div>
            {renderLiveResultsSection()}
          </div>
        )}
        {activeSection === "elections" && <Election />}
        {activeSection === "candidates" && <Candidate />}
        {activeSection === "voters" && <Voters voters={dashboardData.voters} />}
        {activeSection === "results" && <Results />}
      </main>
    </div>
  );
};

export default AdminDashboard;
