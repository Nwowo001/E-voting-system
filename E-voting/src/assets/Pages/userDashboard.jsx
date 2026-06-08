import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { useUserContext } from "../../Context/UserContext";
import {
  FaHome, FaHistory, FaUser, FaSignOutAlt,
  FaVoteYea, FaCalendarAlt, FaUserCheck, FaBars, FaTimes, FaSun, FaMoon,
} from "react-icons/fa";

import { API_URL, SOCKET_URL } from "../../config";

const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });

const LiveBadge = () => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30">
    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
    LIVE
  </span>
);

const StatusBadge = ({ type }) => {
  const styles = {
    live: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    ended: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    upcoming: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    voted: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  };
  const labels = { live: "Active", ended: "Ended", upcoming: "Upcoming", voted: "Voted ✓" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[type]}`}>
      {labels[type]}
    </span>
  );
};

const StatCard = ({ icon, label, value, sub }) => (
  <div className="bg-surface/20 border border-border rounded-2xl p-5 hover:bg-surface/40 transition-all duration-200">
    <div className="flex items-start justify-between mb-3">
      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 text-xl">{icon}</div>
    </div>
    <div className="text-2xl font-bold text-text mb-0.5">{value}</div>
    <div className="text-xs font-semibold text-text-muted">{label}</div>
    {sub && <div className="text-xs text-text-muted/65 mt-0.5">{sub}</div>}
  </div>
);

const UserDashboard = () => {
  const [elections, setElections] = useState({ active: [], upcoming: [], ended: [] });
  const [userVotes, setUserVotes] = useState([]);
  const [activeSection, setActiveSection] = useState("elections");
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user, theme, toggleTheme } = useUserContext();

  const navigation = [
    { name: "elections", label: "Elections", icon: <FaVoteYea /> },
    { name: "history", label: "Participation", icon: <FaHistory /> },
    { name: "profile", label: "Profile", icon: <FaUser />, path: "/profile" },
  ];

  useEffect(() => {
    if (user) {
      const shown = sessionStorage.getItem("welcomeShown");
      if (!shown) {
        setWelcomeVisible(true);
        sessionStorage.setItem("welcomeShown", "true");
        setTimeout(() => setWelcomeVisible(false), 4000);
      }
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchElections(), fetchUserVotes()]);
      setLoading(false);
    };
    init();

    socket.on("election_updated", () => {
      fetchElections();
    });

    return () => {
      socket.off("election_updated");
    };
  }, []);

  const token = () => localStorage.getItem("token");
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  const fetchElections = async () => {
    try {
      const res = await axios.get(`${API_URL}/elections`, { withCredentials: true, headers: headers() });
      const all = res.data;
      const now = new Date();
      // Combine 'YYYY-MM-DD' date + 'HH:MM:SS' time into a local Date (no Z = local time).
      const toLocal = (date, time) => new Date(`${date}T${time || "23:59:59"}`);

      setElections({
        // Active = time window is currently open (purely time-based, not DB flag)
        active: all.filter(e =>
          toLocal(e.start_date, e.start_time) <= now &&
          toLocal(e.end_date, e.end_time) > now
        ),
        // Upcoming = hasn't started yet
        upcoming: all.filter(e => toLocal(e.start_date, e.start_time) > now),
        // Ended = end time has passed
        ended: all.filter(e => toLocal(e.end_date, e.end_time) <= now),
      });
    } catch (err) { console.error(err); }
  };

  const fetchUserVotes = async () => {
    try {
      const res = await axios.get(`${API_URL}/voters/participation`, { withCredentials: true, headers: headers() });
      setUserVotes(res.data);
    } catch (err) { console.error(err); }
  };

  const hasVoted = (electionId) => userVotes.some(v => v.electionid === electionId && v.has_voted);

  const calcTimeRemaining = (endDateStr, endTimeStr) => {
    const diff = new Date(`${endDateStr}T${endTimeStr || "23:59:59"}`) - new Date();
    if (diff <= 0) return "Ended";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return d > 0 ? `${d}d ${h}h left` : `${h}h ${m}m left`;
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  const ElectionCard = ({ election, type }) => (
    <div className="bg-surface/20 border border-border rounded-2xl p-5 hover:bg-surface/40 hover:border-border/60 transition-all duration-200 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text text-sm leading-snug flex-1">{election.title}</h3>
        <StatusBadge type={hasVoted(election.electionid) ? "voted" : type} />
      </div>
      {election.description && (
        <p className="text-text-muted text-xs line-clamp-2">{election.description}</p>
      )}
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <FaCalendarAlt className="text-indigo-400" />
        {type === "ended"
          ? `Ended ${new Date(`${election.end_date}T${election.end_time || "23:59:59"}`).toLocaleString()}`
          : type === "live"
          ? calcTimeRemaining(election.end_date, election.end_time)
          : `Starts ${new Date(`${election.start_date}T${election.start_time || "00:00:00"}`).toLocaleString()}`}
      </div>
      {type === "live" && (
        <button
          onClick={() => user?.role !== "candidate" && !hasVoted(election.electionid) && navigate(`/vote/${election.electionid}`)}
          disabled={hasVoted(election.electionid) || user?.role === "candidate"}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
            hasVoted(election.electionid) || user?.role === "candidate"
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20"
          }`}
        >
          {user?.role === "candidate" ? "Candidate (Voting Restricted)" : hasVoted(election.electionid) ? "✓ Already Voted" : "Vote Now"}
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text flex transition-colors duration-300">
      {/* Welcome overlay */}
      {welcomeVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface/20 backdrop-blur-xl border border-border rounded-3xl p-10 text-center shadow-2xl">
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-3xl font-bold text-text mb-2">Welcome back,</h2>
            <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{user?.name}!</p>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-surface/90 backdrop-blur-xl border-r border-border z-30 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <FaVoteYea className="text-white text-sm" />
              </div>
              <span className="font-bold text-text text-sm">AcuVote</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="lg:hidden text-text-muted hover:text-text cursor-pointer">
              <FaTimes />
            </button>
          </div>
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-text text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-text-muted text-xs truncate">{user?.matric_number || user?.email || "Voter"}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map(item => (
            <button
              key={item.name}
              onClick={() => {
                if (item.path) navigate(item.path);
                else setActiveSection(item.name);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeSection === item.name
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-text-muted hover:text-text hover:bg-surface-2/30"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Theme toggler & Logout */}
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:text-text hover:bg-surface-2/30 transition-all duration-200 cursor-pointer"
          >
            {theme === "light" ? <FaMoon className="text-base text-indigo-400" /> : <FaSun className="text-base text-amber-400" />}
            Theme Mode
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
          >
            <FaSignOutAlt />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-10 bg-bg/85 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between lg:hidden transition-colors duration-300">
          <button onClick={() => setMobileOpen(true)} className="text-text-muted hover:text-text cursor-pointer">
            <FaBars className="text-xl" />
          </button>
          <h1 className="text-text font-bold text-sm">AcuVote Dashboard</h1>
          {/* Theme toggler in Mobile Header */}
          <button onClick={toggleTheme} className="text-text-muted hover:text-text cursor-pointer">
            {theme === "light" ? <FaMoon /> : <FaSun />}
          </button>
        </header>

        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text mb-1">
              {activeSection === "elections" && "Elections Portal"}
              {activeSection === "history" && "Participation History"}
            </h1>
            <p className="text-text-muted text-sm font-medium">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>

          {/* Elections Section */}
          {activeSection === "elections" && (
            <div className="space-y-8">
              {/* Quick stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<FaVoteYea />} label="Active Elections" value={elections.active.length} />
                <StatCard icon={<FaCalendarAlt />} label="Upcoming" value={elections.upcoming.length} />
                <StatCard icon={<FaHistory />} label="Completed" value={elections.ended.length} />
                <StatCard icon={<FaUserCheck />} label="Participated" value={userVotes.filter(v => v.has_voted).length} />
              </div>

              {/* Active Elections */}
              {elections.active.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold text-text">Active Elections</h2>
                    <LiveBadge />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {elections.active.map(e => <ElectionCard key={e.electionid} election={e} type="live" />)}
                  </div>
                </div>
              )}

              {/* Upcoming */}
              {elections.upcoming.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-text mb-4">Upcoming Elections</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {elections.upcoming.map(e => <ElectionCard key={e.electionid} election={e} type="upcoming" />)}
                  </div>
                </div>
              )}

              {/* Ended */}
              {elections.ended.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-text mb-4">Completed Elections</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {elections.ended.map(e => <ElectionCard key={e.electionid} election={e} type="ended" />)}
                  </div>
                </div>
              )}

              {elections.active.length === 0 && elections.upcoming.length === 0 && elections.ended.length === 0 && (
                <div className="text-center py-20 bg-surface/10 border border-border rounded-2xl">
                  <div className="text-5xl mb-4">🗳️</div>
                  <h3 className="text-text font-bold text-lg mb-2">No elections yet</h3>
                  <p className="text-text-muted text-sm">Elections will appear here once the administrator creates them.</p>
                </div>
              )}
            </div>
          )}

          {/* Participation History */}
          {activeSection === "history" && (
            <div className="space-y-4">
              {userVotes.length > 0 ? (
                userVotes.map((vote, i) => (
                  <div key={i} className="bg-surface/20 border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-text font-bold text-sm mb-1">{vote.title}</h3>
                      <p className="text-text-muted text-xs font-medium">
                        Timeline: {new Date(vote.start_date + "T00:00:00").toLocaleDateString()} – {new Date(vote.end_date + "T00:00:00").toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {vote.has_voted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/25">
                          ✓ Participated
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface-2/40 text-text-muted text-xs font-bold border border-border">
                          Missed / Not voted
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-surface/10 border border-border rounded-2xl">
                  <FaHistory className="text-4xl text-text-muted mx-auto mb-3" />
                  <h3 className="text-text font-bold mb-2">No participation history</h3>
                  <p className="text-text-muted text-sm">Your voting participation records will appear here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
