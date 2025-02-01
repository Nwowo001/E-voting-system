import React, { useState, useEffect } from "react";
import "./Results.css";

const Results = () => {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/elections");
      const data = await response.json();
      setElections(data);
      setLoading(false);
    } catch (error) {
      setError("Failed to fetch elections");
      setLoading(false);
    }
  };

  const fetchResults = async (electionId) => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/elections/results/${electionId}`
      );
      const data = await response.json();

      const totalVotes = data.reduce(
        (sum, result) => sum + parseInt(result.vote_count, 10),
        0
      );

      const resultsWithPercentage = data.map((result) => ({
        ...result,
        percentage: (
          (parseInt(result.vote_count, 10) / totalVotes) *
          100
        ).toFixed(1),
      }));

      setResults(resultsWithPercentage);
      setError(null);
    } catch (error) {
      setError("Failed to fetch results");
    } finally {
      setLoading(false);
    }
  };

  const handleElectionChange = (e) => {
    const electionId = e.target.value;
    setSelectedElection(electionId);
    if (electionId) {
      fetchResults(electionId);
    } else {
      setResults([]);
    }
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Election Results</h2>
      </div>

      <select
        className="election-selector"
        onChange={handleElectionChange}
        value={selectedElection}
      >
        <option value="">Select an Election</option>
        {elections.map((election) => (
          <option key={election.electionid} value={election.electionid}>
            {election.title}
          </option>
        ))}
      </select>

      {loading && (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading results...</p>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="results-grid">
        {results.map((result) => (
          <div key={result.candidateid} className="result-card">
            <div className="candidate-info">
              {/* Only include image if image_url exists in your data */}
              {result.image_url && (
                <img
                  src={`http://localhost:5000${result.image_url}`}
                  alt={result.candidate_name}
                  className="candidate-image"
                />
              )}
              <div className="candidate-details">
                <h3>{result.candidate_name}</h3>
                <p className="party-name">{result.party}</p>
              </div>
            </div>

            <div className="vote-count">{result.vote_count} votes</div>

            <div className="vote-percentage">
              <div className="percentage-bar">
                <div
                  className="percentage-fill"
                  style={{ width: `${result.percentage}%` }}
                ></div>
              </div>
              <span className="percentage-number">{result.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Results;
