import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  FaUserPlus, 
  FaSearch, 
  FaFilter, 
  FaTrash, 
  FaEnvelope, 
  FaIdCard, 
  FaUserCheck, 
  FaUserTimes, 
  FaFileExport, 
  FaSort, 
  FaSortUp, 
  FaSortDown,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
  FaUserEdit,
  FaFileImport
} from "react-icons/fa";
import "./Voters.css";

const API_URL = "http://localhost:5000/api";

const Voters = () => {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voterAnalytics, setVoterAnalytics] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVoters, setSelectedVoters] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVerified, setFilterVerified] = useState("all");
  const [showAddVoterForm, setShowAddVoterForm] = useState(false);
  const [newVoter, setNewVoter] = useState({
    name: "",
    email: "",
    nin: "",
    password: "",
    confirmPassword: "",
    role: "voter"
  });
  const [editingVoter, setEditingVoter] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const formRef = useRef(null);
  const votersPerPage = 10;

  useEffect(() => {
    fetchVoters();
  }, []);

  useEffect(() => {
    if (selectAll) {
      const filteredVoterIds = getFilteredVoters().map(voter => voter.id);
      setSelectedVoters(filteredVoterIds);
    } else if (selectedVoters.length === getFilteredVoters().length) {
      // If user manually selected all voters, and then deselects one
      setSelectAll(false);
    }
  }, [selectAll, voters, searchTerm, filterStatus, filterVerified]);

  const fetchVoters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/voters`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        withCredentials: true,
      });

      const updatedVoters = response.data.map((voter) => ({
        ...voter,
        verified: voter.verified || true,
        inactiveFlag: voter.missedElections >= 3,
      }));

      setVoters(updatedVoters);
      setVoterAnalytics({
        total: updatedVoters.length,
        verified: updatedVoters.filter((voter) => voter.verified).length,
        inactive: updatedVoters.filter((voter) => voter.inactiveFlag).length,
        active: updatedVoters.filter((voter) => !voter.inactiveFlag).length,
        unverified: updatedVoters.filter((voter) => !voter.verified).length,
      });
      setError(null);
    } catch (err) {
      setError("Failed to fetch voters. Please try again later.");
      toast.error("Failed to fetch voters. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDeleteSelected = async () => {
    if (selectedVoters.length === 0) {
      toast.warning("No voters selected for deletion");
      return;
    }

    if (confirmAction !== 'delete-selected') {
      setConfirmAction('delete-selected');
      return;
    }

    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/voters/delete-multiple`,
        { voterIds: selectedVoters },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          withCredentials: true,
        }
      );

      toast.success(`Successfully deleted ${selectedVoters.length} voters`);
      fetchVoters();
      setSelectedVoters([]);
      setSelectAll(false);
      setConfirmAction(null);
    } catch (err) {
      setError("Failed to delete selected voters.");
      toast.error("Failed to delete selected voters.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteInactive = async () => {
    const inactiveVoters = voters.filter(voter => voter.inactiveFlag).map(voter => voter.id);
    
    if (inactiveVoters.length === 0) {
      toast.warning("No inactive voters to delete");
      return;
    }

    if (confirmAction !== 'delete-inactive') {
      setConfirmAction('delete-inactive');
      return;
    }

    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${API_URL}/voters/inactive`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          withCredentials: true,
        }
      );

      toast.success(`Successfully deleted ${response.data.deletedVoters.length} inactive voters`);
      fetchVoters();
      setSelectedVoters([]);
      setConfirmAction(null);
    } catch (err) {
      setError("Failed to delete inactive voters.");
      toast.error("Failed to delete inactive voters.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyVoter = async (voterId) => {
    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/voters/${voterId}/verify`,
        {},
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          withCredentials: true,
        }
      );

      toast.success("Voter verified successfully");
      fetchVoters();
    } catch (err) {
      setError("Failed to verify voter.");
      toast.error("Failed to verify voter.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifySelected = async () => {
    if (selectedVoters.length === 0) {
      toast.warning("No voters selected for verification");
      return;
    }

    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/voters/verify-multiple`,
        { voterIds: selectedVoters },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          withCredentials: true,
        }
      );

      toast.success(`Successfully verified ${selectedVoters.length} voters`);
      fetchVoters();
      setSelectedVoters([]);
      setSelectAll(false);
    } catch (err) {
      setError("Failed to verify selected voters.");
      toast.error("Failed to verify selected voters.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddVoter = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newVoter.name || !newVoter.email || !newVoter.nin) {
      toast.error("Please fill all required fields");
      return;
    }

    if (newVoter.password !== newVoter.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/auth/register`,
        {
          name: newVoter.name,
          email: newVoter.email,
          nin: newVoter.nin,
          password: newVoter.password,
          role: newVoter.role
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          withCredentials: true,
        }
      );

      toast.success("Voter added successfully");
      fetchVoters();
      setNewVoter({
        name: "",
        email: "",
        nin: "",
        password: "",
        confirmPassword: "",
        role: "voter"
      });
      setShowAddVoterForm(false);
    } catch (err) {
      setError("Failed to add voter.");
      toast.error(err.response?.data?.error || "Failed to add voter.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateVoter = async (e) => {
    e.preventDefault();
    
    if (!editingVoter.name || !editingVoter.email) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/voters/${editingVoter.id}`,
        {
          name: editingVoter.name,
          email: editingVoter.email,
          verified: editingVoter.verified
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          withCredentials: true,
        }
      );

      toast.success("Voter updated successfully");
      fetchVoters();
      setEditingVoter(null);
    } catch (err) {
      setError("Failed to update voter.");
      toast.error("Failed to update voter.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportVoters = async (e) => {
    e.preventDefault();
    
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    const formData = new FormData();
    formData.append('votersFile', importFile);

    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/voters/import`,
        formData,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true,
        }
      );

      toast.success(`Successfully imported ${response.data.imported} voters`);
      fetchVoters();
      setImportFile(null);
      // Reset file input
      e.target.reset();
    } catch (err) {
      setError("Failed to import voters.");
      toast.error(err.response?.data?.error || "Failed to import voters.");
    } finally {
      setIsProcessing(false);
    }
  };

  const exportVoters = () => {
    const filteredVoters = getFilteredVoters();
    
    if (filteredVoters.length === 0) {
      toast.warning("No voters to export");
      return;
    }

    // Create CSV content
    const headers = ["Name", "Email", "Voter ID", "NIN", "Verified", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredVoters.map(voter => [
        voter.name,
        voter.email,
        voter.voterid,
        voter.nin,
        voter.verified ? "Yes" : "No",
        voter.inactiveFlag ? "Inactive" : "Active"
      ].join(","))
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "voters_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Voters exported successfully");
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getFilteredVoters = () => {
    return voters.filter(voter => {
      // Apply search filter
      const matchesSearch = 
        voter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.voterid?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Apply status filter
      const matchesStatus = 
        filterStatus === "all" ||
        (filterStatus === "active" && !voter.inactiveFlag) ||
        (filterStatus === "inactive" && voter.inactiveFlag);
      
      // Apply verification filter
      const matchesVerified = 
        filterVerified === "all" ||
        (filterVerified === "verified" && voter.verified) ||
        (filterVerified === "unverified" && !voter.verified);
      
      return matchesSearch && matchesStatus && matchesVerified;
    });
  };

  const getSortedVoters = () => {
    const filteredVoters = getFilteredVoters();
    
    return [...filteredVoters].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getPaginatedVoters = () => {
    const sortedVoters = getSortedVoters();
    const startIndex = (currentPage - 1) * votersPerPage;
    return sortedVoters.slice(startIndex, startIndex + votersPerPage);
  };

  const totalPages = Math.ceil(getFilteredVoters().length / votersPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSelectVoter = (voterId) => {
    setSelectedVoters(prev => {
      if (prev.includes(voterId)) {
        return prev.filter(id => id !== voterId);
      } else {
        return [...prev, voterId];
      }
    });
  };

  const handleSelectAllChange = () => {
    setSelectAll(!selectAll);
  };

  const handleEditVoter = (voter) => {
    setEditingVoter({
      id: voter.id,
      name: voter.name,
      email: voter.email,
      verified: voter.verified
    });
    
    // Scroll to form
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingVoter(null);
  };

  const handleFileChange = (e) => {
    setImportFile(e.target.files[0]);
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination">
        <button 
          onClick={() => handlePageChange(1)} 
          disabled={currentPage === 1}
          className="pagination-button"
        >
          &laquo;
        </button>
        <button 
          onClick={() => handlePageChange(currentPage - 1)} 
          disabled={currentPage === 1}
          className="pagination-button"
        >
          &lsaquo;
        </button>
        
        {startPage > 1 && (
          <>
            <button onClick={() => handlePageChange(1)} className="pagination-button">1</button>
            {startPage > 2 && <span className="pagination-ellipsis">...</span>}
          </>
        )}
        
        {pageNumbers.map(number => (
          <button
            key={number}
            onClick={() => handlePageChange(number)}
            className={`pagination-button ${currentPage === number ? 'active' : ''}`}
          >
            {number}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
            <button onClick={() => handlePageChange(totalPages)} className="pagination-button">{totalPages}</button>
          </>
        )}
        
        <button 
          onClick={() => handlePageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
          className="pagination-button"
        >
          &rsaquo;
        </button>
        <button 
          onClick={() => handlePageChange(totalPages)} 
          disabled={currentPage === totalPages}
          className="pagination-button"
        >
          &raquo;
        </button>
      </div>
    );
  };

  return (
    <div className="voters-container">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="voters-header">
        <h2>Voter Management</h2>
        <div className="header-actions">
          <button 
            className="add-voter-btn" 
            onClick={() => {
              setShowAddVoterForm(!showAddVoterForm);
              setEditingVoter(null);
            }}
          >
            <FaUserPlus /> {showAddVoterForm ? "Cancel" : "Add Voter"}
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="analytics-cards">
        <div className="analytics-card">
          <div className="analytics-icon total">
            <FaIdCard />
          </div>
          <div className="analytics-content">
            <h3>Total Voters</h3>
            <p>{voterAnalytics.total || 0}</p>
          </div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-icon active">
            <FaUserCheck />
          </div>
          <div className="analytics-content">
            <h3>Active Voters</h3>
            <p>{voterAnalytics.active || 0}</p>
          </div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-icon inactive">
            <FaUserTimes />
          </div>
          <div className="analytics-content">
            <h3>Inactive Voters</h3>
            <p>{voterAnalytics.inactive || 0}</p>
          </div>
        </div>
        
        <div className="analytics-card">
          <div className="analytics-icon verified">
            <FaCheckCircle />
          </div>
          <div className="analytics-content">
            <h3>Verified Voters</h3>
            <p>{voterAnalytics.verified || 0}</p>
          </div>
        </div>
      </div>

      {/* Forms */}
      {(showAddVoterForm || editingVoter) && (
        <div className="voter-form-container" ref={formRef}>
          <h3>{editingVoter ? "Edit Voter" : "Add New Voter"}</h3>
          <form onSubmit={editingVoter ? handleUpdateVoter : handleAddVoter}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  value={editingVoter ? editingVoter.name : newVoter.name}
                  onChange={(e) => 
                    editingVoter 
                      ? setEditingVoter({...editingVoter, name: e.target.value})
                      : setNewVoter({...newVoter, name: e.target.value})
                  }
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={editingVoter ? editingVoter.email : newVoter.email}
                  onChange={(e) => 
                    editingVoter 
                      ? setEditingVoter({...editingVoter, email: e.target.value})
                      : setNewVoter({...newVoter, email: e.target.value})
                  }
                  required
                />
              </div>
              
              {!editingVoter && (
                <div className="form-group">
                  <label htmlFor="nin">National ID Number</label>
                  <input
                    type="text"
                    id="nin"
                    value={newVoter.nin}
                    onChange={(e) => setNewVoter({...newVoter, nin: e.target.value})}
                    required
                  />
                </div>
              )}
              
              {editingVoter && (
                <div className="form-group">
                  <label htmlFor="verified">Verification Status</label>
                  <select
                    id="verified"
                    value={editingVoter.verified}
                    onChange={(e) => setEditingVoter({
                      ...editingVoter, 
                      verified: e.target.value === "true"
                    })}
                  >
                    <option value="true">Verified</option>
                    <option value="false">Unverified</option>
                  </select>
                </div>
              )}
              
              {!editingVoter && (
                <>
                  <div className="form-group password-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-input-container">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={newVoter.password}
                        onChange={(e) => setNewVoter({...newVoter, password: e.target.value})}
                        required
                      />
                      <button 
                        type="button" 
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={newVoter.confirmPassword}
                      onChange={(e) => setNewVoter({...newVoter, confirmPassword: e.target.value})}
                      required
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => editingVoter ? handleCancelEdit() : setShowAddVoterForm(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="loading-spinner"></span>
                ) : editingVoter ? (
                  "Update Voter"
                ) : (
                  "Add Voter"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Voters Form */}
      <div className="import-export-section">
        <div className="import-section">
          <h3>Import Voters</h3>
          <form onSubmit={handleImportVoters} className="import-form">
            <div className="file-input-container">
              <input 
                type="file" 
                id="importFile" 
                accept=".csv,.xlsx,.xls" 
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="importFile" className="file-label">
                <FaFileImport /> {importFile ? importFile.name : "Choose File"}
              </label>
            </div>
            <button 
              type="submit" 
              className="import-btn"
              disabled={!importFile || isProcessing}
            >
              {isProcessing ? <span className="loading-spinner"></span> : "Import"}
            </button>
          </form>
          <div className="import-instructions">
            <p>Upload a CSV or Excel file with columns: name, email, nin, password</p>
            <a href="#" className="template-link">Download Template</a>
          </div>
        </div>
        
        <div className="export-section">
          <h3>Export Voters</h3>
          <button 
            className="export-btn" 
            onClick={exportVoters}
            disabled={getFilteredVoters().length === 0}
          >
            <FaFileExport /> Export to CSV
          </button>
          <p className="export-note">Exports currently filtered voters</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="voters-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email or voter ID..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <div className="filter-group">
            <label htmlFor="status-filter">
              <FaFilter /> Status:
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="verified-filter">
              <FaFilter /> Verification:
            </label>
            <select
              id="verified-filter"
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bulk-actions">
        <button 
          className={`action-btn delete-btn ${confirmAction === 'delete-selected' ? 'confirm' : ''}`}
          onClick={handleDeleteSelected}
          disabled={selectedVoters.length === 0 || isProcessing}
        >
          {confirmAction === 'delete-selected' ? (
            <>Confirm Delete ({selectedVoters.length})</>
          ) : (
            <><FaTrash /> Delete Selected</>
          )}
        </button>
        
        <button 
          className="action-btn verify-btn"
          onClick={handleVerifySelected}
          disabled={selectedVoters.length === 0 || isProcessing}
        >
          <FaUserCheck /> Verify Selected
        </button>
        
        <button 
                  className={`action-btn delete-inactive-btn ${confirmAction === 'delete-inactive' ? 'confirm' : ''}`}
                  onClick={handleDeleteInactive}
                  disabled={voterAnalytics.inactive === 0 || isProcessing}
                >
                  {confirmAction === 'delete-inactive' ? (
                    <>Confirm Delete Inactive</>
                  ) : (
                    <><FaUserTimes /> Delete Inactive</>
                  )}
                </button>
              </div>
        
              {/* Voters Table */}
              {loading ? (
                <div className="loading-container">
                  <div className="loader"></div>
                  <p>Loading voters...</p>
                </div>
              ) : error ? (
                <div className="error-message">
                  <p>{error}</p>
                  <button onClick={fetchVoters} className="retry-btn">Retry</button>
                </div>
              ) : getFilteredVoters().length === 0 ? (
                <div className="no-voters">
                  <FaUserTimes size={48} />
                  <h3>No voters found</h3>
                  <p>
                    {searchTerm ? 
                      "No voters match your search criteria." : 
                      "There are no voters in the system yet."}
                  </p>
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="clear-search-btn">
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="voters-table-container">
                    <table className="voters-table">
                      <thead>
                        <tr>
                          <th className="checkbox-column">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAllChange}
                            />
                          </th>
                          <th className="sortable" onClick={() => handleSort('name')}>
                            Name {renderSortIcon('name')}
                          </th>
                          <th className="sortable" onClick={() => handleSort('email')}>
                            Email {renderSortIcon('email')}
                          </th>
                          <th className="sortable" onClick={() => handleSort('voterid')}>
                            Voter ID {renderSortIcon('voterid')}
                          </th>
                          <th className="sortable" onClick={() => handleSort('verified')}>
                            Verified {renderSortIcon('verified')}
                          </th>
                          <th className="sortable" onClick={() => handleSort('inactiveFlag')}>
                            Status {renderSortIcon('inactiveFlag')}
                          </th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedVoters().map((voter) => (
                          <tr key={voter.id} className={voter.inactiveFlag ? "inactive-row" : ""}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedVoters.includes(voter.id)}
                                onChange={() => handleSelectVoter(voter.id)}
                              />
                            </td>
                            <td>{voter.name}</td>
                            <td>{voter.email}</td>
                            <td>{voter.voterid}</td>
                            <td>
                              {voter.verified ? (
                                <span className="verified-badge">
                                  <FaCheckCircle /> Verified
                                </span>
                              ) : (
                                <span className="unverified-badge">
                                  <FaTimesCircle /> Unverified
                                </span>
                              )}
                            </td>
                            <td>
                              {voter.inactiveFlag ? (
                                <span className="inactive-badge">Inactive</span>
                              ) : (
                                <span className="active-badge">Active</span>
                              )}
                            </td>
                            <td className="actions-cell">
                              <button
                                className="action-icon edit"
                                onClick={() => handleEditVoter(voter)}
                                title="Edit Voter"
                              >
                                <FaUserEdit />
                              </button>
                              {!voter.verified && (
                                <button
                                  className="action-icon verify"
                                  onClick={() => handleVerifyVoter(voter.id)}
                                  title="Verify Voter"
                                >
                                  <FaUserCheck />
                                </button>
                              )}
                              <button
                                className="action-icon delete"
                                onClick={() => {
                                  setSelectedVoters([voter.id]);
                                  setConfirmAction('delete-selected');
                                }}
                                title="Delete Voter"
                              >
                                <FaTrash />
                              </button>
                              <button
                                className="action-icon email"
                                onClick={() => window.open(`mailto:${voter.email}`)}
                                title="Send Email"
                              >
                                <FaEnvelope />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {renderPagination()}
                  
                  <div className="table-info">
                    Showing {getPaginatedVoters().length} of {getFilteredVoters().length} voters
                    {searchTerm && <span> (filtered from {voters.length} total)</span>}
                  </div>
                </>
              )}
            </div>
          );
        };
        
        export default Voters;
        