import { useState, useEffect, useCallback } from "react";
import { useUserContext } from "../../Context/UserContext";
import axios from "axios";
import Election from "../Components/Election/Election";
import Candidate from "../Components/Candidate/Candidate";
import Voters from "../Components/Voters/Voters";
import Results from "../Components/Results/Results";
import { 
  FaChartBar, 
  FaVoteYea, 
  FaUsers, 
  FaUserTie, 
  FaPoll, 
  FaSignOutAlt, 
  FaTachometerAlt,
  FaBars,
  FaTimes,
  FaSpinner,
  FaSun,
  FaMoon,
  FaShieldAlt
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const LiveBadge = () => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/25">
    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
    LIVE
  </span>
);

const StatCard = ({ icon, label, value, color = "indigo" }) => {
  const colors = {
    indigo: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    violet: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  };
  return (
    <div className="bg-surface/20 border border-border rounded-2xl p-5 backdrop-blur-xl hover:bg-surface/40 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{label}</span>
        <div className={`p-2.5 rounded-xl border ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-text">{value}</p>
    </div>
  );
};

const AdminDashboard = ({ onLogout }) => {
  const { user, logout, socket, theme, toggleTheme } = useUserContext();
  const isAdmin = user?.role === "admin" || user?.role === "staff";

  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [availableElections, setAvailableElections] = useState([]);
  const [activeElectionData, setActiveElectionData] = useState(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [activeElectionStats, setActiveElectionStats] = useState({
    candidates: [],
    totalVotes: 0,
    electionId: null,
    electionTitle: "",
    voterTurnout: 0,
    totalCandidates: 0,
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

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  });

  const fetchElectionStats = async (electionId) => {
    if (!electionId) return;
    setIsStatsLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/stats/elections/${electionId}/stats`,
        { withCredentials: true, headers: headers() }
      );
  
      const { candidates = [], totalVotes, title, voterTurnout } = response.data;
      setActiveElectionStats({
        candidates: (candidates || []).map((c) => ({
          name: c.name,
          votes: c.voteCount || 0,
          party: c.party,
        })),
        totalVotes: totalVotes || 0,
        electionId: electionId,
        electionTitle: title || "",
        voterTurnout: voterTurnout || 0,
        totalCandidates: (candidates || []).length,
      });
      
      setDashboardData(prevData => ({
        ...prevData,
        stats: {
          ...prevData.stats,
          totalVotes: totalVotes || 0,
          voterParticipation: voterTurnout || 0
        }
      }));
    } catch (error) {
      console.error("Error fetching election stats:", error);
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
        axios.get(`${API_BASE_URL}/voters`, { withCredentials: true, headers: headers() }),
        axios.get(`${API_BASE_URL}/elections`, { withCredentials: true, headers: headers() }),
        axios.get(`${API_BASE_URL}/candidates`, { withCredentials: true, headers: headers() }),
      ]);

      const now = new Date();
      const activeElections = elections.data.filter(
        (election) =>
          new Date(election.start_date) <= now && new Date(election.end_date) > now
      );

      const currentActiveElection = activeElections[0] || null;
      setActiveElectionData(currentActiveElection);

      setDashboardData({
        voters: voters.data,
        elections: elections.data,
        candidates: candidates.data,
        stats: {
          activeVoters: voters.data.length,
          activeElections: activeElections.length,
          recentCandidates: candidates.data.slice(0, 5),
          voterParticipation: 0,
          totalVotes: 0,
        },
      });
      
      if (currentActiveElection && !selectedElectionId) {
        setSelectedElectionId(currentActiveElection.electionid);
        fetchElectionStats(currentActiveElection.electionid);
      } else if (selectedElectionId) {
        const isValid = elections.data.some(e => e.electionid == selectedElectionId);
        if (isValid) {
          fetchElectionStats(selectedElectionId);
        } else {
          const nextId = elections.data.length > 0 ? elections.data[0].electionid : null;
          setSelectedElectionId(nextId);
          if (nextId) fetchElectionStats(nextId);
        }
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

  useEffect(() => {
    const fetchAvailableElections = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/elections/all`, {
          withCredentials: true,
          headers: headers(),
        });
        const electionsData = response.data;
        setAvailableElections(electionsData);
        
        const isValid = electionsData.some(e => e.electionid == selectedElectionId);
        if (!isValid) {
          if (electionsData.length > 0) {
            setSelectedElectionId(electionsData[0].electionid);
            fetchElectionStats(electionsData[0].electionid);
          } else {
            setSelectedElectionId(null);
          }
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

    if (socket) {
      socket.on("vote_cast", (data) => {
        fetchDashboardData();
        if (selectedElectionId && data.electionId == selectedElectionId) {
          fetchElectionStats(selectedElectionId);
        }
      });

      socket.on("election_updated", () => {
        fetchDashboardData();
        fetchAvailableElections();
      });

      socket.on("candidate_updated", () => {
        fetchDashboardData();
      });

      const interval = setInterval(() => {
        if (selectedElectionId) fetchElectionStats(selectedElectionId);
      }, 10000);

      return () => {
        socket.off("vote_cast");
        socket.off("election_updated");
        socket.off("candidate_updated");
        clearInterval(interval);
      };
    }
  }, [isAdmin, fetchDashboardData, socket]);

  const handleLogout = () => {
    if (socket) {
      try { socket.disconnect(); } catch (e) { console.error(e); }
    }
    localStorage.clear();
    window.location.href = "/login";
  };

  const renderLiveResultsSection = () => {
    const selectedElection = dashboardData.elections.find(e => e.electionid == selectedElectionId);
    const now = new Date();
    const isSelectedActive = selectedElection && selectedElection.isactive && new Date(selectedElection.start_date) <= now && new Date(selectedElection.end_date) > now;

    return (
      <div className="bg-surface/20 border border-border rounded-2xl p-6 backdrop-blur-xl mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              Election Standings {isSelectedActive && <LiveBadge />}
            </h2>
            <p className="text-text-muted text-sm">Real-time graphical vote outcomes</p>
          </div>
        <div className="w-full sm:w-64">
          <select
            value={selectedElectionId || ""}
            onChange={handleElectionChange}
            className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm cursor-pointer outline-none"
          >
            <option value="">Select an election</option>
            {availableElections.map((election) => (
              <option key={election.electionid} value={election.electionid}>
                {election.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isStatsLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <FaSpinner className="text-4xl text-primary animate-spin mb-3" />
          <p className="text-text-muted text-sm">Loading real-time stats...</p>
        </div>
      ) : selectedElectionId ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-surface/40 border border-border/50 rounded-xl p-4">
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Total Votes Cast</p>
              <p className="text-3xl font-bold text-text">{activeElectionStats.totalVotes}</p>
            </div>
            <div className="bg-surface/40 border border-border/50 rounded-xl p-4">
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Voter Turnout</p>
              <p className="text-3xl font-bold text-emerald-400">{activeElectionStats.voterTurnout}%</p>
            </div>
            <div className="bg-surface/40 border border-border/50 rounded-xl p-4">
              <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-1">Total Contenders</p>
              <p className="text-3xl font-bold text-text">{activeElectionStats.totalCandidates}</p>
            </div>
          </div>
          
          <div className="h-80 w-full bg-surface/20 border border-border/40 rounded-xl p-4">
            {activeElectionStats.candidates.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeElectionStats.candidates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    angle={-15}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-surface border border-border rounded-xl p-3 shadow-xl">
                            <p className="text-text font-bold text-xs">{data.name}</p>
                            <p className="text-text-muted text-[10px] uppercase font-semibold">{data.party}</p>
                            <p className="text-primary font-bold text-sm mt-1">{payload[0].value} votes</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <defs>
                    <linearGradient id="adminColorVotes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="votes" fill="url(#adminColorVotes)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FaChartBar className="text-4xl text-text-muted mx-auto mb-2" />
                  <p className="text-text-muted text-sm">No candidate data for this election yet.</p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-xl">
          <FaChartBar className="text-4xl text-text-muted mb-2" />
          <p className="text-text-muted text-sm">Choose an election to view live standings</p>
        </div>
      )}
    </div>
  );
};

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="bg-surface/20 border border-red-500/20 rounded-2xl p-8 max-w-sm w-full text-center backdrop-blur-xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
            🚫
          </div>
          <h3 className="text-xl font-bold text-text mb-2">Access Denied</h3>
          <p className="text-text-muted text-sm mb-6">Administrator privileges are required to view this panel.</p>
          <button 
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold text-sm hover:from-red-500 hover:to-rose-500 transition-all shadow-lg shadow-red-500/20 cursor-pointer"
            onClick={handleLogout}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="text-5xl text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Syncing AcuVote dashboard...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard Overview", icon: <FaTachometerAlt /> },
    { id: "elections", label: "Election Setup", icon: <FaVoteYea /> },
    { id: "candidates", label: "Contenders", icon: <FaUserTie /> },
    { id: "voters", label: "Voters & Staff", icon: <FaUsers /> },
    { id: "results", label: "Audit Reports", icon: <FaPoll /> },
  ];

  return (
    <div className="min-h-screen bg-bg text-text flex transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-surface/95 border-r border-border py-8 flex flex-col justify-between transition-transform duration-300 backdrop-blur-xl lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div>
          {/* Logo / Title */}
          <div className="px-6 mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FaVoteYea className="text-white text-base" />
            </div>
            <div>
              <h2 className="text-text font-bold text-base leading-tight">AcuVote</h2>
              <span className="text-[10px] text-primary font-bold tracking-wider uppercase flex items-center gap-1">
                <FaShieldAlt /> Admin Portal
              </span>
            </div>
          </div>

          {/* User badge */}
          <div className="px-6 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2/30 border border-border">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow text-sm shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="overflow-hidden">
                <p className="text-text font-bold text-xs truncate">{user?.name || "Administrator"}</p>
                <p className="text-text-muted text-[10px] truncate">{user?.email || "admin@acuvote.com"}</p>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="px-4 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  activeSection === item.id 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" 
                    : "text-text-muted hover:text-text hover:bg-surface-2/30"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom: Theme Toggle + Logout */}
        <div className="px-4 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-text-muted hover:text-text hover:bg-surface-2/30 transition-all cursor-pointer"
          >
            {theme === "light" ? <FaMoon className="text-indigo-400" /> : <FaSun className="text-amber-400" />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all cursor-pointer"
          >
            <FaSignOutAlt />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen relative">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-bg/85 backdrop-blur-md border-b border-border transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg bg-surface-2/30 border border-border text-text-muted hover:text-text transition-all cursor-pointer"
            >
              {sidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
            <h1 className="text-lg font-bold text-text">
              {menuItems.find(m => m.id === activeSection)?.label || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {dashboardData.stats.activeElections > 0 && <LiveBadge />}
            <button
              onClick={toggleTheme}
              className="lg:hidden p-2 rounded-lg bg-surface-2/30 border border-border text-text-muted hover:text-text transition-all cursor-pointer"
            >
              {theme === "light" ? <FaMoon /> : <FaSun />}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  icon={<FaUsers />} 
                  label="Total Voters" 
                  value={dashboardData.voters.length} 
                  color="indigo" 
                />
                <StatCard 
                  icon={<FaVoteYea />} 
                  label="Active Elections" 
                  value={dashboardData.stats.activeElections} 
                  color="violet" 
                />
                <StatCard 
                  icon={<FaChartBar />} 
                  label="Votes Logged" 
                  value={activeElectionStats.totalVotes} 
                  color="cyan" 
                />
                <StatCard 
                  icon={<FaPoll />} 
                  label="Voter Participation" 
                  value={`${activeElectionStats.voterTurnout}%`} 
                  color="emerald" 
                />
              </div>

              {/* Graphical standings */}
              {renderLiveResultsSection()}

              {/* Recent activity */}
              <div className="bg-surface/20 border border-border rounded-2xl p-5 backdrop-blur-xl">
                <h3 className="text-text font-bold mb-4 flex items-center gap-2">
                  <FaUserTie className="text-primary" /> Recent Candidates
                </h3>
                {dashboardData.stats.recentCandidates.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.stats.recentCandidates.map((candidate, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-2/20 border border-border/40">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-border/50 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {candidate.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text font-bold text-sm truncate">{candidate.name}</p>
                          <p className="text-text-muted text-xs truncate">{candidate.party} · {candidate.election || "Election"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-muted text-sm text-center py-6">No candidates registered yet.</p>
                )}
              </div>
            </div>
          )}

          {activeSection === "elections" && <Election />}
          {activeSection === "candidates" && <Candidate />}
          {activeSection === "voters" && <Voters />}
          {activeSection === "results" && <Results />}
        </main>
      </div>

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden z-35"
        />
      )}
    </div>
  );
};

export default AdminDashboard;
