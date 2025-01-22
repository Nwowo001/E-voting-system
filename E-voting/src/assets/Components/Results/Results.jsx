import React, { useState, useEffect } from "react";
import "./Results.css";

const Results = () => {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/elections");
      const data = await response.json();
      setElections(data);
    } catch (error) {
      console.error("Error fetching elections:", error);
    }
  };

  const fetchResults = async (electionId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/elections/results/${electionId}`
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error fetching results:", error);
    }
  };

  const handleElectionChange = (e) => {
    const electionId = e.target.value;
    setSelectedElection(electionId);
    fetchResults(electionId);
  };

  return (
    <div className="results">
      <h2>Election Results</h2>
      <select onChange={handleElectionChange} value={selectedElection}>
        <option value="">Select an Election</option>
        {elections.map((election) => (
          <option key={election.id || election.title} value={election.id}>
            {election.title}
          </option>
        ))}
      </select>

      <ul className="results-list">
        {results.map((result) => (
          <li key={result.candidateId || result.name}>
            {" "}
            {/* Fallback to name if candidateId is missing */}
            {result.name} ({result.party}) - Votes: {result.voteCount}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Results;
