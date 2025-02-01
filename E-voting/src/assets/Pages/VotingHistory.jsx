import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./VotingHistory.css";

const API_URL = "http://localhost:5000/api";

const VotingHistory = () => {
  const navigate = useNavigate();
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({
    totalVotes: 0,
    uniqueElections: 0,
    lastVoteDate: null,
  });

  useEffect(() => {
    const fetchVotingHistory = async () => {
      try {
        const [votesResponse, electionsResponse, candidatesResponse] =
          await Promise.all([
            axios.get(`${API_URL}/votes/user`, { withCredentials: true }),
            axios.get(`${API_URL}/elections`, { withCredentials: true }),
            axios.get(`${API_URL}/candidates`, { withCredentials: true }),
          ]);

        const elections = electionsResponse.data;
        const candidates = candidatesResponse.data;

        const enrichedVotes = votesResponse.data.map((vote) => {
          const election = elections.find(
            (e) => e.electionid === vote.electionid
          );
          const candidate = candidates.find(
            (c) => c.candidateid === vote.candidateid
          );
          return {
            ...vote,
            electionTitle: election?.title || "Unknown Election",
            candidateName: candidate?.name || "Unknown Candidate",
            party: candidate?.party || "Unknown Party",
            date: vote.votetimestamp,
          };
        });

        setVotes(enrichedVotes);
        calculateStats(enrichedVotes);
      } catch (err) {
        setError("Failed to fetch voting history");
      } finally {
        setLoading(false);
      }
    };

    fetchVotingHistory();
  }, []);

  const calculateStats = (votesData) => {
    const uniqueElections = new Set(votesData.map((vote) => vote.electionid))
      .size;
    const lastVote = votesData[0]?.date;

    setStats({
      totalVotes: votesData.length,
      uniqueElections,
      lastVoteDate: lastVote,
    });
  };

  const filteredVotes =
    filter === "all"
      ? votes
      : votes.filter((vote) => {
          const voteDate = new Date(vote.date);
          const today = new Date();
          switch (filter) {
            case "month":
              return (
                voteDate.getMonth() === today.getMonth() &&
                voteDate.getFullYear() === today.getFullYear()
              );
            case "year":
              return voteDate.getFullYear() === today.getFullYear();
            default:
              return true;
          }
        });

  return (
    <div className="voting-history-container">
      <div className="history-header">
        <button onClick={() => navigate("/dashboard")} className="back-button">
          ← Back to Dashboard
        </button>
        <h2>Your Voting History</h2>
        <select
          className="history-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Votes Cast</h3>
          <p>{stats.totalVotes}</p>
        </div>
        <div className="stat-card">
          <h3>Elections Participated</h3>
          <p>{stats.uniqueElections}</p>
        </div>
        <div className="stat-card">
          <h3>Last Vote Cast</h3>
          <p>
            {stats.lastVoteDate
              ? new Date(stats.lastVoteDate).toLocaleDateString()
              : "No votes yet"}
          </p>
        </div>
      </div>

      {loading && <div className="loading-spinner">Loading history...</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Election</th>
              <th>Candidate</th>
              <th>Party</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredVotes.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-votes">
                  No voting history found.
                </td>
              </tr>
            ) : (
              filteredVotes.map((vote) => (
                <tr key={vote.voteid}>
                  <td>{vote.electionTitle}</td>
                  <td>{vote.candidateName}</td>
                  <td>
                    <span className="party-badge">{vote.party}</span>
                  </td>
                  <td>{new Date(vote.date).toLocaleString()}</td>
                  <td>
                    <span className="status-badge">Recorded</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VotingHistory;
