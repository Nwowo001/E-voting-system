import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { FaArrowLeft, FaSearch, FaFilter, FaUserTie, FaVoteYea } from "react-icons/fa";
import { useUserContext } from "../../Context/UserContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { withCredentials: true });

const Candidates = () => {
  const navigate = useNavigate();
  const { user } = useUserContext();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchVoteCounts = async () => {
    try {
      const candidatesResponse = await axios.get(`${API_URL}/candidates`, { withCredentials: true });
      
      let updatedCandidates = candidatesResponse.data;
      
      // Only fetch and map vote counts if the user is an admin
      if (user?.role === "admin") {
        try {
          const votesResponse = await axios.get(`${API_URL}/votes`, { withCredentials: true });
          const voteCounts = {};
          votesResponse.data.forEach((vote) => {
            voteCounts[vote.candidateid] = (voteCounts[vote.candidateid] || 0) + 1;
          });
          updatedCandidates = candidatesResponse.data.map((candidate) => ({
            ...candidate,
            voteCount: voteCounts[candidate.candidateid] || 0,
          }));
        } catch (voteErr) {
          console.warn("Failed to fetch vote counts:", voteErr);
        }
      }

      setCandidates(updatedCandidates);
      setError(null);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setError("Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoteCounts();

    if (user?.role === "admin") {
      socket.on("vote_cast", () => {
        fetchVoteCounts();
      });

      socket.on("vote_update", () => {
        fetchVoteCounts();
      });
    }

    return () => {
      socket.off("vote_cast");
      socket.off("vote_update");
      socket.disconnect();
    };
  }, [user]);

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-bg text-text p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center justify-center p-2 rounded-lg bg-surface/20 border border-border text-text-muted hover:text-text hover:bg-surface/40 transition-all cursor-pointer"
            >
              <FaArrowLeft />
            </button>
            <div>
              <h1 className="text-xl font-bold text-text flex items-center gap-2">
                <FaUserTie className="text-indigo-400" /> Nominated Candidates
              </h1>
              <p className="text-text-muted text-sm font-medium">Review registered contenders, coalition parties, and candidate profiles</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
              <input
                type="search"
                placeholder="Search contenders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-2 rounded-xl bg-surface/30 border border-border text-text text-xs placeholder-text-muted/65 focus:border-indigo-500 transition-all w-44 outline-none"
              />
            </div>
            

          </div>
        </div>

        {/* Loading / Error states */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-surface/20 border border-border rounded-2xl">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-text-muted text-sm">Querying candidate profiles...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16 bg-surface/20 border border-red-500/20 rounded-2xl text-rose-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Candidates Grid */}
        {!loading && !error && (
          filteredCandidates.length === 0 ? (
            <div className="text-center py-20 bg-surface/20 border border-border rounded-2xl">
              <FaUserTie className="text-5xl text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No Nominated Candidates match your filter criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCandidates.map((candidate) => (
                <div 
                  key={candidate.candidateid}
                  className="bg-surface/20 border border-border rounded-2xl p-5 backdrop-blur-xl hover:border-border/80 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Picture */}
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500/10 to-violet-500/10 relative border border-border/40">
                      {candidate.image_url ? (
                        <>
                          <img 
                            src={candidate.image_url.startsWith('http') ? candidate.image_url : `${API_URL}${candidate.image_url.startsWith('/') ? '' : '/'}${candidate.image_url}`} 
                            alt={candidate.name} 
                            className="w-full h-full object-cover transition-opacity duration-300"
                            style={{ opacity: 0 }}
                            onLoad={(e) => {
                              e.target.style.opacity = 1;
                              const spinner = e.target.parentNode.querySelector('.image-spinner');
                              if (spinner) spinner.style.display = "none";
                            }}
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
                          <div className="fallback-avatar hidden absolute inset-0 flex items-center justify-center bg-surface/60 text-4xl text-text-muted">
                            👤
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface/60 text-4xl text-text-muted">
                          👤
                        </div>
                      )}
                      
                      {/* Vote Count Badge (restricted to Admins) */}
                      {user?.role === "admin" && (
                        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-indigo-600/90 text-white font-bold text-xs shadow-lg backdrop-blur-xs flex items-center gap-1">
                          <FaVoteYea /> {candidate.voteCount} votes
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div>
                      <h3 className="text-text font-bold text-base leading-tight">{candidate.name}</h3>

                    </div>

                    {/* Manifesto / bio preview */}
                    <p className="text-text-muted text-xs leading-relaxed line-clamp-4 pt-1">
                      {candidate.bio || candidate.manifesto || "No biography or manifesto details published."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Candidates;
