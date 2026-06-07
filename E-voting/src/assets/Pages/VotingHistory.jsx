import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaHistory, FaCheckCircle, FaTimesCircle, FaPoll, FaSpinner } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const VotingHistory = () => {
  const navigate = useNavigate();
  const [participation, setParticipation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({
    totalVoted: 0,
    totalMissed: 0,
    participationRate: 0,
  });

  useEffect(() => {
    fetchParticipationHistory();
  }, []);

  const fetchParticipationHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/voters/participation`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      
      setParticipation(res.data);
      calculateStats(res.data);
    } catch (err) {
      setError("Failed to fetch voting participation records.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const totalVoted = data.filter((item) => item.has_voted).length;
    const totalMissed = data.length - totalVoted;
    const participationRate = data.length > 0 ? (totalVoted / data.length) * 100 : 0;

    setStats({
      totalVoted,
      totalMissed,
      participationRate: participationRate.toFixed(1),
    });
  };

  const filteredHistory = participation.filter((item) => {
    if (filter === "all") return true;
    if (filter === "voted") return item.has_voted;
    if (filter === "missed") return !item.has_voted;
    return true;
  });

  return (
    <div className="min-h-screen bg-bg text-text p-4 sm:p-6 lg:p-8">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center justify-center p-2 rounded-lg bg-surface/20 border border-border text-text-muted hover:text-text hover:bg-surface/40 transition-all"
            >
              <FaArrowLeft />
            </button>
            <div>
              <h1 className="text-xl font-bold text-text flex items-center gap-2">
                <FaHistory className="text-indigo-400" /> Voting Participation Ledger
              </h1>
              <p className="text-text-muted text-sm">Under ballot secrecy rules, we only log participation, not your personal candidate choice</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-surface/20 border border-border text-text text-xs font-semibold focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Elections</option>
              <option value="voted">Participated</option>
              <option value="missed">Missed Ballot</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface/20 border border-border rounded-2xl p-5 backdrop-blur-xl">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Elections Voted</p>
            <p className="text-2xl font-bold text-text">{stats.totalVoted}</p>
          </div>
          <div className="bg-surface/20 border border-border rounded-2xl p-5 backdrop-blur-xl">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Elections Missed</p>
            <p className="text-2xl font-bold text-text">{stats.totalMissed}</p>
          </div>
          <div className="bg-surface/20 border border-border rounded-2xl p-5 backdrop-blur-xl">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Participation Rate</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.participationRate}%</p>
          </div>
        </div>

        {/* Privacy Shield Info */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="text-2xl text-indigo-400 mt-0.5 shrink-0">🛡️</div>
          <div>
            <h3 className="text-text font-bold text-sm">Ballot Secrecy Guarantee</h3>
            <p className="text-indigo-300/80 text-xs mt-1 leading-relaxed">
              Your individual vote is cryptographically decoupled from your identity. The system only marks that your account has successfully checked in to vote to prevent double voting. No candidate choice log is linked to your name in the database.
            </p>
          </div>
        </div>

        {/* Audit Log Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface/20 border border-border rounded-2xl">
            <FaSpinner className="text-3xl text-indigo-500 animate-spin mb-3" />
            <p className="text-text-muted text-sm">Querying ledger records...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-surface/20 border border-red-500/20 rounded-2xl">
            <FaTimesCircle className="text-4xl text-rose-500 mx-auto mb-2" />
            <p className="text-text-muted text-sm">{error}</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-16 bg-surface/20 border border-border rounded-2xl">
            <FaPoll className="text-5xl text-slate-600 mx-auto mb-3" />
            <h3 className="text-text font-bold text-base mb-1">No ledger entries</h3>
            <p className="text-text-muted text-sm">No participations were recorded in this filter category.</p>
          </div>
        ) : (
          <div className="bg-surface/20 border border-border rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface/[0.02] text-xs font-semibold text-text-muted">
                    <th className="p-4">Election Title</th>
                    <th className="p-4">Election Timeline</th>
                    <th className="p-4">Campaign status</th>
                    <th className="p-4 text-center">Your check-in status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-sm text-text-muted">
                  {filteredHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface/[0.02] transition-all">
                      <td className="p-4 font-semibold text-text">{item.title}</td>
                      <td className="p-4 text-xs text-text-muted">
                        {new Date(item.start_date + "T00:00:00").toLocaleDateString()} — {new Date(item.end_date + "T00:00:00").toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        {item.isactive ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            Closed
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center">
                          {item.has_voted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <FaCheckCircle className="text-emerald-400 text-xs" /> Voted & Recorded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <FaTimesCircle className="text-rose-400 text-xs" /> Missed Ballot
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingHistory;
