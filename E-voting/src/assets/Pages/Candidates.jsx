import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import "./Candidates.css";

const API_URL = "http://localhost:5000/api";
const socket = io("http://localhost:5000");

const Candidates = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedParty, setSelectedParty] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchVoteCounts = async () => {
    try {
      const [candidatesResponse, votesResponse] = await Promise.all([
        axios.get(`${API_URL}/candidates`, { withCredentials: true }),
        axios.get(`${API_URL}/votes`, { withCredentials: true }),
      ]);

      const voteCounts = {};
      votesResponse.data.forEach((vote) => {
        voteCounts[vote.candidateid] = (voteCounts[vote.candidateid] || 0) + 1;
      });

      const updatedCandidates = candidatesResponse.data.map((candidate) => ({
        ...candidate,
        voteCount: voteCounts[candidate.candidateid] || 0,
      }));

      setCandidates(updatedCandidates);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching vote counts:", error);
      setError("Failed to fetch candidates");
      setLoading(false); // Set loading to false even if there's an error
    }
  };

  useEffect(() => {
    fetchVoteCounts();

    socket.on("vote_cast", (data) => {
      fetchVoteCounts();
    });

    socket.on("vote_update", (data) => {
      fetchVoteCounts();
    });

    return () => {
      socket.off("vote_cast");
      socket.off("vote_update");
      socket.disconnect();
    };
  }, []);

  const parties = ["all", ...new Set(candidates.map((c) => c.party))];

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesParty =
      selectedParty === "all" || candidate.party === selectedParty;
    const matchesSearch = candidate.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesParty && matchesSearch;
  });

  return (
    <div className="candidates-container">
      <div className="candidates-header">
        <button onClick={() => navigate("/dashboard")} className="back-button">
          ← Back to Dashboard
        </button>
        <h2>Election Candidates</h2>
        <div className="filter-section">
          <select
            value={selectedParty}
            onChange={(e) => setSelectedParty(e.target.value)}
            className="party-filter"
          >
            {parties.map((party) => (
              <option key={party} value={party}>
                {party.charAt(0).toUpperCase() + party.slice(1)}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading && <div className="loader">Loading...</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="candidates-grid">
        {filteredCandidates.length === 0 ? (
          <p className="no-candidates">No candidates match your criteria.</p>
        ) : (
          filteredCandidates.map((candidate) => (
            <div key={candidate.candidateid} className="candidate-card">
              <div className="candidate-image-container">
                <img
                  src={
                    candidate.image_url
                      ? `http://localhost:5000/uploads/${candidate.image_url
                          .split("/")
                          .pop()}`
                      : "/images/default-avatar.png"
                  }
                  alt={candidate.name}
                  className="candidate-image"
                  onError={(e) => {
                    e.target.src = "/images/default-avatar.png";
                  }}
                />

                <div className="candidate-overlay">
                  <span className="vote-count">
                    {candidate.voteCount} votes
                  </span>
                </div>
              </div>
              <div className="candidate-info">
                <h3>{candidate.name}</h3>
                <span className="party-badge">{candidate.party}</span>
                <p className="candidate-bio">
                  {candidate.bio || "No biography available"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Candidates;
