import { useState, useEffect } from "react";
import axios from "axios";
import { useUserContext } from "../../../Context/UserContext";

const Candidate = () => {
  const electionPositions = [
    "Presidential",
    "Governorship",
    "Senatorial",
    "House of Representatives",
    "State Assembly",
    "Local Government Chairman",
    "Student Union President",
    "Class Representative",
  ];

  const { user } = useUserContext();
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    party: "",
    electionId: "",
    picture: null,
  });
  const [elections, setElections] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchCandidates = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/candidates");
      setCandidates(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchElections = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/elections");
      setElections(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchElections();
  }, []);

  const handleFileChange = (e) => {
    setNewCandidate({
      ...newCandidate,
      picture: e.target.files[0],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newCandidate.name || !newCandidate.party || !newCandidate.electionId) {
      setError("All fields are required!");
      return;
    }

    const formData = new FormData();
    formData.append("name", newCandidate.name);
    formData.append("party", newCandidate.party);
    formData.append("electionId", newCandidate.electionId);
    formData.append("picture", newCandidate.picture);

    try {
      await axios.post("http://localhost:5000/api/candidates", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setSuccessMessage("Candidate added successfully!");
      fetchCandidates();
      setNewCandidate({ name: "", party: "", electionId: "", picture: null });
    } catch (err) {
      console.error(err);
      setError("An error occurred while adding the candidate.");
    }
  };

  const handleDisqualify = async (candidateId) => {
    try {
      await axios.delete(`http://localhost:5000/api/candidates/${candidateId}`);
      setSuccessMessage("Candidate disqualified successfully!");
      fetchCandidates();
    } catch (err) {
      console.error(err);
      setError("An error occurred while disqualifying the candidate.");
    }
  };

  return (
    <div>
      <h3>Manage Candidates</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={newCandidate.name}
          onChange={(e) =>
            setNewCandidate({ ...newCandidate, name: e.target.value })
          }
        />
        <select
          value={newCandidate.party}
          onChange={(e) =>
            setNewCandidate({ ...newCandidate, party: e.target.value })
          }
        >
          <option value="">Select Party</option>
          <option value="Party A">Party A</option>
          <option value="Party B">Party B</option>
        </select>
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
        <input type="file" onChange={handleFileChange} accept="image/*" />
        <button type="submit">Add Candidate</button>
      </form>

      {error && <p>{error}</p>}
      {successMessage && <p>{successMessage}</p>}

      <h4>Candidate List</h4>
      <ul>
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <img
              src={`http://localhost:5000/uploads/${candidate.picture}`}
              alt={candidate.name}
            />
            <p>{candidate.name}</p>
            <p>{candidate.party}</p>
            <p>{candidate.election}</p>
            <button onClick={() => handleDisqualify(candidate.id)}>
              Disqualify
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Candidate;
