import React, { useRef, useState, useEffect, useCallback } from "react";
import { useUserContext } from "../../Context/UserContext";
import axios from "axios";
import Election from "../Components/Election/Election";
import Candidate from "../Components/Candidate/Candidate";
import Voters from "../Components/Voters/Voters";
import Results from "../Components/Results/Results";
import Chart from "react-apexcharts";
import "./AdminDashboard.css";

const API_BASE_URL = "http://localhost:5000/api";

const AdminDashboard = ({ onLogout }) => {
  const { isAdmin, logout, socket } = useUserContext();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    voters: [],
    elections: [],
    candidates: [],
    stats: {
      totalVoters: 0,
      activeElections: 0,
      recentCandidates: [],
      voterParticipation: 0,
      totalVotes: 0,
    },
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const [voters, elections, candidates] = await Promise.all([
        axios.get(`${API_BASE_URL}/voters`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`${API_BASE_URL}/elections`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`${API_BASE_URL}/candidates`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);
      console.log("All candidates data:", candidates.data);
      console.log("First candidate example:", candidates.data[0]);
      console.log("Recent candidates being set:", candidates.data.slice(0, 5));
      const activeElections = elections.data.filter(
        (election) => new Date(election.endDate) > new Date()
      );

      setDashboardData({
        voters: voters.data,
        elections: elections.data,
        candidates: candidates.data,
        stats: {
          totalVoters: voters.data.length,
          activeElections: activeElections.length,
          recentCandidates: candidates.data.slice(0, 5),
          voterParticipation: calculateParticipation(voters.data),
          totalVotes: calculateTotalVotes(elections.data),
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const calculateParticipation = (voters) => {
    const votedVoters = voters.filter((voter) => voter.hasVoted).length;
    return voters.length > 0 ? (votedVoters / voters.length) * 100 : 0;
  };

  const calculateTotalVotes = (elections) => {
    return elections.reduce(
      (total, election) => total + (election.totalVotes || 0),
      0
    );
  };

  useEffect(() => {
    if (!isAdmin) {
      logout();
      return;
    }

    fetchDashboardData();

    socket?.on("voter_registered", () => {
      fetchDashboardData();
    });

    socket?.on("vote_cast", () => {
      fetchDashboardData();
    });

    return () => {
      socket?.off("voter_registered");
      socket?.off("vote_cast");
    };
  }, [isAdmin, logout, fetchDashboardData, socket]);

  const chartOptions = {
    chart: {
      type: "line",
      height: 350,
      toolbar: { show: true },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
      },
    },
    title: {
      text: "Election Analytics",
      align: "center",
      style: { fontSize: "20px", fontWeight: "bold" },
    },
    xaxis: {
      categories: dashboardData.elections.map((election) => election.name),
      labels: { style: { fontSize: "12px" } },
    },
    series: [
      {
        name: "Voter Turnout",
        data: dashboardData.elections.map((election) => election.turnout || 0),
      },
    ],
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 6, hover: { size: 8 } },
    // Add this inside the chart options
    theme: {
      mode: "light",
      palette: "palette1",
      monochrome: {
        enabled: false,
        color: "#3498db",
        shadeTo: "light",
        shadeIntensity: 0.65,
      },
    },
    tooltip: {
      theme: "light",
      x: {
        show: true,
      },
      y: {
        title: {
          formatter: (value) => `${value}:`,
        },
      },
    },
    grid: {
      borderColor: "#f1f1f1",
      row: {
        colors: ["transparent", "transparent"],
        opacity: 0.5,
      },
    },
  };

  if (!isAdmin) {
    return (
      <div className="auth-error">
        <h3>Access Denied</h3>
        <p>Administrator access required.</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </header>

      {loading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          <aside className="admin-sidebar">
            <nav>
              <ul>
                {[
                  "dashboard",
                  "elections",
                  "candidates",
                  "voters",
                  "results",
                ].map((section) => (
                  <li
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={activeSection === section ? "active" : ""}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <main className="admin-content">
            {activeSection === "dashboard" && (
              <div className="dashboard-overview">
                <div className="stats-cards">
                  <div className="stat-card">
                    <h3>Total Voters</h3>
                    <p>{dashboardData.stats.totalVoters}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Active Elections</h3>
                    <p>{dashboardData.stats.activeElections}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Votes Cast</h3>
                    <p>{dashboardData.stats.totalVotes}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Voter Participation</h3>
                    <p>{dashboardData.stats.voterParticipation.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="data-section">
                  <Chart
                    options={chartOptions}
                    series={chartOptions.series}
                    type="line"
                    height={350}
                  />
                </div>

                <div className="recent-activity">
                  <h3>Recent Candidates</h3>
                  <div className="data-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Party</th>
                          <th>Election</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.stats.recentCandidates.map(
                          (candidate) => (
                            <tr key={candidate.candidateid}>
                              <td>{candidate.name}</td>
                              <td>{candidate.party}</td>
                              <td>{candidate.election}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "elections" && <Election />}
            {activeSection === "candidates" && <Candidate />}
            {activeSection === "voters" && (
              <Voters voters={dashboardData.voters} />
            )}
            {activeSection === "results" && <Results />}
          </main>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
