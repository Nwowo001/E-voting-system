import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Election.css";
import ButtonComponent from "../Button/buttonComponent";

const API_URL = "http://localhost:5000/api";

const Election = () => {
  const [elections, setElections] = useState([]);
  const [newElection, setNewElection] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
  });
  const [canVote, setCanVote] = useState(false);
  const [electionResults, setElectionResults] = useState(null);

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      const response = await axios.get(`${API_URL}/elections`);
      setElections(response.data);
    } catch (error) {
      console.error("Error fetching elections:", error.message);
    }
  };

  const handleCreateElection = async () => {
    try {
      console.log("Creating election with data:", newElection); // Debugging payload
      const response = await axios.post(`${API_URL}/elections`, newElection);
      console.log("Election created successfully:", response.data); // Success log
      fetchElections();
      setNewElection({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
      });
    } catch (error) {
      console.error(
        "Error creating election:",
        error.response?.data || error.message
      ); // Log backend error
    }
  };

  const fetchElectionResults = async (electionId) => {
    try {
      const response = await axios.get(
        `${API_URL}/elections/${electionId}/results`
      );
      setElectionResults(response.data);
    } catch (error) {
      console.error("Error fetching election results:", error.message);
    }
  };

  const formatDateTime = (date, time) => {
    try {
      const dateObj = new Date(`${date}T${time}`);
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      return dateObj.toLocaleString(undefined, options);
    } catch (error) {
      console.error("Error formatting date/time:", error.message);
      return "Invalid date/time";
    }
  };

  return (
    <div>
      <h2>Manage Elections</h2>
      <div className="form-group">
        <input
          type="text"
          placeholder="Title"
          value={newElection.title}
          onChange={(e) =>
            setNewElection({ ...newElection, title: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Description"
          value={newElection.description}
          onChange={(e) =>
            setNewElection({ ...newElection, description: e.target.value })
          }
        />
        <input
          type="date"
          placeholder="Start Date"
          value={newElection.startDate}
          onChange={(e) =>
            setNewElection({ ...newElection, startDate: e.target.value })
          }
        />
        <input
          type="time"
          placeholder="Start Time"
          value={newElection.startTime}
          onChange={(e) =>
            setNewElection({ ...newElection, startTime: e.target.value })
          }
        />
        <input
          type="date"
          placeholder="End Date"
          value={newElection.endDate}
          onChange={(e) =>
            setNewElection({ ...newElection, endDate: e.target.value })
          }
        />
        <input
          type="time"
          placeholder="End Time"
          value={newElection.endTime}
          onChange={(e) =>
            setNewElection({ ...newElection, endTime: e.target.value })
          }
        />
        <ButtonComponent
          backgroundColor="#007bff"
          color="white"
          fontSize="1rem"
          padding="10px 20px"
          borderRadius="5px"
          onClick={handleCreateElection}
        >
          Create Election
        </ButtonComponent>
      </div>

      <ul>
        {elections.map((election) => (
          <li key={election.electionid}>
            <h3>{election.title}</h3>
            <p>
              {formatDateTime(election.start_date, election.start_time)} to{" "}
              {formatDateTime(election.end_date, election.end_time)}
            </p>
            <ButtonComponent
              backgroundColor="#17a2b8"
              color="white"
              fontSize="1rem"
              padding="10px 20px"
              borderRadius="5px"
              onClick={() => fetchElectionResults(election.electionid)}
            >
              View Results
            </ButtonComponent>
            {electionResults &&
              electionResults.electionId === election.electionid && (
                <div>
                  <h4>Results:</h4>
                  {electionResults.candidates.map((candidate) => (
                    <p key={candidate.id}>
                      {candidate.name}: {candidate.votes} votes
                    </p>
                  ))}
                </div>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Election;
