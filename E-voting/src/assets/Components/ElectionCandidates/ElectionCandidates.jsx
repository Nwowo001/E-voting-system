axios.defaults.withCredentials = true;
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./ElectionCandidates.css";
import { io } from "socket.io-client";
// Add this near the top of your file, after the imports

// The rest of your component code remains the same

const API_URL = "http://localhost:5000/api";
const socket = io(API_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
});

const ElectionCandidates = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [voter, setVoter] = useState(null);
  useEffect(() => {
    fetchUserSession();
    fetchCandidates();

    socket.on("vote_recorded", (data) => {
      console.log("Vote recorded:", data);
    });

    return () => socket.off("vote_recorded");
  }, []);

  const fetchUserSession = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        withCredentials: true,
      });
      setVoter(response.data);
    } catch (err) {
      setError("Please log in to vote");
      navigate("/");
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API_URL}/candidates/${electionId}`);
      setCandidates(response.data);
    } catch (err) {
      setError("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/votes`,
        {
          electionid: parseInt(electionId),
          voterid: voter.id,
          candidateid: selectedCandidate,
        },
        { withCredentials: true }
      );

      if (response.data) {
        socket.emit("vote_cast", {
          electionId: parseInt(electionId),
          candidateId: selectedCandidate,
        });
        setSuccessMessage("Vote cast successfully!");
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    } catch (err) {
      console.log("Error response:", err.response);
      setError(err.response?.data?.message || "Failed to cast vote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="election-candidates-container">
      <h2>Select Your Candidate</h2>

      {loading && (
        <div className="loading-overlay">
          <div className="loader"></div>
          <p>Loading candidates...</p>
        </div>
      )}

      <div className="candidates-grid">
        {candidates.map((candidate) => (
          <div key={candidate.candidateid} className="candidate-card">
            <img
              src={`http://localhost:5000${candidate.image_url}`}
              alt={candidate.name}
              className="candidate-image"
            />
            <h3 className="candidate-name">{candidate.name}</h3>
            <p className="candidate-party">{candidate.party}</p>
            <button
              className={`select-button ${
                selectedCandidate === candidate.candidateid ? "selected" : ""
              }`}
              onClick={() => setSelectedCandidate(candidate.candidateid)}
              disabled={
                selectedCandidate && selectedCandidate !== candidate.candidateid
              }
            >
              {selectedCandidate === candidate.candidateid
                ? "Selected"
                : "Select"}
            </button>
          </div>
        ))}
      </div>

      {selectedCandidate && (
        <div className="confirmation-section">
          <h3>Confirm Your Vote</h3>
          <div className="confirmation-buttons">
            <button
              className="confirm-button"
              onClick={handleVote}
              disabled={loading}
            >
              {loading ? "Processing..." : "Confirm Vote"}
            </button>
            <button
              className="cancel-button"
              onClick={() => setSelectedCandidate(null)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
    </div>
  );
};

export default ElectionCandidates;
