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
  FaUser,
  FaSpinner
} from "react-icons/fa";
import { API_URL, BACKEND_URL } from "../../../config";

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
    biography: "",
    matricNumber: ""
  });
  const [picturePreview, setPicturePreview] = useState(null);
  const [elections, setElections] = useState([]);
  const [editCandidateId, setEditCandidateId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterElection, setFilterElection] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [viewCandidateId, setViewCandidateId] = useState(null);
  const [candidateStats, setCandidateStats] = useState({});
  const formRef = useRef(null);

  useEffect(() => {
    fetchCandidates();
    fetchElections();
  }, []);



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
      
      setViewCandidateId(viewCandidateId === candidateId ? null : candidateId);
    } catch (error) {
      toast.error("Failed to load candidate statistics.");
    }
  };

  const compressImage = (file, maxWidth, maxHeight, quality) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error("Canvas to blob conversion failed"));
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setPicturePreview(URL.createObjectURL(file));
      
      try {
        const compressedFile = await compressImage(file, 600, 600, 0.75);
        setNewCandidate({ ...newCandidate, picture: compressedFile });
        setPicturePreview(URL.createObjectURL(compressedFile));
      } catch (err) {
        console.error("Compression failed, using original file:", err);
        setNewCandidate({ ...newCandidate, picture: file });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editCandidateId && !newCandidate.matricNumber.trim()) {
      toast.error("Matric number is required to map a user account.");
      return;
    }
    
    setIsLoading(true);

    const formData = new FormData();
    formData.append("name", newCandidate.name);
    formData.append("party", newCandidate.party);
    formData.append("electionId", newCandidate.electionId);
    formData.append("matricNumber", newCandidate.matricNumber);
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
      } else {
        await axios.post(`${API_URL}/candidates`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Candidate added and user account provisioned successfully!");
      }
      fetchCandidates();
      resetForm();
      setShowForm(false);
    } catch (err) {
      toast.error("An error occurred while saving the candidate.");
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
      biography: "",
      matricNumber: ""
    });
    setPicturePreview(null);
    setEditCandidateId(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (candidate) => {
    setShowForm(true);
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
      picture: null,
      matricNumber: candidate.matric_number || ""
    });
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
      fetchCandidates();
    } catch (err) {
      toast.error("Failed to disqualify candidate.");
    } finally {
      setDeleteLoading(null);
      setConfirmDelete(null);
    }
  };

  const exportCandidateProfile = (candidate) => {
    let content = `CANDIDATE PROFILE\n=================\n\nName: ${candidate.name}\nPosition: ${candidate.position || "N/A"}\nElection: ${elections.find(e => e.electionid === candidate.electionid)?.title || "Unknown"}\n\nBiography:\n${candidate.biography || "No biography provided."}\n\nManifesto:\n${candidate.manifesto || "No manifesto provided."}\n`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${candidate.name.replace(/\s+/g, '_')}_profile.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Candidate profile exported successfully!");
  };

  const getSortedCandidates = () => {
    const filtered = candidates.filter(candidate => {
      const matchesSearch = 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesElection = filterElection ? candidate.electionid === parseInt(filterElection) : true;
      
      return matchesSearch && matchesElection;
    });
    
    return [...filtered].sort((a, b) => {
      if (sortConfig.key === 'election') {
        const titleA = elections.find(e => e.electionid === a.electionid)?.title || '';
        const titleB = elections.find(e => e.electionid === b.electionid)?.title || '';
        return sortConfig.direction === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
      } else {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
    });
  };

  const sortedCandidates = getSortedCandidates();

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <FaUserTie className="text-indigo-500" /> Election Contenders
          </h2>
          <p className="text-text-muted text-sm">Register ballot candidates, attach party names, and publish biography/manifesto logs</p>
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
          {showForm ? <><FaTimes /> Close Form</> : <><FaPlus /> Add Candidate</>}
        </button>
      </div>

      {/* Candidate Add/Edit Form */}
      {showForm && (
        <div ref={formRef} className="bg-surface/20 border border-border rounded-2xl p-6 backdrop-blur-xl animate-slide-in">
          <h3 className="text-lg font-bold text-text mb-4">
            {editCandidateId ? "Modify Candidate Profile" : "Register New Candidate Contender"}
          </h3>
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Comrade Michael Bello"
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Matric Number / Student ID *</label>
                <input
                  type="text"
                  placeholder="e.g. CSC/2021/001"
                  value={newCandidate.matricNumber}
                  onChange={(e) => setNewCandidate({ ...newCandidate, matricNumber: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                  required
                  disabled={!!editCandidateId}
                />
              </div>



              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Target Position / Seat</label>
                <input
                  type="text"
                  placeholder="e.g. Faculty President"
                  value={newCandidate.position}
                  onChange={(e) => setNewCandidate({ ...newCandidate, position: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Select Active Campaign Ballot *</label>
                <select
                  value={newCandidate.electionId}
                  onChange={(e) => setNewCandidate({ ...newCandidate, electionId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all cursor-pointer"
                  required
                >
                  <option value="">Select Target Election</option>
                  {elections.map((election) => (
                    <option key={election.electionid} value={election.electionid}>
                      {election.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Profile Photo Upload *</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/10 file:text-indigo-400 hover:file:bg-indigo-600/20 cursor-pointer"
                  required={!editCandidateId}
                />
                {picturePreview && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/15">
                    <img src={picturePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Biography / Personal Statement</label>
              <textarea
                placeholder="Write candidate's academic and political background..."
                value={newCandidate.biography}
                onChange={(e) => setNewCandidate({ ...newCandidate, biography: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Manifesto Proposals</label>
              <textarea
                placeholder="Write the candidate's core manifesto goals..."
                value={newCandidate.manifesto}
                onChange={(e) => setNewCandidate({ ...newCandidate, manifesto: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-surface/20 border border-border text-text-muted hover:bg-surface/40 transition-all text-sm font-semibold"
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all text-sm font-semibold flex items-center gap-2"
              >
                {isLoading ? <FaSpinner className="animate-spin" /> : editCandidateId ? "Update Candidate" : "Register Candidate"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-surface/20 border border-border rounded-2xl p-4 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search candidates by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface/60 border border-border/50 text-text placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <FaFilter className="text-text-muted text-xs" />
            <select
              value={filterElection}
              onChange={(e) => setFilterElection(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface border border-border/50 text-text text-xs cursor-pointer"
            >
              <option value="">All Elections</option>
              {elections.map((election) => (
                <option key={election.electionid} value={election.electionid}>
                  {election.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Candidate Cards Grid */}
      {isLoading && !candidates.length ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface/20 border border-border rounded-2xl">
          <FaSpinner className="text-4xl text-indigo-500 animate-spin mb-3" />
          <p className="text-text-muted text-sm">Syncing candidate profiles...</p>
        </div>
      ) : sortedCandidates.length === 0 ? (
        <div className="text-center py-16 bg-surface/20 border border-border rounded-2xl">
          <FaUserTie className="text-5xl text-slate-600 mx-auto mb-3" />
          <h3 className="text-text font-bold text-base mb-1">No contenders registered</h3>
          <p className="text-text-muted text-sm">Add a candidate using the button above to begin scheduling campaigns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedCandidates.map((candidate) => (
            <div 
              key={candidate.candidateid} 
              className="bg-surface/20 border border-border rounded-2xl p-5 backdrop-blur-xl hover:border-border/80 transition-all flex flex-col justify-between space-y-4"
            >
              {/* Top Meta info */}
              <div className="space-y-3">
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500/10 to-violet-500/10 relative border border-border/50">
                  {candidate.image_url ? (
                    <>
                      <img 
                        src={
                          // Supabase URLs start with https:// — use them directly.
                          // Only prepend the local server for relative /uploads/... paths.
                          candidate.image_url.startsWith('http')
                            ? candidate.image_url
                            : `${BACKEND_URL}${candidate.image_url}`
                        }
                        alt={candidate.name} 
                        loading="lazy"
                        className="w-full h-full object-cover transition-opacity duration-300"
                        onLoad={(e) => {
                          e.target.style.opacity = 1;
                          const spinner = e.target.parentNode.querySelector('.image-spinner');
                          if (spinner) spinner.style.display = "none";
                        }}
                        style={{ opacity: 0 }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          const spinner = e.target.parentNode.querySelector('.image-spinner');
                          if (spinner) spinner.style.display = "none";
                          const fallback = e.target.parentNode.querySelector('.fallback-avatar');
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                      <div className="image-spinner absolute inset-0 flex items-center justify-center bg-surface/20">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                      <div className="fallback-avatar hidden absolute inset-0 flex items-center justify-center bg-surface/60 text-4xl text-slate-500">
                        👤
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface/60 text-4xl text-slate-500">
                      👤
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-text font-bold text-base">{candidate.name}</h3>

                  <p className="text-[10px] text-text-muted font-semibold tracking-wider uppercase mt-2">
                    🎯 {candidate.position || "Candidate"}
                  </p>
                  <p className="text-[10px] text-indigo-400/80 font-bold uppercase truncate mt-0.5">
                    📁 {elections.find(e => e.electionid === candidate.electionid)?.title || "Target Ballot"}
                  </p>
                </div>
              </div>

              {/* Accordion details */}
              {viewCandidateId === candidate.candidateid && (
                <div className="border-t border-border/50 pt-3 space-y-3 animate-slide-in text-xs">
                  {candidate.biography && (
                    <div>
                      <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-1">Biography</p>
                      <p className="text-text-muted leading-relaxed bg-surface/30 p-2.5 rounded-lg border border-border/50">{candidate.biography}</p>
                    </div>
                  )}

                  {candidate.manifesto && (
                    <div>
                      <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-1">Manifesto Proposals</p>
                      <p className="text-text-muted leading-relaxed bg-surface/30 p-2.5 rounded-lg border border-border/50">{candidate.manifesto}</p>
                    </div>
                  )}

                  {candidateStats[candidate.candidateid] && (
                    <div className="bg-indigo-600/10 border border-indigo-500/25 p-3 rounded-xl">
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-2">Real-time Standing</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-text-muted text-[9px] uppercase font-semibold">Total Votes</p>
                          <p className="text-sm font-bold text-text">{candidateStats[candidate.candidateid].voteCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-[9px] uppercase font-semibold">Percentage</p>
                          <p className="text-sm font-bold text-emerald-400">{candidateStats[candidate.candidateid].votePercentage || 0}%</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-[9px] uppercase font-semibold">Ranking</p>
                          <p className="text-sm font-bold text-indigo-300">#{candidateStats[candidate.candidateid].ranking || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="border-t border-border/50 pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => {
                      if (viewCandidateId === candidate.candidateid) {
                        setViewCandidateId(null);
                      } else {
                        setViewCandidateId(candidate.candidateid);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-surface/20 border border-border text-text text-[10px] font-semibold hover:bg-surface/40 transition-all flex items-center gap-1"
                  >
                    <FaEye /> View Profile
                  </button>

                  <button 
                    onClick={() => fetchCandidateStats(candidate.candidateid)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface/20 border border-border text-text text-[10px] font-semibold hover:bg-surface/40 transition-all flex items-center gap-1"
                  >
                    <FaChartBar /> Live Standing
                  </button>

                  <button 
                    onClick={() => exportCandidateProfile(candidate)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface/20 border border-border text-text-muted hover:text-text transition-all text-xs"
                    title="Export Profile Details"
                  >
                    <FaDownload />
                  </button>
                </div>

                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleEdit(candidate)}
                    className="p-1.5 rounded-lg bg-surface/20 border border-border hover:bg-surface/40 text-text-muted text-xs transition-all"
                    title="Edit profile"
                  >
                    <FaEdit />
                  </button>

                  <button 
                    onClick={() => handleDisqualify(candidate.candidateid)}
                    disabled={deleteLoading === candidate.candidateid}
                    className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                      confirmDelete === candidate.candidateid
                        ? "bg-rose-600 border-rose-500 text-white"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white"
                    }`}
                  >
                    {confirmDelete === candidate.candidateid ? "Confirm Disqualification" : <FaTrash />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Candidate;
