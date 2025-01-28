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
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
  });
  const [editElectionId, setEditElectionId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchElections();
  }, []);

  // Fetch all elections
  const fetchElections = async () => {
    try {
      const response = await axios.get(`${API_URL}/elections`);
      setElections(
        response.data.map((election) => ({
          ...election,
          start_date: election.start_date.slice(0, 10), // Format date to yyyy-MM-dd
          end_date: election.end_date.slice(0, 10), // Format date to yyyy-MM-dd
        }))
      );
    } catch (error) {
      console.error("Error fetching elections:", error.message);
    }
  };

  // Create or update an election
  const handleCreateOrUpdateElection = async () => {
    const { title, description, start_date, end_date, start_time, end_time } =
      newElection;

    if (
      !title ||
      !description ||
      !start_date ||
      !end_date ||
      !start_time ||
      !end_time
    ) {
      alert("All fields are required.");
      return;
    }

    try {
      setLoading(true);
      if (editElectionId) {
        // Update existing election
        await axios.put(`${API_URL}/elections/${editElectionId}`, newElection);
        console.log("Election updated successfully.");
      } else {
        // Create new election
        await axios.post(`${API_URL}/elections`, newElection);
        console.log("Election created successfully.");
      }
      fetchElections();
      resetForm();
    } catch (error) {
      console.error(
        "Error creating/updating election:",
        error.response?.data || error.message
      );
      alert(
        error.response?.data?.error ||
          "An error occurred while creating/updating the election."
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete an election
  const handleDeleteElection = async (electionId) => {
    if (!window.confirm("Are you sure you want to delete this election?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/elections/${electionId}`);
      console.log("Election deleted successfully.");
      fetchElections();
    } catch (error) {
      console.error("Error deleting election:", error.message);
      alert("Failed to delete the election. Try again.");
    }
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (electionId, isActive) => {
    try {
      await axios.put(`${API_URL}/elections/${electionId}/status`, {
        isActive: !isActive,
      });

      // Immediately update the local state
      setElections(
        elections.map((election) =>
          election.electionid === electionId
            ? { ...election, isActive: !isActive }
            : election
        )
      );
    } catch (error) {
      console.error("Error toggling election status:", error.message);
      alert("Failed to update election status. Try again.");
    }
  };

  // Reset the form
  const resetForm = () => {
    setNewElection({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
    });
    setEditElectionId(null);
  };

  // Edit an election
  const handleEditElection = (election) => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    setNewElection({
      title: election.title,
      description: election.description,
      start_date: election.start_date,
      end_date: election.end_date,
      start_time: election.start_time || "",
      end_time: election.end_time || "",
    });
    setEditElectionId(election.electionid);
  };

  return (
    <div>
      <h2>Manage Elections</h2>

      {/* Create/Update Election Form */}
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
          value={newElection.start_date}
          onChange={(e) =>
            setNewElection({ ...newElection, start_date: e.target.value })
          }
        />
        <input
          type="time"
          placeholder="Start Time"
          value={newElection.start_time}
          onChange={(e) =>
            setNewElection({ ...newElection, start_time: e.target.value })
          }
        />
        <input
          type="date"
          placeholder="End Date"
          value={newElection.end_date}
          onChange={(e) =>
            setNewElection({ ...newElection, end_date: e.target.value })
          }
        />
        <input
          type="time"
          placeholder="End Time"
          value={newElection.end_time}
          onChange={(e) =>
            setNewElection({ ...newElection, end_time: e.target.value })
          }
        />
        <ButtonComponent
          backgroundColor="#007bff"
          color="white"
          fontSize="1rem"
          padding="10px 20px"
          borderRadius="5px"
          onClick={handleCreateOrUpdateElection}
        >
          {loading
            ? "Processing..."
            : editElectionId
            ? "Update Election"
            : "Create Election"}
        </ButtonComponent>
        {editElectionId && (
          <ButtonComponent
            backgroundColor="#6c757d"
            color="white"
            fontSize="1rem"
            padding="10px 20px"
            borderRadius="5px"
            onClick={resetForm}
          >
            Cancel
          </ButtonComponent>
        )}
      </div>

      {/* Display Elections in Table */}
      <table className="elections-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {elections.map((election) => (
            <tr key={election.electionid}>
              <td>{election.title}</td>
              <td>{election.description}</td>
              <td>{election.start_date}</td>
              <td>{election.end_date}</td>
              <td>{election.isActive ? "Active" : "Inactive"}</td>
              <td>
                <ButtonComponent
                  backgroundColor="#17a2b8"
                  color="white"
                  fontSize="0.9rem"
                  padding="5px 10px"
                  borderRadius="5px"
                  onClick={() => handleEditElection(election)}
                >
                  Edit
                </ButtonComponent>
                <ButtonComponent
                  backgroundColor="#dc3545"
                  color="white"
                  fontSize="0.9rem"
                  padding="5px 10px"
                  borderRadius="5px"
                  onClick={() => handleDeleteElection(election.electionid)}
                >
                  Delete
                </ButtonComponent>
                <ButtonComponent
                  backgroundColor={election.isActive ? "#ffc107" : "#28a745"}
                  color="white"
                  fontSize="0.9rem"
                  padding="5px 10px"
                  borderRadius="5px"
                  onClick={() =>
                    handleToggleStatus(election.electionid, election.isActive)
                  }
                >
                  {election.isActive ? "Deactivate" : "Activate"}
                </ButtonComponent>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Election;
