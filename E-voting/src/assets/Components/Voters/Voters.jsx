import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Voters.css";

const Voters = () => {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voterAnalytics, setVoterAnalytics] = useState({});

  useEffect(() => {
    const fetchVoters = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/voters", {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          withCredentials: true,
        });

        console.log("Voters data:", response.data);

        // Ensure all voters are verified automatically
        const updatedVoters = response.data.map((voter) =>
          voter.verified ? voter : { ...voter, verified: true }
        );

        setVoters(updatedVoters);

        setVoterAnalytics({
          total: updatedVoters.length,
          verified: updatedVoters.filter((voter) => voter.verified).length,
        });
      } catch (err) {
        console.error("Error fetching voters:", err);
        setError("Failed to fetch voters. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchVoters();
  }, []);

  return (
    <div className="voters-container">
      <h2>Registered Voters</h2>

      {loading && <div>Loading voters...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <>
          <div className="voter-analytics">
            <p>Total Voters: {voterAnalytics.total}</p>
            <p>Verified Voters: {voterAnalytics.verified}</p>
          </div>

          {voters.length > 0 ? (
            <table className="voter-table" border={3}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Voter ID</th>
                  <th>NIN</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                {voters.map((voter) => (
                  <tr key={voter.id}>
                    <td>{voter.name}</td>
                    <td>{voter.email}</td>
                    <td>{voter.voterid}</td>
                    <td>{voter.nin}</td>
                    <td>{voter.verified ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No voters found.</p>
          )}
        </>
      )}
    </div>
  );
};

export default Voters;
