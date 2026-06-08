import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaToggleOn, 
  FaToggleOff, 
  FaCalendarAlt, 
  FaClock, 
  FaInfoCircle, 
  FaCheck, 
  FaTimes, 
  FaEye, 
  FaDownload, 
  FaSearch, 
  FaFilter,
  FaSpinner
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import { API_URL } from "../../../config";

const Election = () => {
  const [elections, setElections] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState({});
  const [newElection, setNewElection] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
  });
  const [editElectionId, setEditElectionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'start_date', direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  
  const [pausedElections, setPausedElections] = useState({});
  const [pausedTimes, setPausedTimes] = useState({});
  const [pausedTimestamps, setPausedTimestamps] = useState({});
  const [electionStats, setElectionStats] = useState({});
  const [viewStatsId, setViewStatsId] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const formRef = useRef(null);

  useEffect(() => {
    const savedPausedElections = localStorage.getItem('pausedElections');
    const savedPausedTimes = localStorage.getItem('pausedTimes');
    const savedPausedTimestamps = localStorage.getItem('pausedTimestamps');
    
    if (savedPausedElections) setPausedElections(JSON.parse(savedPausedElections));
    if (savedPausedTimes) setPausedTimes(JSON.parse(savedPausedTimes));
    if (savedPausedTimestamps) setPausedTimestamps(JSON.parse(savedPausedTimestamps));
    
    setInitialLoad(false);
  }, []);

  useEffect(() => {
    if (!initialLoad) {
      localStorage.setItem('pausedElections', JSON.stringify(pausedElections));
      localStorage.setItem('pausedTimes', JSON.stringify(pausedTimes));
      localStorage.setItem('pausedTimestamps', JSON.stringify(pausedTimestamps));
    }
  }, [pausedElections, pausedTimes, pausedTimestamps, initialLoad]);

  useEffect(() => {
    const timer = setInterval(() => {
      const updatedTimeRemaining = {};
      
      elections.forEach((election) => {
        const remaining = calculateTimeRemaining(
          election.start_date,
          election.start_time,
          election.end_date,
          election.end_time,
          election.electionid
        );

        if (!pausedElections[election.electionid]) {
          if (remaining.status === "Active" && !election.isactive) {
            handleToggleStatus(election.electionid, false, true);
          } else if (remaining.status === "Ended" && election.isactive) {
            handleToggleStatus(election.electionid, true, true);
          }
        }

        updatedTimeRemaining[election.electionid] = remaining;
      });

      setTimeRemaining(updatedTimeRemaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [elections, pausedElections, pausedTimes, pausedTimestamps]);

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/elections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Dates now arrive as plain 'YYYY-MM-DD' strings from the backend (TO_CHAR).
      // No conversion needed — just pass them through.
      setElections(response.data);

    } catch (error) {
      console.error(error);
      toast.error("Failed to load elections.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateElection = async () => {
    const { title, description, start_date, end_date, start_time, end_time } = newElection;

    if (!title || !description || !start_date || !end_date || !start_time || !end_time) {
      toast.error("All fields are required.");
      return;
    }

    const startDateTime = new Date(`${start_date}T${start_time}`);
    const endDateTime = new Date(`${end_date}T${end_time}`);

    if (endDateTime <= startDateTime) {
      toast.error("End date must be after start date.");
      return;
    }

    try {
      setFormLoading(true);
      const token = localStorage.getItem("token");
      
      if (editElectionId) {
        await axios.put(
          `${API_URL}/elections/${editElectionId}`, 
          newElection,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Election updated successfully!");
      } else {
        await axios.post(
          `${API_URL}/elections`, 
          newElection,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Election created successfully!");
      }
      
      fetchElections();
      resetForm();
      setShowForm(false);
    } catch (error) {
      toast.error(error.response?.data?.error || "An error occurred.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteElection = async (electionId) => {
    if (confirmDelete !== electionId) {
      setConfirmDelete(electionId);
      return;
    }

    try {
      setDeleteLoading(electionId);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/elections/${electionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Election deleted successfully!");
      
      if (pausedElections[electionId]) {
        const updatedPausedElections = { ...pausedElections };
        delete updatedPausedElections[electionId];
        setPausedElections(updatedPausedElections);
      }
      
      fetchElections();
    } catch (error) {
      toast.error("Failed to delete the election.");
    } finally {
      setDeleteLoading(null);
      setConfirmDelete(null);
    }
  };

  const handleToggleStatus = async (electionId, isActive, silent = false) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/elections/${electionId}/activate`, 
        { isactive: !isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setElections(elections =>
        elections.map((election) =>
          election.electionid === electionId
            ? { ...election, isactive: !isActive }
            : election
        )
      );
      
      if (isActive) {
        const currentRemaining = timeRemaining[electionId] || 
          calculateTimeRemaining(
            elections.find(e => e.electionid === electionId).start_date,
            elections.find(e => e.electionid === electionId).start_time,
            elections.find(e => e.electionid === electionId).end_date,
            elections.find(e => e.electionid === electionId).end_time,
            electionId
          );
        
        setPausedTimes(prev => ({ ...prev, [electionId]: currentRemaining }));
        setPausedTimestamps(prev => ({ ...prev, [electionId]: new Date().toISOString() }));
        setPausedElections(prev => ({ ...prev, [electionId]: true }));
        
        if (!silent) toast.success("Election paused successfully!");
      } else {
        setPausedElections(prev => {
          const updated = { ...prev };
          delete updated[electionId];
          return updated;
        });
        if (!silent) toast.success("Election activated successfully!");
      }
    } catch (error) {
      if (!silent) toast.error("Failed to change election status.");
    }
  };

  const fetchElectionStats = async (electionId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/stats/elections/${electionId}/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setElectionStats(prev => ({
        ...prev,
        [electionId]: response.data
      }));
      
      setViewStatsId(viewStatsId === electionId ? null : electionId);
    } catch (error) {
      toast.error("Failed to load statistics.");
    }
  };

  const exportElectionResults = (electionId) => {
    const election = elections.find(e => e.electionid === electionId);
    if (!election) return;
    
    const stats = electionStats[electionId];
    if (!stats) {
      toast.info("Fetching election data for export...");
      fetchElectionStats(electionId).then(() => {
        setTimeout(() => exportElectionResults(electionId), 1000);
      });
      return;
    }
    
    let csvContent = "Candidate,Party,Votes\r\n";
    stats.candidates.forEach(candidate => {
      csvContent += `"${candidate.name}","${candidate.party}",${candidate.voteCount || 0}\r\n`;
    });
    
    csvContent += `\r\nTotal Votes,${stats.totalVotes}\r\n`;
    csvContent += `Voter Turnout,${stats.voterTurnout}%\r\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `election_${election.title.replace(/\s+/g, '_')}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Election results exported successfully!");
  };

  const calculateTimeRemaining = (startDate, startTime, endDate, endTime, electionId) => {
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const now = new Date();
    
    if (pausedElections[electionId]) {
      return pausedTimes[electionId] || { 
        status: now < start ? "Pending" : now <= end ? "Active" : "Ended",
        timeLeft: now < start ? start - now : now <= end ? end - now : 0
      };
    }
    
    if (pausedTimestamps[electionId]) {
      const pauseDuration = now - new Date(pausedTimestamps[electionId]);
      const adjustedStart = new Date(start.getTime() + pauseDuration);
      const adjustedEnd = new Date(end.getTime() + pauseDuration);
      
      if (now < adjustedStart) {
        return { status: "Pending", timeLeft: adjustedStart - now };
      } else if (now >= adjustedStart && now <= adjustedEnd) {
        return { status: "Active", timeLeft: adjustedEnd - now };
      } else {
        return { status: "Ended", timeLeft: 0 };
      }
    }
    
    if (now < start) {
      return { status: "Pending", timeLeft: start - now };
    } else if (now >= start && now <= end) {
      return { status: "Active", timeLeft: end - now };
    } else {
      return { status: "Ended", timeLeft: 0 };
    }
  };

  const formatTimeRemaining = (timeLeft) => {
    if (!timeLeft || timeLeft <= 0) return "0m 0s";
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const handleEditElection = (election) => {
    setEditElectionId(election.electionid);
    setNewElection({
      title: election.title,
      description: election.description,
      start_date: election.start_date,
      end_date: election.end_date,
      start_time: election.start_time || "00:00",
      end_time: election.end_time || "00:00",
    });
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const resetForm = () => {
    setNewElection({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
    });
    setEditElectionId(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  const getSortedElections = useCallback(() => {
    const filtered = elections.filter((election) => {
      const matchesSearch = election.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           election.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const remaining = timeRemaining[election.electionid] || 
        calculateTimeRemaining(
          election.start_date,
          election.start_time,
          election.end_date,
          election.end_time,
          election.electionid
        );
      
      if (filterStatus === "all") return matchesSearch;
      if (filterStatus === "active") return matchesSearch && (remaining.status === "Active" && election.isactive);
      if (filterStatus === "pending") return matchesSearch && remaining.status === "Pending";
      if (filterStatus === "ended") return matchesSearch && remaining.status === "Ended";
      if (filterStatus === "paused") return matchesSearch && pausedElections[election.electionid];
      return matchesSearch;
    });
    
    return [...filtered].sort((a, b) => {
      if (sortConfig.key === 'title') {
        return sortConfig.direction === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      const dateA = new Date(`${a.start_date}T${a.start_time || '00:00:00'}`);
      const dateB = new Date(`${b.start_date}T${b.start_time || '00:00:00'}`);
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [elections, searchTerm, filterStatus, sortConfig, timeRemaining, pausedElections]);

  const getStatusBadge = (status, isActive, electionId) => {
    if (pausedElections[electionId]) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
          Paused
        </span>
      );
    }
    // Use the time-computed status as the source of truth.
    // Don't also require isactive DB flag — it may not have auto-toggled yet.
    if (status === "Active") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 animate-pulse">
          Active
        </span>
      );
    }
    if (status === "Pending") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25">
          Upcoming
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/25">
        Ended
      </span>
    );
  };


  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-500" /> Election Campaign Setup
          </h2>
          <p className="text-text-muted text-sm">Schedule elections, adjust voting timeline parameters, and pause/resume ballot campaigns</p>
        </div>
        
        <button 
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
            setTimeout(() => {
              formRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          {showForm ? <><FaTimes /> Cancel</> : <><FaPlus /> Create Election</>}
        </button>
      </div>

      {/* Creation/Edit Form */}
      {showForm && (
        <div ref={formRef} className="bg-surface/20 border border-border rounded-2xl p-6 backdrop-blur-xl animate-slide-in">
          <h3 className="text-lg font-bold text-text mb-4">
            {editElectionId ? "Modify Election Schedule" : "Create New Election Ballot"}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Ballot Title *</label>
              <input
                type="text"
                value={newElection.title}
                onChange={(e) => setNewElection({ ...newElection, title: e.target.value })}
                placeholder="e.g. Faculty Dean Election 2026"
                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Description / Instructions *</label>
              <textarea
                value={newElection.description}
                onChange={(e) => setNewElection({ ...newElection, description: e.target.value })}
                placeholder="Write election parameters or instructions here..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={newElection.start_date}
                    onChange={(e) => setNewElection({ ...newElection, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={newElection.start_time}
                    onChange={(e) => setNewElection({ ...newElection, start_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">End Date *</label>
                  <input
                    type="date"
                    value={newElection.end_date}
                    onChange={(e) => setNewElection({ ...newElection, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">End Time *</label>
                  <input
                    type="time"
                    value={newElection.end_time}
                    onChange={(e) => setNewElection({ ...newElection, end_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={handleCancel}
                disabled={formLoading}
                className="px-4 py-2 rounded-xl bg-surface/20 border border-border text-text-muted hover:bg-surface/40 transition-all text-sm font-semibold"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleCreateOrUpdateElection}
                disabled={formLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all text-sm font-semibold flex items-center gap-2"
              >
                {formLoading ? <FaSpinner className="animate-spin" /> : editElectionId ? "Update Election" : "Initialize Election"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-surface/20 border border-border rounded-2xl p-4 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search elections by title or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface/60 border border-border/50 text-text placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <FaFilter className="text-text-muted text-xs" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface border border-border/50 text-text text-xs cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Now</option>
            <option value="pending">Upcoming</option>
            <option value="ended">Concluded</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-surface/20 border border-border rounded-2xl">
          <FaSpinner className="text-4xl text-indigo-500 animate-spin mb-3" />
          <p className="text-text-muted text-sm">Syncing election timetables...</p>
        </div>
      ) : getSortedElections().length === 0 ? (
        <div className="text-center py-16 bg-surface/20 border border-border rounded-2xl">
          <FaInfoCircle className="text-5xl text-slate-600 mx-auto mb-3" />
          <h3 className="text-text font-bold text-base mb-1">No elections found</h3>
          <p className="text-text-muted text-sm">No scheduled campaigns match your filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {getSortedElections().map((election) => {
            const remaining = timeRemaining[election.electionid] || 
              calculateTimeRemaining(
                election.start_date,
                election.start_time,
                election.end_date,
                election.end_time,
                election.electionid
              );
            
            const stats = electionStats[election.electionid];
            
            return (
              <div 
                key={election.electionid} 
                className="bg-surface/20 border border-border rounded-2xl p-6 backdrop-blur-xl hover:border-border/80 transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-text font-bold text-lg">{election.title}</h3>
                    <p className="text-text-muted text-xs mt-1">{election.description}</p>
                  </div>
                  {getStatusBadge(remaining.status, election.isactive, election.electionid)}
                </div>

                {/* Date / Time remain */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-y border-border/50 text-xs">
                  <div className="flex items-center gap-2 text-text-muted">
                    <FaCalendarAlt className="text-indigo-400 text-sm" />
                    <div>
                      <p className="text-[10px] uppercase font-semibold">Start Period</p>
                      {/* Combine 'YYYY-MM-DD' date + time into a local datetime string.
                           No 'Z' suffix → JS parses as local time → correct display. */}
                      <p className="text-text font-semibold">{new Date(`${election.start_date}T${election.start_time || '00:00:00'}`).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-text-muted">
                    <FaCalendarAlt className="text-indigo-400 text-sm" />
                    <div>
                      <p className="text-[10px] uppercase font-semibold">End Period</p>
                      <p className="text-text font-semibold">{new Date(`${election.end_date}T${election.end_time || '00:00:00'}`).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-text-muted">
                    <FaClock className="text-violet-400 text-sm" />
                    <div>
                      <p className="text-[10px] uppercase font-semibold">Time Remaining</p>
                      <p className="text-text font-bold">{formatTimeRemaining(remaining.timeLeft)}</p>
                    </div>
                  </div>
                </div>

                {/* Stats Accordion */}
                {viewStatsId === election.electionid && stats && (
                  <div className="bg-surface/40 border border-border/50 rounded-xl p-4 space-y-3 animate-slide-in">
                    <div className="flex items-center justify-between">
                      <h4 className="text-text font-bold text-xs">Quick Ballot Summary</h4>
                      <button 
                        onClick={() => exportElectionResults(election.electionid)}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all flex items-center gap-1"
                      >
                        <FaDownload /> Export CSV
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-surface/20 p-3 rounded-lg">
                        <p className="text-text-muted">Votes Cast</p>
                        <p className="text-base font-bold text-text mt-0.5">{stats.totalVotes}</p>
                      </div>
                      <div className="bg-surface/20 p-3 rounded-lg">
                        <p className="text-text-muted">Turnout Rate</p>
                        <p className="text-base font-bold text-emerald-400 mt-0.5">{stats.voterTurnout}%</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <p className="text-[10px] text-text-muted font-semibold uppercase">Candidate Standings</p>
                      {stats.candidates.map((cand, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-border/30">
                          <span className="text-text-muted font-medium">{cand.name} <span className="text-[10px] text-slate-500">({cand.party})</span></span>
                          <span className="text-text font-bold">{cand.voteCount || 0} votes</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => fetchElectionStats(election.electionid)}
                      className="px-3.5 py-2 rounded-xl bg-surface/20 border border-border hover:bg-surface/40 text-text text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <FaEye /> {viewStatsId === election.electionid ? "Close Panel" : "View Stands"}
                    </button>

                    {remaining.status === "Active" && (
                      <button 
                        onClick={() => handleToggleStatus(election.electionid, election.isactive)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          pausedElections[election.electionid]
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20"
                        }`}
                      >
                        {pausedElections[election.electionid] ? <><FaToggleOn /> Resume Ballot</> : <><FaToggleOff /> Pause Ballot</>}
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditElection(election)}
                      className="p-2.5 rounded-xl bg-surface/20 border border-border hover:bg-surface/40 text-text text-sm transition-all"
                      title="Edit Campaign Timeline"
                    >
                      <FaEdit />
                    </button>

                    <button 
                      onClick={() => handleDeleteElection(election.electionid)}
                      disabled={deleteLoading === election.electionid}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        confirmDelete === election.electionid
                          ? "bg-rose-600 text-white border-rose-500"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white"
                      }`}
                    >
                      {confirmDelete === election.electionid ? "Confirm Deletion" : <FaTrash />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Election;
