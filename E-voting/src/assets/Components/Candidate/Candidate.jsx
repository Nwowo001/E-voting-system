import { useState, useEffect } from "react";
import axios from "axios";
import { useUserContext } from "../../../Context/UserContext";
import "./Candidate.css";

const API_URL = "http://localhost:5000/api";

const Candidate = () => {
  const { user } = useUserContext();
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    party: "",
    electionId: "",
    picture: null,
  });
  const [picturePreview, setPicturePreview] = useState(null);
  const [elections, setElections] = useState([]);
  const [editCandidateId, setEditCandidateId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchCandidates();
    fetchElections();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API_URL}/candidates`);
      setCandidates(response.data);
    } catch (err) {
      setError("Failed to fetch candidates.");
    }
  };

  const fetchElections = async () => {
    try {
      const response = await axios.get(`${API_URL}/elections`);
      setElections(response.data);
    } catch (err) {
      setError("Failed to fetch elections.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewCandidate({ ...newCandidate, picture: file });
      setPicturePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("name", newCandidate.name);
    formData.append("party", newCandidate.party);
    formData.append("electionId", newCandidate.electionId);
    if (newCandidate.picture) {
      formData.append("picture", newCandidate.picture);
    }

    try {
      if (editCandidateId) {
        await axios.put(`${API_URL}/candidates/${editCandidateId}`, formData);
        setSuccessMessage("Candidate updated successfully!");
      } else {
        await axios.post(`${API_URL}/candidates`, formData);
        setSuccessMessage("Candidate added successfully!");
      }
      fetchCandidates();
      resetForm();
    } catch (err) {
      setError("An error occurred while saving the candidate.");
    }
  };

  const resetForm = () => {
    setNewCandidate({ name: "", party: "", electionId: "", picture: null });
    setPicturePreview(null);
    setEditCandidateId(null);
  };

  return (
    <div className="candidate-container">
      <div className="candidate-header">
        <h3>Manage Candidates</h3>
      </div>

      <form className="candidate-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="input-group">
            <input
              type="text"
              placeholder="Candidate Name"
              value={newCandidate.name}
              onChange={(e) =>
                setNewCandidate({ ...newCandidate, name: e.target.value })
              }
            />
          </div>
          <div className="input-group">
            <input
              type="text"
              placeholder="Party"
              value={newCandidate.party}
              onChange={(e) =>
                setNewCandidate({ ...newCandidate, party: e.target.value })
              }
            />
          </div>
          <div className="input-group">
            <select
              value={newCandidate.electionId}
              onChange={(e) =>
                setNewCandidate({ ...newCandidate, electionId: e.target.value })
              }
            >
              <option value="">Select Election</option>
              {elections.map((election) => (
                <option key={election.electionid} value={election.electionid}>
                  {election.title}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <input type="file" onChange={handleFileChange} accept="image/*" />
            {picturePreview && (
              <div className="image-preview">
                <img src={picturePreview} alt="Preview" />
              </div>
            )}
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="action-button submit-button">
            {editCandidateId ? "Update Candidate" : "Add Candidate"}
          </button>
          {editCandidateId && (
            <button
              type="button"
              className="action-button cancel-button"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <div className="message error">{error}</div>}
      {successMessage && (
        <div className="message success">{successMessage}</div>
      )}

      <div className="candidate-list">
        <table className="candidate-list-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Party</th>
              <th>Election</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.candidateid}>
                <td>
                  <img
                    src={`http://localhost:5000${candidate.image_url}`}
                    alt={candidate.name}
                  />
                </td>
                <td className="candidate-name">{candidate.name}</td>
                <td className="candidate-party">{candidate.party}</td>
                <td className="election-name">{candidate.election}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-button edit-button"
                      onClick={() => handleEdit(candidate)}
                    >
                      Edit
                    </button>
                    <button
                      className="action-button delete-button"
                      onClick={() => handleDisqualify(candidate.candidateid)}
                    >
                      Disqualify
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Candidate;
