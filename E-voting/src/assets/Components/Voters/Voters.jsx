import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Voters.css";

const Voters = () => {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voterAnalytics, setVoterAnalytics] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVoters, setSelectedVoters] = useState([]);
  const votersPerPage = 10;

  const fetchVoters = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/voters", {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });

      const updatedVoters = response.data.map((voter) => ({
        ...voter,
        verified: voter.verified || true,
        inactiveFlag: voter.missedElections >= 3,
      }));

      setVoters(updatedVoters);
      setVoterAnalytics({
        total: updatedVoters.length,
        verified: updatedVoters.filter((voter) => voter.verified).length,
        inactive: updatedVoters.filter((voter) => voter.inactiveFlag).length,
      });
    } catch (err) {
      setError("Failed to fetch voters. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Update useEffect to use the extracted fetchVoters function
  useEffect(() => {
    fetchVoters();
  }, []);
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDeleteInactive = async () => {
    try {
      const response = await axios.delete(
        "http://localhost:5000/api/voters/inactive",
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      // Show success message
      alert(
        `Successfully deleted ${response.data.deletedVoters.length} inactive voters`
      );

      // Refresh the voters list
      fetchVoters();

      // Clear selection
      setSelectedVoters([]);
    } catch (err) {
      setError("Failed to delete inactive voters.");
    }
  };
  const filteredVoters = voters.filter(
    (voter) =>
      voter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.voterid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const indexOfLastVoter = currentPage * votersPerPage;
  const indexOfFirstVoter = indexOfLastVoter - votersPerPage;
  const currentVoters = filteredVoters.slice(
    indexOfFirstVoter,
    indexOfLastVoter
  );
  const totalPages = Math.ceil(filteredVoters.length / votersPerPage);

  return (
    <div className="voters-container">
      <h2>Registered Voters</h2>

      {loading && <div>Loading voters...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <>
          <div className="voter-controls">
            <input
              type="text"
              placeholder="Search voters..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
            <button
              onClick={handleDeleteInactive}
              disabled={selectedVoters.length === 0}
              className="delete-button"
            >
              Delete Inactive Voters
            </button>
          </div>

          <div className="voter-analytics">
            <p>Total Voters: {voterAnalytics.total}</p>
            <p>Verified Voters: {voterAnalytics.verified}</p>
            <p>Inactive Voters: {voterAnalytics.inactive}</p>
          </div>

          {currentVoters.length > 0 ? (
            <>
              <table className="voter-table" border={3}>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Voter ID</th>
                    <th>NIN</th>
                    <th>Verified</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentVoters.map((voter) => (
                    <tr
                      key={voter.id}
                      className={voter.inactiveFlag ? "inactive-row" : ""}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedVoters.includes(voter.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVoters([...selectedVoters, voter.id]);
                            } else {
                              setSelectedVoters(
                                selectedVoters.filter((id) => id !== voter.id)
                              );
                            }
                          }}
                        />
                      </td>
                      <td>{voter.name}</td>
                      <td>{voter.email}</td>
                      <td>{voter.voterid}</td>
                      <td>{voter.nin}</td>
                      <td>{voter.verified ? "Yes" : "No"}</td>
                      <td>{voter.inactiveFlag ? "Inactive" : "Active"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pagination">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={currentPage === i + 1 ? "active" : ""}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p>No voters found.</p>
          )}
        </>
      )}
    </div>
  );
};

export default Voters;
