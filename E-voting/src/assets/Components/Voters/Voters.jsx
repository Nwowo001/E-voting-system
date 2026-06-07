import { useEffect, useState, useRef } from "react";
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
  FaSpinner
} from "react-icons/fa";

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
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [userType, setUserType] = useState("student"); // "student" or "staff" or "admin"
  
  const [newVoter, setNewVoter] = useState({
    name: "",
    email: "",
    matric_number: "",
    staff_id: "",
    password: "",
    confirmPassword: "",
  });

  const [editingVoter, setEditingVoter] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
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
      setSelectAll(false);
    }
  }, [selectAll, voters, searchTerm, filterStatus, filterVerified]);

  const fetchVoters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Fetch all users
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
        verified: voter.verified !== false,
        inactiveFlag: voter.missedElections >= 3 || false,
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
      setError("Failed to fetch voter records.");
      toast.error("Failed to fetch voter records.");
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
      
      // Call bulk delete
      for (const id of selectedVoters) {
        await axios.delete(`${API_URL}/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
      }

      toast.success(`Successfully deleted ${selectedVoters.length} users`);
      fetchVoters();
      setSelectedVoters([]);
      setSelectAll(false);
      setConfirmAction(null);
    } catch (err) {
      toast.error("Failed to delete selected users.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteInactive = async () => {
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
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      toast.success(`Successfully deleted ${response.data.deletedVoters?.length || 0} inactive voters`);
      fetchVoters();
      setSelectedVoters([]);
      setConfirmAction(null);
    } catch (err) {
      toast.error("Failed to purge inactive voters.");
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
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      toast.success("Voter verified successfully");
      fetchVoters();
    } catch (err) {
      toast.error("Failed to verify voter.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddVoter = async (e) => {
    e.preventDefault();
    
    if (!newVoter.name || !newVoter.password) {
      toast.error("Please fill in name and password");
      return;
    }

    if (newVoter.password !== newVoter.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (userType === "student" && !newVoter.matric_number) {
      toast.error("Matric number is required for students");
      return;
    }

    if (userType !== "student" && !newVoter.staff_id) {
      toast.error("Staff ID is required for staff/admin");
      return;
    }

    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");
      
      if (userType === "student") {
        // Sign up student
        await axios.post(
          `${API_URL}/users/sign-up`,
          {
            name: newVoter.name,
            email: newVoter.email || undefined,
            matric_number: newVoter.matric_number,
            password: newVoter.password
          },
          { withCredentials: true }
        );
      } else {
        // Create staff/admin
        await axios.post(
          `${API_URL}/admin/create-user`,
          {
            name: newVoter.name,
            email: newVoter.email || undefined,
            staff_id: newVoter.staff_id,
            password: newVoter.password,
            role: userType
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }
        );
      }

      toast.success(`${userType.toUpperCase()} user created successfully!`);
      fetchVoters();
      setNewVoter({
        name: "",
        email: "",
        matric_number: "",
        staff_id: "",
        password: "",
        confirmPassword: "",
      });
      setShowAddForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to create user.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateVoter = async (e) => {
    e.preventDefault();
    
    if (!editingVoter.name) {
      toast.error("Name is required");
      return;
    }

    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/users/${editingVoter.id}`,
        {
          name: editingVoter.name,
          email: editingVoter.email || null,
          display_name: editingVoter.name
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      toast.success("User profile updated successfully");
      fetchVoters();
      setEditingVoter(null);
    } catch (err) {
      toast.error("Failed to update user.");
    } finally {
      setIsProcessing(false);
    }
  };

  const exportVoters = () => {
    const filtered = getFilteredVoters();
    if (filtered.length === 0) {
      toast.warning("No voters found to export");
      return;
    }

    const headers = ["Name", "Email", "Matric Number", "Staff ID", "Role", "Created At"];
    const csvContent = [
      headers.join(","),
      ...filtered.map(v => [
        `"${v.name}"`,
        `"${v.email || ''}"`,
        `"${v.matric_number || ''}"`,
        `"${v.staff_id || ''}"`,
        `"${v.role}"`,
        `"${v.created_at ? new Date(v.created_at).toLocaleDateString() : ''}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "faculty_voters_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Voter database exported successfully!");
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getFilteredVoters = () => {
    return voters.filter(v => {
      const matchesSearch = 
        v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.matric_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.staff_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === "all" ||
        (filterStatus === "active" && !v.inactiveFlag) ||
        (filterStatus === "inactive" && v.inactiveFlag);
      
      const matchesVerified = 
        filterVerified === "all" ||
        (filterVerified === "verified" && v.verified) ||
        (filterVerified === "unverified" && !v.verified);
      
      return matchesSearch && matchesStatus && matchesVerified;
    });
  };

  const getSortedVoters = () => {
    const filtered = getFilteredVoters();
    return [...filtered].sort((a, b) => {
      let valA = a[sortConfig.key] || "";
      let valB = b[sortConfig.key] || "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getPaginatedVoters = () => {
    const sorted = getSortedVoters();
    const startIndex = (currentPage - 1) * votersPerPage;
    return sorted.slice(startIndex, startIndex + votersPerPage);
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
    if (selectAll) {
      setSelectedVoters([]);
      setSelectAll(false);
    } else {
      setSelectAll(true);
    }
  };

  const handleEditVoter = (voter) => {
    setEditingVoter({
      id: voter.id,
      name: voter.name,
      email: voter.email || "",
      verified: voter.verified
    });
    setShowAddForm(false);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text">Voter &amp; Staff Administration</h2>
          <p className="text-text-muted text-sm">Add students, appoint faculty staff, and audit voter participation rates</p>
        </div>
        <button 
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingVoter(null);
            setTimeout(() => {
              formRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <FaUserPlus /> {showAddForm ? "Hide Form" : "Create User"}
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface/20 border border-border rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-lg">
              <FaIdCard />
            </div>
            <div>
              <p className="text-text-muted text-xs font-medium uppercase">Total Registry</p>
              <p className="text-xl font-bold text-text">{voterAnalytics.total || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface/20 border border-border rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-lg">
              <FaUserCheck />
            </div>
            <div>
              <p className="text-text-muted text-xs font-medium uppercase">Active Students</p>
              <p className="text-xl font-bold text-text">{voterAnalytics.active || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface/20 border border-border rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-lg">
              <FaUserTimes />
            </div>
            <div>
              <p className="text-text-muted text-xs font-medium uppercase">Inactive (Missed 3+)</p>
              <p className="text-xl font-bold text-text">{voterAnalytics.inactive || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface/20 border border-border rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-lg">
              <FaCheckCircle />
            </div>
            <div>
              <p className="text-text-muted text-xs font-medium uppercase">Verified Voters</p>
              <p className="text-xl font-bold text-text">{voterAnalytics.verified || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Forms Container */}
      {(showAddForm || editingVoter) && (
        <div ref={formRef} className="bg-surface/20 border border-border rounded-2xl p-6 backdrop-blur-xl animate-slide-in">
          <h3 className="text-lg font-bold text-text mb-4">
            {editingVoter ? "Modify User Account" : "Add New User to Registry"}
          </h3>
          
          <form onSubmit={editingVoter ? handleUpdateVoter : handleAddVoter} className="space-y-4">
            {!editingVoter && (
              <div className="flex bg-surface/20 p-1 rounded-xl w-fit mb-4">
                <button
                  type="button"
                  onClick={() => setUserType("student")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    userType === "student" ? "bg-indigo-600 text-white" : "text-text-muted hover:text-text"
                  }`}
                >
                  Student Voter
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("staff")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    userType === "staff" ? "bg-indigo-600 text-white" : "text-text-muted hover:text-text"
                  }`}
                >
                  Faculty Staff
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("admin")}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    userType === "admin" ? "bg-indigo-600 text-white" : "text-text-muted hover:text-text"
                  }`}
                >
                  Administrator
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editingVoter ? editingVoter.name : newVoter.name}
                  onChange={(e) => 
                    editingVoter 
                      ? setEditingVoter({...editingVoter, name: e.target.value})
                      : setNewVoter({...newVoter, name: e.target.value})
                  }
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={editingVoter ? editingVoter.email : newVoter.email}
                  onChange={(e) => 
                    editingVoter 
                      ? setEditingVoter({...editingVoter, email: e.target.value})
                      : setNewVoter({...newVoter, email: e.target.value})
                  }
                  placeholder="e.g. john@university.edu"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                />
              </div>

              {!editingVoter && userType === "student" && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Matric Number *</label>
                  <input
                    type="text"
                    value={newVoter.matric_number}
                    onChange={(e) => setNewVoter({...newVoter, matric_number: e.target.value})}
                    placeholder="e.g. ENG1802931"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              )}

              {!editingVoter && userType !== "student" && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Staff ID Number *</label>
                  <input
                    type="text"
                    value={newVoter.staff_id}
                    onChange={(e) => setNewVoter({...newVoter, staff_id: e.target.value})}
                    placeholder="e.g. STF-8921"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              )}

              {!editingVoter && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Password *</label>
                    <input
                      type="password"
                      value={newVoter.password}
                      onChange={(e) => setNewVoter({...newVoter, password: e.target.value})}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      value={newVoter.confirmPassword}
                      onChange={(e) => setNewVoter({...newVoter, confirmPassword: e.target.value})}
                      placeholder="Repeat password"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => { setEditingVoter(null); setShowAddForm(false); }}
                className="px-4 py-2 rounded-xl bg-surface/20 border border-border text-text-muted hover:bg-surface/40 transition-all text-sm font-semibold"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all text-sm font-semibold flex items-center gap-2"
              >
                {isProcessing ? <FaSpinner className="animate-spin" /> : editingVoter ? "Update User" : "Register User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters, Search & Bulk Actions */}
      <div className="bg-surface/20 border border-border rounded-2xl p-4 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, email, matric number, or staff ID..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface/60 border border-border/50 text-text placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <FaFilter className="text-text-muted text-xs" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface border border-border/50 text-text text-xs"
            >
              <option value="all">All Participation</option>
              <option value="active">Active Voters</option>
              <option value="inactive">Inactive Voters</option>
            </select>
          </div>

          <button 
            onClick={exportVoters}
            className="px-3.5 py-2 rounded-xl bg-surface/20 border border-border text-text text-xs hover:bg-surface/40 transition-all flex items-center gap-1.5 font-semibold"
          >
            <FaFileExport /> Export CSV
          </button>
        </div>
      </div>

      {/* Bulk Purge and Verification actions */}
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={handleDeleteSelected}
          disabled={selectedVoters.length === 0 || isProcessing}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
            selectedVoters.length > 0
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
              : "bg-surface/20 border-border/50 text-slate-500 cursor-not-allowed"
          }`}
        >
          {confirmAction === 'delete-selected' ? `Confirm Purge (${selectedVoters.length})` : <><FaTrash /> Purge Selected</>}
        </button>

        <button 
          onClick={handleDeleteInactive}
          disabled={voterAnalytics.inactive === 0 || isProcessing}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
            voterAnalytics.inactive > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
              : "bg-surface/20 border-border/50 text-slate-500 cursor-not-allowed"
          }`}
        >
          {confirmAction === 'delete-inactive' ? "Confirm Purge Inactive" : <><FaUserTimes /> Purge Inactive (Missed 3+)</>}
        </button>
      </div>

      {/* Voters Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface/20 border border-border rounded-2xl">
          <FaSpinner className="text-4xl text-indigo-500 animate-spin mb-3" />
          <p className="text-text-muted text-sm">Synchronizing user directories...</p>
        </div>
      ) : getFilteredVoters().length === 0 ? (
        <div className="text-center py-16 bg-surface/20 border border-border rounded-2xl">
          <FaUserTimes className="text-5xl text-slate-600 mx-auto mb-3" />
          <h3 className="text-text font-bold text-base mb-1">No matches found</h3>
          <p className="text-text-muted text-sm">No registered voter or faculty staff matches the query criteria.</p>
        </div>
      ) : (
        <div className="bg-surface/20 border border-border rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/[0.02] text-xs font-semibold text-text-muted">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAllChange}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('name')}>
                    <span className="flex items-center gap-1.5">Name <FaSort className="text-[10px] text-text-muted" /></span>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('role')}>
                    <span className="flex items-center gap-1.5">Role <FaSort className="text-[10px] text-text-muted" /></span>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('matric_number')}>
                    <span className="flex items-center gap-1.5">Matric No. / Staff ID <FaSort className="text-[10px] text-text-muted" /></span>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('email')}>
                    <span className="flex items-center gap-1.5">Email <FaSort className="text-[10px] text-text-muted" /></span>
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('inactiveFlag')}>
                    <span className="flex items-center gap-1.5">Status <FaSort className="text-[10px] text-text-muted" /></span>
                  </th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-sm text-text-muted">
                {getPaginatedVoters().map((voter) => (
                  <tr key={voter.id} className={`hover:bg-surface/[0.02] transition-colors ${voter.inactiveFlag ? "bg-red-500/5" : ""}`}>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedVoters.includes(voter.id)}
                        onChange={() => handleSelectVoter(voter.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-semibold text-text">{voter.name}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        voter.role === 'admin' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : voter.role === 'staff' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {voter.role}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs">{voter.matric_number || voter.staff_id || "N/A"}</td>
                    <td className="p-4 text-xs text-text-muted">{voter.email || "No email"}</td>
                    <td className="p-4">
                      {voter.inactiveFlag ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400">
                          🔴 Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                          🟢 Active
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditVoter(voter)}
                          className="p-2 rounded-lg bg-surface/20 border border-border text-text-muted hover:text-text hover:bg-surface/40 transition-all text-xs"
                          title="Modify account name/email"
                        >
                          <FaUserEdit />
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedVoters([voter.id]);
                            setConfirmAction('delete-selected');
                          }}
                          className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/15 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-xs"
                          title="Remove user"
                        >
                          <FaTrash />
                        </button>

                        {voter.email && (
                          <a
                            href={`mailto:${voter.email}`}
                            className="p-2 rounded-lg bg-surface/20 border border-border text-text-muted hover:text-text hover:bg-surface/40 transition-all text-xs"
                            title="Email User"
                          >
                            <FaEnvelope />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border/50 bg-surface/[0.01] flex items-center justify-between">
              <span className="text-xs text-text-muted">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="px-3 py-1.5 rounded-lg bg-surface/20 border border-border text-text-muted hover:bg-surface/40 disabled:opacity-50 text-xs font-semibold transition-all"
                >
                  Prev
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="px-3 py-1.5 rounded-lg bg-surface/20 border border-border text-text-muted hover:bg-surface/40 disabled:opacity-50 text-xs font-semibold transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Voters;