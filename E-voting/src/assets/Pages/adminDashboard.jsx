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
  const [voters, setVoters] = useState([]);
  const [elections, setElections] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalVoters: 0,
    activeElections: 0,
    recentCandidates: [],
    voterParticipation: 0,
  });

  const fetchData = useCallback(async (endpoint) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${endpoint}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return [];
    }
  }, []);

  const calculateVoterParticipation = useCallback((voters) => {
    const votedVoters = voters.filter((voter) => voter.hasVoted).length;
    return voters.length > 0 ? (votedVoters / voters.length) * 100 : 0;
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const [votersData, electionsData, candidatesData] = await Promise.all([
        fetchData("voters"),
        fetchData("elections"),
        fetchData("candidates"),
      ]);

      const activeElections = electionsData.filter(
        (election) => new Date(election.endDate) > new Date()
      ).length;

      setDashboardStats({
        totalVoters: votersData.length,
        activeElections,
        recentCandidates: candidatesData.slice(0, 5),
        voterParticipation: calculateVoterParticipation(votersData),
      });
    } catch (error) {
      console.error("Error updating dashboard stats:", error);
    }
  }, [fetchData, calculateVoterParticipation]);

  useEffect(() => {
    if (!isAdmin) {
      logout();
      return;
    }
    const initializeDashboard = async () => {
      try {
        await fetchDashboardStats();
        const [votersData, electionsData, candidatesData] = await Promise.all([
          fetchData("voters"),
          fetchData("elections"),
          fetchData("candidates"),
        ]);
        setVoters(votersData);
        setElections(electionsData);
        setCandidates(candidatesData);
      } catch (error) {
        console.error("Error initializing dashboard:", error);
        if (error.response?.status === 401) {
          logout();
        }
      }
    };

    initializeDashboard();

    socket?.on("voter_registered", async (newVoter) => {
      setVoters((prev) => [...prev, newVoter]);
      await fetchDashboardStats();
    });

    return () => {
      socket?.off("voter_registered");
    };
  }, [isAdmin, logout, socket, fetchData, fetchDashboardStats]);

  if (!isAdmin) {
    return (
      <div className="auth-error">
        <h3>Access Denied</h3>
        <p>You must be logged in as an administrator to view this content.</p>
      </div>
    );
  }

  const chartOptions = {
    chart: {
      type: "line",
      height: 350,
      toolbar: {
        show: true,
      },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
      },
    },
    title: {
      text: "Election Analytics",
      align: "center",
      style: {
        fontSize: "20px",
        fontWeight: "bold",
      },
    },
    xaxis: {
      categories: elections.map((election) => election.name) || [],
      labels: {
        style: {
          fontSize: "12px",
        },
      },
    },
    series: [
      {
        name: "Voter Turnout",
        data: elections.map((election) => election.turnout || 0),
      },
    ],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    markers: {
      size: 6,
      hover: {
        size: 8,
      },
    },
    theme: {
      mode: "light",
    },
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </header>

      <aside className="admin-sidebar">
        <nav>
          <ul>
            {["dashboard", "elections", "candidates", "voters", "results"].map(
              (section) => (
                <li
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={activeSection === section ? "active" : ""}
                >
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </li>
              )
            )}
          </ul>
        </nav>
      </aside>

      <main className="admin-content">
        {activeSection === "dashboard" && (
          <div className="dashboard-overview">
            <h2>Dashboard Overview</h2>
            <div className="stats-cards">
              <div className="stats-card">
                <h3>Total Voters</h3>
                <p>{dashboardStats.totalVoters}</p>
              </div>
              <div className="stats-card">
                <h3>Active Elections</h3>
                <p>{dashboardStats.activeElections}</p>
              </div>
              <div className="stats-card">
                <h3>Recent Candidates</h3>
                <ul>
                  {dashboardStats.recentCandidates.map((candidate) => (
                    <li key={candidate.id}>
                      {candidate.name} ({candidate.party})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="election-status">
              <h3>Election Statuses</h3>
              <ul>
                {elections.map((election) => (
                  <li
                    key={election.id}
                    className={
                      election.isActive
                        ? "active-election"
                        : "completed-election"
                    }
                  >
                    {election.name} -{" "}
                    {election.isActive ? "Ongoing" : "Completed"}
                  </li>
                ))}
              </ul>
            </div>

            <div className="voter-statistics">
              <h3>Voter Statistics</h3>
              <p>Total Registered Voters: {dashboardStats.totalVoters}</p>
              <p>
                Voter Participation:{" "}
                {dashboardStats.voterParticipation.toFixed(2)}%
              </p>
            </div>

            <div className="performance-metrics">
              <h3>Election Analytics</h3>
              <Chart
                options={chartOptions}
                series={chartOptions.series}
                type="line"
                height={350}
              />
            </div>
          </div>
        )}

        {activeSection === "elections" && <Election />}
        {activeSection === "candidates" && <Candidate />}
        {activeSection === "voters" && <Voters voters={voters} />}
        {activeSection === "results" && <Results />}
      </main>
    </div>
  );
};

export default AdminDashboard;
