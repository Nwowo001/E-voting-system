import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUserContext } from "../../../Context/UserContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  FaUserTie, 
  FaEdit, 
  FaTrash, 
  FaPlus, 
  FaTimes, 
  FaCheck, 
  FaSearch, 
  FaFilter, 
  FaSort, 
  FaChartBar, 
  FaDownload,
  FaFlag,
  FaEye,
  FaUser
} from "react-icons/fa";
import "./Candidate.css";

const API_URL = "http://localhost:5000/api";

const Candidate = () => {
  const { user } = useUserContext();
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    party: "",
    electionId: "",
    picture: null,
    manifesto: "",
    position: "",
    biography: ""
  });
  const [picturePreview, setPicturePreview] = useState(null);
  const [elections, setElections] = useState([]);
  const [editCandidateId, setEditCandidateId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterElection, setFilterElection] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [viewCandidateId, setViewCandidateId] = useState(null);
  const [candidateStats, setCandidateStats] = useState({});
  const [parties, setParties] = useState([]);
  const formRef = useRef(null);

  useEffect(() => {
    fetchCandidates();
    fetchElections();
  }, []);

  // Extract unique parties from candidates for filtering
  useEffect(() => {
    const uniqueParties = [...new Set(candidates.map(candidate => candidate.party))];
    setParties(uniqueParties);
  }, [candidates]);

  const fetchCandidates = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidates(response.data);
    } catch (err) {
      toast.error("Failed to fetch candidates.");
      setError("Failed to fetch candidates.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchElections = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/elections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setElections(response.data);
    } catch (err) {
      toast.error("Failed to fetch elections.");
      setError("Failed to fetch elections.");
    }
  };

  const fetchCandidateStats = async (candidateId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/stats/candidates/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCandidateStats(prev => ({
        ...prev,
        [candidateId]: response.data
      }));
      
      setViewCandidateId(candidateId);
    } catch (error) {
      console.error("Error fetching candidate stats:", error.message);
      toast.error("Failed to load candidate statistics.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image size should be less than 5MB");
        return;
      }
      
      setNewCandidate({ ...newCandidate, picture: file });
      setPicturePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    
    // Validate form fields
    if (!newCandidate.name.trim()) {
      toast.error("Candidate name is required");
      setError("Candidate name is required");
      return;
    }
    if (!newCandidate.party.trim()) {
      toast.error("Party is required");
      setError("Party is required");
      return;
    }
    if (!newCandidate.electionId) {
      toast.error("Please select an election");
      setError("Please select an election");
      return;
    }
    if (!editCandidateId && !newCandidate.picture) {
      toast.error("Please upload a candidate picture");
      setError("Please upload a candidate picture");
      return;
    }
    
    setIsLoading(true);

    const formData = new FormData();
    formData.append("name", newCandidate.name);
    formData.append("party", newCandidate.party);
    formData.append("electionId", newCandidate.electionId);
    formData.append("position", newCandidate.position || "");
    formData.append("manifesto", newCandidate.manifesto || "");
    formData.append("biography", newCandidate.biography || "");
    
    if (newCandidate.picture) {
      formData.append("picture", newCandidate.picture);
    }

    try {
      const token = localStorage.getItem("token");
      if (editCandidateId) {
        await axios.put(`${API_URL}/candidates/${editCandidateId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Candidate updated successfully!");
        setSuccessMessage("Candidate updated successfully!");
      } else {
        await axios.post(`${API_URL}/candidates`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Candidate added successfully!");
        setSuccessMessage("Candidate added successfully!");
      }
      fetchCandidates();
      resetForm();
      setShowForm(false);
    } catch (err) {
      toast.error("An error occurred while saving the candidate.");
      setError("An error occurred while saving the candidate.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewCandidate({ 
      name: "", 
      party: "", 
      electionId: "", 
      picture: null,
      manifesto: "",
      position: "",
      biography: ""
    });
    setPicturePreview(null);
    setEditCandidateId(null);
    setError("");
    setSuccessMessage("");
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (candidate) => {
    setShowForm(true);
    
    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    setEditCandidateId(candidate.candidateid);
    setNewCandidate({
      name: candidate.name,
      party: candidate.party,
      electionId: candidate.electionid,
      position: candidate.position || "",
      manifesto: candidate.manifesto || "",
      biography: candidate.biography || "",
      picture: null, // Reset picture since we don't need to edit it immediately
    });
    
    // Clear any existing messages
    setError("");
    setSuccessMessage("");
  };

  const handleDisqualify = async (candidateId) => {
    if (confirmDelete !== candidateId) {
      setConfirmDelete(candidateId);
      return;
    }
    
    try {
      setDeleteLoading(candidateId);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/candidates/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Candidate disqualified successfully!");
      setSuccessMessage("Candidate disqualified successfully!");
      fetchCandidates();
    } catch (err) {
      toast.error("Failed to disqualify candidate.");
      setError("Failed to disqualify candidate.");
    } finally {
      setDeleteLoading(null);
      setConfirmDelete(null);
    }
  };

  const toggleForm = () => {
    setShowForm(!showForm);
    if (!showForm) {
      resetForm();
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Export candidate profile
  const exportCandidateProfile = (candidate) => {
    // Create text content for export
    let content = "data:text/plain;charset=utf-8,";
    content += `CANDIDATE PROFILE\n`;
    content += `=================\n\n`;
    content += `Name: ${candidate.name}\n`;
    content += `Party: ${candidate.party}\n`;
    content += `Position: ${candidate.position || "N/A"}\n`;
    content += `Election: ${elections.find(e => e.electionid === candidate.electionid)?.title || "Unknown"}\n\n`;
    content += `Biography:\n${candidate.biography || "No biography provided."}\n\n`;
    content += `Manifesto:\n${candidate.manifesto || "No manifesto provided."}\n\n`;
    
    // Create download link
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `candidate_profile_${candidate.name.replace(/\s+/g, '_')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Candidate profile exported successfully!");
  };

  // Sort candidates
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted and filtered candidates
  const getSortedCandidates = () => {
    const filteredCandidates = candidates.filter(candidate => {
      // Apply search filter
      const matchesSearch = 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.party.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Apply election filter
      const matchesElection = filterElection ? candidate.electionid === parseInt(filterElection) : true;
      
      // Apply party filter
      const matchesParty = filterParty ? candidate.party === filterParty : true;
      
      return matchesSearch && matchesElection && matchesParty;
    });
    
    // Apply sorting
    return [...filteredCandidates].sort((a, b) => {
      if (sortConfig.key === 'election') {
        const electionA = elections.find(e => e.electionid === a.electionid)?.title || '';
        const electionB = elections.find(e => e.electionid === b.electionid)?.title || '';
        
        if (electionA < electionB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (electionA > electionB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      } else {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      }
    });
  };

  const sortedCandidates = getSortedCandidates();

  return (
    <div className="candidate-container">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="candidate-header">
        <h3><FaUserTie className="header-icon" /> Manage Candidates</h3>
        <button 
          className="toggle-form-button"
          onClick={toggleForm}
        >
          {showForm ? (
            <>
              <FaTimes style={{marginRight: '8px'}} /> Hide Form
            </>
          ) : (
            <>
              <FaPlus style={{marginRight: '8px'}} /> Add Candidate
            </>
          )}
        </button>
      </div>

      {/* Candidate Form */}
      {showForm && (
        <div className="candidate-form-container" ref={formRef}>
          <div className="form-header">
            <h3>{editCandidateId ? "Edit Candidate" : "Add New Candidate"}</h3>
          </div>
          
          <form className="candidate-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="name">
                  <FaUser style={{marginRight: '8px', color: '#3498db'}} /> Candidate Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Candidate Name"
                  value={newCandidate.name}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, name: e.target.value })
                  }
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="party">
                  <FaFlag style={{marginRight: '8px', color: '#3498db'}} /> Party
                </label>
                <input
                  id="party"
                  type="text"
                  placeholder="Party"
                  value={newCandidate.party}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, party: e.target.value })
                  }
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="position">
                  <FaUserTie style={{marginRight: '8px', color: '#3498db'}} /> Position
                </label>
                <input
                  id="position"
                  type="text"
                  placeholder="Position (e.g., President, Governor)"
                  value={newCandidate.position}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, position: e.target.value })
                  }
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="election">
                  <FaChartBar style={{marginRight: '8px', color: '#3498db'}} /> Election
                </label>
                <select
                  id="election"
                  value={newCandidate.electionId}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, electionId: e.target.value })
                  }
                >
                  <option value="">Select Election</option>
                  {elections.map((election) => (
                    <option key={election.electionid} value={election.electionid}>
                      {election.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="input-group full-width">
                <label htmlFor="picture">
                  <FaUser style={{marginRight: '8px', color: '#3498db'}} /> Candidate Picture
                </label>
                <div className="file-input-container">
                  <input
                    id="picture"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  <div className="file-input-label">
                    {picturePreview ? "Change Picture" : "Choose Picture"}
                  </div>
                </div>
                {picturePreview && (
                  <div className="picture-preview">
                    <img src={picturePreview} alt="Preview" />
                  </div>
                )}
              </div>
              
              <div className="input-group full-width">
                <label htmlFor="biography">
                  <FaUser style={{marginRight: '8px', color: '#3498db'}} /> Biography
                </label>
                <textarea
                  id="biography"
                  placeholder="Candidate Biography"
                  value={newCandidate.biography}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, biography: e.target.value })
                  }
                  rows={4}
                ></textarea>
              </div>
              
              <div className="input-group full-width">
                <label htmlFor="manifesto">
                  <FaFlag style={{marginRight: '8px', color: '#3498db'}} /> Manifesto
                </label>
                <textarea
                  id="manifesto"
                  placeholder="Candidate Manifesto"
                  value={newCandidate.manifesto}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, manifesto: e.target.value })
                  }
                  rows={4}
                ></textarea>
              </div>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
            
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <FaTimes style={{marginRight: '8px'}} /> Cancel
              </button>
              
              <button 
                type="submit" 
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="button-loader"></div>
                ) : editCandidateId ? (
                  <>
                    <FaCheck style={{marginRight: '8px'}} /> Update Candidate
                  </>
                ) : (
                  <>
                    <FaCheck style={{marginRight: '8px'}} /> Add Candidate
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters and Search */}
      <div className="candidate-filters">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-options">
          <div className="filter-group">
            <FaFilter style={{marginRight: '8px'}} />
            <select
              value={filterElection}
              onChange={(e) => setFilterElection(e.target.value)}
              className="filter-select"
            >
              <option value="">All Elections</option>
              {elections.map((election) => (
                <option key={election.electionid} value={election.electionid}>
                  {election.title}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <FaFlag style={{marginRight: '8px'}} />
            <select
              value={filterParty}
              onChange={(e) => setFilterParty(e.target.value)}
              className="filter-select"
            >
              <option value="">All Parties</option>
              {parties.map((party) => (
                <option key={party} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <FaSort style={{marginRight: '8px'}} />
            <select
              value={`${sortConfig.key}-${sortConfig.direction}`}
              onChange={(e) => {
                const [key, direction] = e.target.value.split('-');
                setSortConfig({ key, direction });
              }}
              className="filter-select"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="party-asc">Party (A-Z)</option>
              <option value="party-desc">Party (Z-A)</option>
              <option value="election-asc">Election (A-Z)</option>
              <option value="election-desc">Election (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      {isLoading && !candidates.length ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading candidates...</p>
        </div>
      ) : sortedCandidates.length === 0 ? (
        <div className="no-candidates">
          <FaUserTie className="no-data-icon" />
          <p>No candidates found. Add a new candidate to get started.</p>
        </div>
      ) : (
        <div className="candidates-grid">
          {sortedCandidates.map((candidate) => (
            <div 
              key={candidate.candidateid} 
              className={`candidate-card ${viewCandidateId === candidate.candidateid ? 'expanded' : ''}`}
            >
              <div className="candidate-image">
                {candidate.image_url ? (
                  <img 
                    src={candidate.image_url.startsWith('http') 
                      ? candidate.image_url 
                      : `http://localhost:5000${candidate.image_url.startsWith('/') ? '' : '/'}${candidate.image_url}`} 
                    alt={candidate.name} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      const placeholder = document.createElement('div');
                      placeholder.className = 'placeholder-image';
                      placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="48" height="48"><path fill="currentColor" d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z"></path></svg>';
                      e.target.parentNode.appendChild(placeholder);
                    }}
                  />
                ) : (
                  <div className="placeholder-image">
                  <FaUserTie size={48} />
                </div>
                
                )}
              </div>
              
              <div className="candidate-info">
                <h3 className="candidate-name">{candidate.name}</h3>
                <div className="candidate-party">{candidate.party}</div>
                <div className="candidate-election">
                  {elections.find(e => e.electionid === candidate.electionid)?.title || "Unknown Election"}
                </div>
                {candidate.position && (
                  <div className="candidate-position">{candidate.position}</div>
                )}
              </div>
              
              <div className="candidate-actions">
  <button
    className="view-btn"
    onClick={() => setViewCandidateId(viewCandidateId === candidate.candidateid ? null : candidate.candidateid)}
    title="View Details"
  >
    <FaEye className="action-icon" />
    <span className="action-text">View</span>
  </button>
  
  <button
    className="stats-btn"
    onClick={() => fetchCandidateStats(candidate.candidateid)}
    title="View Statistics"
  >
    <FaChartBar className="action-icon" />
    <span className="action-text">Stats</span>
  </button>
  
  <button
    className="export-btn"
    onClick={() => exportCandidateProfile(candidate)}
    title="Export Profile"
  >
    <FaDownload className="action-icon" />
    <span className="action-text">Export</span>
  </button>
  
  <button
    className="edit-btn"
    onClick={() => handleEdit(candidate)}
    title="Edit Candidate"
  >
    <FaEdit className="action-icon" />
    <span className="action-text">Edit</span>
  </button>
  
  <button
    className={`delete-btn ${confirmDelete === candidate.candidateid ? 'confirm' : ''}`}
    onClick={() => handleDisqualify(candidate.candidateid)}
    disabled={deleteLoading === candidate.candidateid}
    title={confirmDelete === candidate.candidateid ? "Confirm Disqualify" : "Disqualify Candidate"}
  >
    {deleteLoading === candidate.candidateid ? (
      <div className="button-loader"></div>
    ) : confirmDelete === candidate.candidateid ? (
      <FaCheck className="action-icon" />
    ) : (
      <FaTrash className="action-icon" />
    )}
    <span className="action-text">
      {confirmDelete === candidate.candidateid ? "Confirm" : "Disqualify"}
    </span>
  </button>
</div>

              
              {/* Expanded View */}
              {viewCandidateId === candidate.candidateid && (
                <div className="candidate-details">
                  <div className="details-section">
                    <h4>Candidate Details</h4>
                    
                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Full Name:</span>
                        <span className="detail-value">{candidate.name}</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Party:</span>
                        <span className="detail-value">{candidate.party}</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Position:</span>
                        <span className="detail-value">{candidate.position || "Not specified"}</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="detail-label">Election:</span>
                        <span className="detail-value">
                          {elections.find(e => e.electionid === candidate.electionid)?.title || "Unknown"}
                        </span>
                      </div>
                    </div>
                    
                    {candidate.biography && (
                      <div className="biography-section">
                        <h5>Biography</h5>
                        <p>{candidate.biography}</p>
                      </div>
                    )}
                    
                    {candidate.manifesto && (
                      <div className="manifesto-section">
                        <h5>Manifesto</h5>
                        <p>{candidate.manifesto}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Statistics Section */}
                  {candidateStats[candidate.candidateid] && (
                    <div className="stats-section">
                      <h4>Candidate Statistics</h4>
                      
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-label">Total Votes:</span>
                          <span className="stat-value">{candidateStats[candidate.candidateid].voteCount || 0}</span>
                        </div>
                        
                        <div className="stat-item">
                          <span className="stat-label">Vote Percentage:</span>
                          <span className="stat-value">
                            {candidateStats[candidate.candidateid].votePercentage || 0}%
                          </span>
                        </div>
                        
                        <div className="stat-item">
                          <span className="stat-label">Ranking:</span>
                          <span className="stat-value">
                            {candidateStats[candidate.candidateid].ranking || "N/A"}
                          </span>
                        </div>
                      </div>
                      
                      {/* Vote Trend Graph would go here */}
                      <div className="vote-trend">
                        <h5>Vote Trend</h5>
                        <div className="trend-placeholder">
                          <p>Vote trend visualization coming soon</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Candidate;
