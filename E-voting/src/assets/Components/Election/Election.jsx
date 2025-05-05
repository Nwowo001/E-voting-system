import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import "./Election.css";
import ButtonComponent from "../Button/buttonComponent";
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
  FaHistory,
  FaSearch,
  FaFilter
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";

const API_URL = "http://localhost:5000/api";

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

  // Load paused elections data from localStorage on component mount
  useEffect(() => {
    const savedPausedElections = localStorage.getItem('pausedElections');
    const savedPausedTimes = localStorage.getItem('pausedTimes');
    const savedPausedTimestamps = localStorage.getItem('pausedTimestamps');
    
    if (savedPausedElections) {
      setPausedElections(JSON.parse(savedPausedElections));
    }
    
    if (savedPausedTimes) {
      setPausedTimes(JSON.parse(savedPausedTimes));
    }
    
    if (savedPausedTimestamps) {
      setPausedTimestamps(JSON.parse(savedPausedTimestamps));
    }
    
    setInitialLoad(false);
  }, []);

  // Save paused elections data to localStorage whenever it changes
  useEffect(() => {
    if (!initialLoad) {
      localStorage.setItem('pausedElections', JSON.stringify(pausedElections));
      localStorage.setItem('pausedTimes', JSON.stringify(pausedTimes));
      localStorage.setItem('pausedTimestamps', JSON.stringify(pausedTimestamps));
    }
  }, [pausedElections, pausedTimes, pausedTimestamps, initialLoad]);

  // Calculate time remaining for all elections
  useEffect(() => {
    const timer = setInterval(() => {
      const updatedTimeRemaining = {};
      
      elections.forEach((election) => {
        // Calculate time remaining with election ID parameter
        const remaining = calculateTimeRemaining(
          election.start_date,
          election.start_time,
          election.end_date,
          election.end_time,
          election.electionid
        );

        // Auto-update election status based on time - but only if not paused
        if (!pausedElections[election.electionid]) {
          if (remaining.status === "Active" && !election.isactive) {
            handleToggleStatus(election.electionid, false, true); // Silent update
          } else if (remaining.status === "Ended" && election.isactive) {
            handleToggleStatus(election.electionid, true, true); // Silent update
          }
        }

        updatedTimeRemaining[election.electionid] = remaining;
      });

      setTimeRemaining(updatedTimeRemaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [elections, pausedElections, pausedTimes, pausedTimestamps]);

  // Fetch elections on component mount
  useEffect(() => {
    fetchElections();
  }, []);

  // Fetch elections from API
  const fetchElections = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/elections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setElections(
        response.data.map((election) => ({
          ...election,
          start_date: election.start_date.slice(0, 10),
          end_date: election.end_date.slice(0, 10),
        }))
      );
    } catch (error) {
      console.error("Error fetching elections:", error.message);
      toast.error("Failed to load elections. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle creating or updating an election
  const handleCreateOrUpdateElection = async () => {
    const { title, description, start_date, end_date, start_time, end_time } =
      newElection;

    // Validate form fields
    if (!title || !description || !start_date || !end_date || !start_time || !end_time) {
      toast.error("All fields are required.");
      return;
    }

    // Validate dates
    const startDateTime = new Date(`${start_date}T${start_time}`);
    const endDateTime = new Date(`${end_date}T${end_time}`);
    const now = new Date();

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
      console.error(
        "Error creating/updating election:",
        error.response?.data || error.message
      );
      toast.error(
        error.response?.data?.error ||
          "An error occurred while creating/updating the election."
      );
    } finally {
      setFormLoading(false);
    }
  };

  // Handle deleting an election
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
      
      // Also remove from paused elections data if it exists
      if (pausedElections[electionId]) {
        const updatedPausedElections = { ...pausedElections };
        delete updatedPausedElections[electionId];
        setPausedElections(updatedPausedElections);
        
        const updatedPausedTimes = { ...pausedTimes };
        delete updatedPausedTimes[electionId];
        setPausedTimes(updatedPausedTimes);
        
        const updatedPausedTimestamps = { ...pausedTimestamps };
        delete updatedPausedTimestamps[electionId];
        setPausedTimestamps(updatedPausedTimestamps);
      }
      
      fetchElections();
    } catch (error) {
      console.error("Error deleting election:", error.message);
      toast.error("Failed to delete the election. Try again.");
    } finally {
      setDeleteLoading(null);
      setConfirmDelete(null);
    }
  };

  // Handle toggling election status (activate/deactivate)
  const handleToggleStatus = async (electionId, isActive, silent = false) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/elections/${electionId}/status`, 
        { isactive: !isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setElections(
        elections.map((election) =>
          election.electionid === electionId
            ? { ...election, isactive: !isActive }
            : election
        )
      );
      
      // If pausing the election
      if (isActive) {
        // Store the current time remaining when paused
        const currentRemaining = timeRemaining[electionId] || 
          calculateTimeRemaining(
            elections.find(e => e.electionid === electionId).start_date,
            elections.find(e => e.electionid === electionId).start_time,
            elections.find(e => e.electionid === electionId).end_date,
            elections.find(e => e.electionid === electionId).end_time,
            electionId
          );
        
        setPausedTimes(prev => ({
          ...prev,
          [electionId]: currentRemaining
        }));
        
        // Store the timestamp when paused
        setPausedTimestamps(prev => ({
          ...prev,
          [electionId]: new Date().toISOString()
        }));
        
        setPausedElections(prev => ({
          ...prev,
          [electionId]: true
        }));
        
        if (!silent) toast.success("Election paused successfully!");
      } else {
        // If resuming the election
        setPausedElections(prev => {
          const updated = { ...prev };
          delete updated[electionId];
          return updated;
        });
        
        if (!silent) toast.success("Election activated successfully!");
      }
    } catch (error) {
      console.error("Error toggling election status:", error.message);
      if (!silent) toast.error("Failed to update election status. Try again.");
    }
  };

  // Fetch election statistics
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
      
      setViewStatsId(electionId);
    } catch (error) {
      console.error("Error fetching election stats:", error.message);
      toast.error("Failed to load election statistics.");
    }
  };

  // Export election results
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
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Election: " + election.title + "\r\n";
    csvContent += "Date: " + format(new Date(), 'yyyy-MM-dd HH:mm:ss') + "\r\n\r\n";
    csvContent += "Candidate,Party,Votes\r\n";
    
    stats.candidates.forEach(candidate => {
      csvContent += `${candidate.name},${candidate.party},${candidate.voteCount}\r\n`;
    });
    
    csvContent += "\r\nTotal Votes: " + stats.totalVotes + "\r\n";
    csvContent += "Voter Turnout: " + stats.voterTurnout + "%\r\n";
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `election_results_${election.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Election results exported successfully!");
  };

  // Calculate time remaining for an election
  const calculateTimeRemaining = (startDate, startTime, endDate, endTime, electionId) => {
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const now = new Date();
    
    // If the election is paused, use the stored pause time
    if (pausedElections[electionId]) {
      const pausedTime = pausedTimes[electionId] || { 
        status: now < start ? "Pending" : now <= end ? "Active" : "Ended",
        timeLeft: now < start ? start - now : now <= end ? end - now : 0
      };
      return pausedTime;
    }
    
    // If the election was previously paused, adjust the calculation
    if (pausedTimestamps[electionId]) {
      const pauseDuration = now - new Date(pausedTimestamps[electionId]);
      
      // Adjust start and end times by the pause duration
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
    
        // Normal calculation if never paused
        if (now < start) {
          return { status: "Pending", timeLeft: start - now };
        } else if (now >= start && now <= end) {
          return { status: "Active", timeLeft: end - now };
        } else {
          return { status: "Ended", timeLeft: 0 };
        }
      };
    
      // Format time remaining in a human-readable format
      const formatTimeRemaining = (timeLeft) => {
        if (!timeLeft) return "0m 0s";
        
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        if (days > 0) {
          return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
          return `${hours}h ${minutes}m ${seconds}s`;
        } else {
          return `${minutes}m ${seconds}s`;
        }
      };
    
      // Handle editing an election
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
        
        // Scroll to form
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      };
    
      // Reset form fields
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
    
      // Handle canceling form
      const handleCancel = () => {
        resetForm();
        setShowForm(false);
      };
    
      // Get sorted and filtered elections
      const getSortedElections = useCallback(() => {
        // Filter elections based on search term and status filter
        const filteredElections = elections.filter((election) => {
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
          
          if (filterStatus === "all") {
            return matchesSearch;
          } else if (filterStatus === "active") {
            return matchesSearch && (remaining.status === "Active" && election.isactive);
          } else if (filterStatus === "pending") {
            return matchesSearch && remaining.status === "Pending";
          } else if (filterStatus === "ended") {
            return matchesSearch && remaining.status === "Ended";
          } else if (filterStatus === "paused") {
            return matchesSearch && pausedElections[election.electionid];
          }
          
          return matchesSearch;
        });
        
        // Apply sorting
        return [...filteredElections].sort((a, b) => {
          if (sortConfig.key === 'title') {
            return sortConfig.direction === 'asc' 
              ? a.title.localeCompare(b.title)
              : b.title.localeCompare(a.title);
          } else if (sortConfig.key === 'start_date') {
            const dateA = new Date(`${a.start_date}T${a.start_time || '00:00:00'}`);
            const dateB = new Date(`${b.start_date}T${b.start_time || '00:00:00'}`);
            return sortConfig.direction === 'asc' 
              ? dateA - dateB
              : dateB - dateA;
          } else if (sortConfig.key === 'end_date') {
            const dateA = new Date(`${a.end_date}T${a.end_time || '00:00:00'}`);
            const dateB = new Date(`${b.end_date}T${b.end_time || '00:00:00'}`);
            return sortConfig.direction === 'asc' 
              ? dateA - dateB
              : dateB - dateA;
          } else if (sortConfig.key === 'status') {
            const statusA = timeRemaining[a.electionid]?.status || 'Unknown';
            const statusB = timeRemaining[b.electionid]?.status || 'Unknown';
            return sortConfig.direction === 'asc' 
              ? statusA.localeCompare(statusB)
              : statusB.localeCompare(statusA);
          }
          return 0;
        });
      }, [elections, searchTerm, filterStatus, sortConfig, timeRemaining, pausedElections]);
    
      // Get status class for styling
      const getStatusClass = (status, isActive, electionId) => {
        if (pausedElections[electionId]) return "status-paused";
        if (status === "Active" && isActive) return "status-active";
        if (status === "Pending") return "status-pending";
        if (status === "Ended") return "status-ended";
        return "";
      };
    
      // Get status text
      const getStatusText = (status, isActive, electionId) => {
        if (pausedElections[electionId]) return "Paused";
        if (status === "Active" && isActive) return "Active";
        if (status === "Active" && !isActive) return "Inactive";
        if (status === "Pending") return "Upcoming";
        if (status === "Ended") return "Ended";
        return status;
      };
    
      return (
        <div className="election-container">
          <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
          
          <div className="election-header">
            <h2>
              <FaCalendarAlt className="header-icon" /> Election Management
            </h2>
            <ButtonComponent 
              onClick={() => {
                setShowForm(!showForm);
                resetForm();
                // Scroll to form when opening
                if (!showForm) {
                  setTimeout(() => {
                    formRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="create-btn"
            >
              {showForm ? (
                <>
                  <FaTimes /> Cancel
                </>
              ) : (
                <>
                  <FaPlus /> Create Election
                </>
              )}
            </ButtonComponent>
          </div>
    
          {showForm && (
            <div className="election-form-container" ref={formRef}>
              <div className="election-form">
                <h3>{editElectionId ? "Edit Election" : "Create New Election"}</h3>
                
                <div className="form-group">
                  <label htmlFor="title">Title</label>
                  <input
                    type="text"
                    id="title"
                    value={newElection.title}
                    onChange={(e) =>
                      setNewElection({ ...newElection, title: e.target.value })
                    }
                    placeholder="Enter election title"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={newElection.description}
                    onChange={(e) =>
                      setNewElection({ ...newElection, description: e.target.value })
                    }
                    placeholder="Enter election description"
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="start_date">Start Date</label>
                    <input
                      type="date"
                      id="start_date"
                      value={newElection.start_date}
                      onChange={(e) =>
                        setNewElection({ ...newElection, start_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="start_time">Start Time</label>
                    <input
                      type="time"
                      id="start_time"
                      value={newElection.start_time}
                      onChange={(e) =>
                        setNewElection({ ...newElection, start_time: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="end_date">End Date</label>
                    <input
                      type="date"
                      id="end_date"
                      value={newElection.end_date}
                      onChange={(e) =>
                        setNewElection({ ...newElection, end_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="end_time">End Time</label>
                    <input
                      type="time"
                      id="end_time"
                      value={newElection.end_time}
                      onChange={(e) =>
                        setNewElection({ ...newElection, end_time: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <ButtonComponent
                    onClick={handleCancel}
                    className="cancel-btn"
                    disabled={formLoading}
                  >
                    <FaTimes /> Cancel
                  </ButtonComponent>
                  
                  <ButtonComponent
                    onClick={handleCreateOrUpdateElection}
                    className="submit-btn"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <span className="loading-spinner small"></span>
                    ) : editElectionId ? (
                      <>
                        <FaCheck /> Update Election
                      </>
                    ) : (
                      <>
                        <FaCheck /> Create Election
                      </>
                    )}
                  </ButtonComponent>
                </div>
              </div>
            </div>
          )}
    
          <div className="election-filters">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search elections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-options">
              <div className="filter-group">
                <FaFilter className="filter-icon" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="status-filter"
                >
                  <option value="all">All Elections</option>
                  <option value="active">Active</option>
                  <option value="pending">Upcoming</option>
                  <option value="ended">Ended</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              
              <div className="filter-group">
                <select
                  value={`${sortConfig.key}-${sortConfig.direction}`}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split('-');
                    setSortConfig({ key, direction });
                  }}
                  className="sort-filter"
                >
                  <option value="start_date-asc">Start Date (Earliest)</option>
                  <option value="start_date-desc">Start Date (Latest)</option>
                  <option value="end_date-asc">End Date (Earliest)</option>
                  <option value="end_date-desc">End Date (Latest)</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                  <option value="status-asc">Status (A-Z)</option>
                  <option value="status-desc">Status (Z-A)</option>
                </select>
              </div>
            </div>
          </div>
    
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading elections...</p>
            </div>
          ) : getSortedElections().length === 0 ? (
            <div className="no-elections">
              <FaInfoCircle className="info-icon" />
              <p>No elections found. Create a new election to get started.</p>
            </div>
          ) : (
            <div className="elections-grid">
              {getSortedElections().map((election) => {
                const remaining = timeRemaining[election.electionid] || 
                  calculateTimeRemaining(
                    election.start_date,
                    election.start_time,
                    election.end_date,
                    election.end_time,
                    election.electionid
                  );
                
                return (
                  <div 
                    key={election.electionid} 
                    className={`election-card ${
                      viewStatsId === election.electionid ? 'expanded' : ''
                    }`}
                  >
                    <div className="card-header">
                      <h3 className="election-title">{election.title}</h3>
                      <div 
                        className={`election-status ${getStatusClass(
                          remaining.status, 
                          election.isactive,
                          election.electionid
                        )}`}
                      >
                        {getStatusText(remaining.status, election.isactive, election.electionid)}
                      </div>
                    </div>
                    
                    <p className="election-description">{election.description}</p>
                    
                    <div className="election-dates">
                      <div className="date-item">
                        <FaCalendarAlt className="date-icon" />
                        <div className="date-info">
                          <span className="date-label">Start:</span>
                          <span className="date-value">
                            {new Date(
                              `${election.start_date}T${election.start_time || '00:00:00'}`
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="date-item">
                        <FaCalendarAlt className="date-icon" />
                        <div className="date-info">
                          <span className="date-label">End:</span>
                          <span className="date-value">
                            {new Date(
                              `${election.end_date}T${election.end_time || '00:00:00'}`
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="time-remaining">
                    <FaClock className="time-icon" />
                  <span className="time-text">
                    {pausedElections[election.electionid]
                      ? "Election Paused"
                      : remaining.status === "Pending"
                      ? `Starts in: ${formatTimeRemaining(remaining.timeLeft)}`
                      : remaining.status === "Active"
                      ? `Ends in: ${formatTimeRemaining(remaining.timeLeft)}`
                      : "Election Ended"}
                  </span>
                </div>
                
                <div className="card-actions">
                  <button 
                    className="action-btn view-btn"
                    onClick={() => {
                      if (viewStatsId === election.electionid) {
                        setViewStatsId(null);
                      } else {
                        fetchElectionStats(election.electionid);
                      }
                    }}
                  >
                    <FaEye />
                    <span className="btn-text">
                      {viewStatsId === election.electionid ? "Hide Stats" : "View Stats"}
                    </span>
                  </button>
                  
                  <button 
                    className="action-btn edit-btn"
                    onClick={() => handleEditElection(election)}
                    disabled={remaining.status === "Ended"}
                  >
                    <FaEdit />
                    <span className="btn-text">Edit</span>
                  </button>
                  
                  <button 
                    className={`action-btn toggle-btn ${pausedElections[election.electionid] ? 'paused' : ''}`}
                    onClick={() => handleToggleStatus(election.electionid, election.isactive)}
                    disabled={remaining.status === "Ended" || remaining.status === "Pending"}
                  >
                    {pausedElections[election.electionid] ? <FaToggleOff /> : <FaToggleOn />}
                    <span className="btn-text">
                      {pausedElections[election.electionid] ? "Resume" : "Pause"}
                    </span>
                  </button>
                  
                  <button 
                    className="action-btn export-btn"
                    onClick={() => exportElectionResults(election.electionid)}
                  >
                    <FaDownload />
                    <span className="btn-text">Export</span>
                  </button>
                  
                  <button 
                    className={`action-btn delete-btn ${confirmDelete === election.electionid ? 'confirm' : ''}`}
                    onClick={() => handleDeleteElection(election.electionid)}
                    disabled={deleteLoading === election.electionid}
                  >
                    {deleteLoading === election.electionid ? (
                      <span className="loading-spinner small"></span>
                    ) : (
                      <FaTrash />
                    )}
                    <span className="btn-text">
                      {confirmDelete === election.electionid ? "Confirm" : "Delete"}
                    </span>
                  </button>
                </div>
                
                {viewStatsId === election.electionid && (
                  <div className="election-stats">
                    <h4 className="stats-title">Election Statistics</h4>
                    
                    {!electionStats[election.electionid] ? (
                      <div className="loading-stats">
                        <span className="loading-spinner small"></span>
                        <p>Loading statistics...</p>
                      </div>
                    ) : (
                      <>
                        <div className="stats-summary">
                          <div className="stat-item">
                            <span className="stat-label">Total Votes:</span>
                            <span className="stat-value">
                              {electionStats[election.electionid].totalVotes || 0}
                            </span>
                          </div>
                          
                          <div className="stat-item">
                            <span className="stat-label">Voter Turnout:</span>
                            <span className="stat-value">
                              {electionStats[election.electionid].voterTurnout || 0}%
                            </span>
                          </div>
                          
                          <div className="stat-item">
                            <span className="stat-label">Candidates:</span>
                            <span className="stat-value">
                              {electionStats[election.electionid].candidates?.length || 0}
                            </span>
                          </div>
                        </div>
                        
                        <div className="candidates-list">
                          <h5 className="candidates-title">Candidates Results</h5>
                          
                          {electionStats[election.electionid].candidates?.length > 0 ? (
                            <div className="candidates-table-wrapper">
                              <table className="candidates-table">
                                <thead>
                                  <tr>
                                    <th>Candidate</th>
                                    <th>Party</th>
                                    <th>Votes</th>
                                    <th>Percentage</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {electionStats[election.electionid].candidates
                                    .sort((a, b) => b.voteCount - a.voteCount)
                                    .map((candidate, index) => (
                                      <tr 
                                        key={index}
                                        className={index === 0 && candidate.voteCount > 0 ? 'leading-candidate' : ''}
                                      >
                                        <td>{candidate.name}</td>
                                        <td>{candidate.party}</td>
                                        <td>{candidate.voteCount || 0}</td>
                                        <td>
                                          {electionStats[election.electionid].totalVotes > 0
                                            ? ((candidate.voteCount / electionStats[election.electionid].totalVotes) * 100).toFixed(1)
                                            : 0}%
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="no-candidates">No candidates registered for this election.</p>
                          )}
                        </div>
                        
                        <div className="stats-actions">
                          <button 
                            className="history-btn"
                            onClick={() => {
                              // Implement view history functionality
                              toast.info("Election history feature coming soon!");
                            }}
                          >
                            <FaHistory /> View Election History
                          </button>
                          
                          <button 
                            className="export-stats-btn"
                            onClick={() => exportElectionResults(election.electionid)}
                          >
                            <FaDownload /> Export Results
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Election;
