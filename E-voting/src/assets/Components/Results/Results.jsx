import React, { useState, useEffect, useRef } from "react";
import { 
  FaChartBar, 
  FaDownload, 
  FaShare, 
  FaFilter, 
  FaSearch, 
  FaPrint, 
  FaInfoCircle, 
  FaExclamationTriangle,
  FaChartPie,
  FaChartLine,
  FaTrophy,
  FaUserFriends,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaVoteYea
} from "react-icons/fa";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { CSVLink } from "react-csv";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Results.css";

const Results = () => {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [electionDetails, setElectionDetails] = useState(null);
  const [chartType, setChartType] = useState("bar");
  const [showPercentage, setShowPercentage] = useState(true);
  const [showVotes, setShowVotes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [historicalData, setHistoricalData] = useState([]);
  const [showHistorical, setShowHistorical] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonElection, setComparisonElection] = useState("");
  const [comparisonResults, setComparisonResults] = useState([]);
  const [sortOrder, setSortOrder] = useState("votes");
  const [showDetails, setShowDetails] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [electionStatus, setElectionStatus] = useState("completed");
  const resultsRef = useRef(null);
  const chartRef = useRef(null);

  const COLORS = [
    "#3498db", "#2ecc71", "#e74c3c", "#f39c12", "#9b59b6", 
    "#1abc9c", "#d35400", "#c0392b", "#16a085", "#8e44ad",
    "#27ae60", "#2980b9", "#f1c40f", "#e67e22", "#34495e"
  ];

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (liveUpdate && selectedElection && electionStatus === "active") {
      const interval = setInterval(() => {
        fetchResults(selectedElection);
        setLastUpdated(new Date());
      }, 10000); // Update every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [liveUpdate, selectedElection, electionStatus]);

  const fetchElections = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/elections");
      const data = await response.json();
      setElections(data);
      setLoading(false);
      
      // If there are elections, select the first one by default
      if (data.length > 0) {
        setSelectedElection(data[0].electionid);
        fetchResults(data[0].electionid);
        fetchElectionDetails(data[0].electionid);
        fetchHistoricalData(data[0].electionid);
      }
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
        (sum, result) => sum + parseInt(result.vote_count || 0, 10),
        0
      );

      const resultsWithPercentage = data.map((result) => ({
        ...result,
        percentage: (
          (parseInt(result.vote_count || 0, 10) / (totalVotes || 1)) *
          100
        ).toFixed(1),
        votes: parseInt(result.vote_count || 0, 10),
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      }));

      // Sort results based on sortOrder
      const sortedResults = sortResults(resultsWithPercentage, sortOrder);
      
      setResults(sortedResults);
      setError(null);
    } catch (error) {
      setError("Failed to fetch results");
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const fetchElectionDetails = async (electionId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/elections/${electionId}`
      );
      const data = await response.json();
      
      setElectionDetails(data);
      
      // Check if election is active - FIX: Improved logic for determining election status
      const now = new Date();
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      // Convert times to proper Date objects with time components
      const startDateTime = new Date(`${data.start_date}T${data.start_time || '00:00:00'}`);
      const endDateTime = new Date(`${data.end_date}T${data.end_time || '23:59:59'}`);
      
      if (now >= startDateTime && now <= endDateTime) {
        setElectionStatus("active");
        setLiveUpdate(true);
      } else if (now < startDateTime) {
        setElectionStatus("upcoming");
        setLiveUpdate(false);
      } else {
        setElectionStatus("completed");
        setLiveUpdate(false);
      }
      
      // Also check the isactive flag from the database
      if (data.isactive) {
        setElectionStatus("active");
        setLiveUpdate(true);
      }
    } catch (error) {
      console.error("Failed to fetch election details:", error);
    }
  };

  const fetchHistoricalData = async (electionId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/elections/historical/${electionId}`
      );
      const data = await response.json();
      setHistoricalData(data);
    } catch (error) {
      console.error("Failed to fetch historical data:", error);
    }
  };

  const fetchComparisonResults = async (electionId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/elections/results/${electionId}`
      );
      const data = await response.json();

      const totalVotes = data.reduce(
        (sum, result) => sum + parseInt(result.vote_count || 0, 10),
        0
      );

      const resultsWithPercentage = data.map((result) => ({
        ...result,
        percentage: (
          (parseInt(result.vote_count || 0, 10) / (totalVotes || 1)) *
          100
        ).toFixed(1),
        votes: parseInt(result.vote_count || 0, 10)
      }));

      setComparisonResults(resultsWithPercentage);
    } catch (error) {
      console.error("Failed to fetch comparison results:", error);
    }
  };

  const handleElectionChange = (e) => {
    const electionId = e.target.value;
    setSelectedElection(electionId);
    if (electionId) {
      fetchResults(electionId);
      fetchElectionDetails(electionId);
      fetchHistoricalData(electionId);
      
      // Reset comparison if active
      if (comparisonMode) {
        setComparisonElection("");
        setComparisonResults([]);
        setComparisonMode(false);
      }
    } else {
      setResults([]);
      setElectionDetails(null);
      setHistoricalData([]);
    }
  };

  const handleComparisonElectionChange = (e) => {
    const electionId = e.target.value;
    setComparisonElection(electionId);
    if (electionId) {
      fetchComparisonResults(electionId);
    } else {
      setComparisonResults([]);
    }
  };

  const handleChartTypeChange = (type) => {
    setChartType(type);
  };

  const handleSortOrderChange = (order) => {
    setSortOrder(order);
    setResults(sortResults(results, order));
  };

  const sortResults = (resultsToSort, order) => {
    return [...resultsToSort].sort((a, b) => {
      if (order === "votes") {
        return b.votes - a.votes;
      } else if (order === "name") {
        return a.candidate_name.localeCompare(b.candidate_name);
      } else if (order === "party") {
        return a.party.localeCompare(b.party);
      }
      return 0;
    });
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredResults = results.filter(result => 
    result.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (result.party && result.party.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleComparisonMode = () => {
    setComparisonMode(!comparisonMode);
    if (!comparisonMode) {
      // Default to the second election if available
      if (elections.length > 1) {
        const secondElection = elections.find(e => e.electionid !== selectedElection);
        if (secondElection) {
          setComparisonElection(secondElection.electionid);
          fetchComparisonResults(secondElection.electionid);
        }
      }
    } else {
      setComparisonElection("");
      setComparisonResults([]);
    }
  };

  const toggleHistorical = () => {
    setShowHistorical(!showHistorical);
  };

  const toggleLiveUpdate = () => {
    setLiveUpdate(!liveUpdate);
  };

  const exportToPDF = () => {
    if (!resultsRef.current) return;
    
    toast.info("Generating PDF...");
    
    const input = resultsRef.current;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.setFontSize(18);
      pdf.text(`Election Results: ${electionDetails?.title || ""}`, 14, 15);
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
      pdf.save(`election-results-${selectedElection}.pdf`);
      
      toast.success("PDF downloaded successfully!");
    });
  };

  const exportToImage = () => {
    if (!chartRef.current) return;
    
    toast.info("Generating image...");
    
    html2canvas(chartRef.current).then(canvas => {
      const link = document.createElement('a');
      link.download = `election-results-${selectedElection}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success("Image downloaded successfully!");
    });
  };

  const getCSVData = () => {
    return filteredResults.map(result => ({
      Candidate: result.candidate_name,
      Party: result.party || "N/A", // FIX: Handle null/undefined party
      Votes: result.votes,
      Percentage: `${result.percentage}%`
    }));
  };

  const printResults = () => {
    window.print();
  };

  const renderBarChart = (data) => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="candidate_name" 
          angle={-45} 
          textAnchor="end" 
          height={80} 
          tick={{ fontSize: 12 }}
        />
        <YAxis />
        <Tooltip 
          formatter={(value, name) => {
            if (name === "votes") return [`${value} votes`, "Votes"];
            return [`${value}%`, "Percentage"];
          }}
          labelFormatter={(label) => {
            const candidate = data.find(item => item.candidate_name === label);
            return `${label} (${candidate?.party || "N/A"})`;
          }}
        />
        <Legend />
        {showVotes && (
          <Bar 
            dataKey="votes" 
            name="Votes" 
            fill="#3498db" 
            radius={[4, 4, 0, 0]}
            animationDuration={1000}
          />
        )}
        {showPercentage && (
          <Bar 
          dataKey="percentage" 
          name="Percentage" 
          fill="#2ecc71" 
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
        />
      )}
    </BarChart>
  </ResponsiveContainer>
);

const renderPieChart = (data) => (
  <ResponsiveContainer width="100%" height={400}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={true}
        outerRadius={150}
        fill="#8884d8"
        dataKey={showVotes ? "votes" : "percentage"}
        nameKey="candidate_name"
        label={({ name, value, percent, candidate_name, party }) => {
          const candidate = data.find(item => item.candidate_name === name);
          return `${name} (${candidate?.party || "N/A"}): ${showVotes ? 
            `${value} votes` : 
            `${value}%`}`;
        }}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip 
        formatter={(value, name, props) => {
          const candidate = data.find(item => item.candidate_name === name);
          return [`${showVotes ? 
            `${value} votes (${candidate?.percentage}%)` : 
            `${value}% (${candidate?.votes} votes)`}`, 
            `${name} (${candidate?.party || "N/A"})`];
        }}
      />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

const renderHistoricalChart = () => (
  <ResponsiveContainer width="100%" height={400}>
    <LineChart
      data={historicalData}
      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="timestamp" 
        angle={-45} 
        textAnchor="end" 
        height={80}
        tick={{ fontSize: 12 }}
      />
      <YAxis />
      <Tooltip />
      <Legend />
      {results.map((candidate, index) => (
        <Line
          key={candidate.candidate_name}
          type="monotone"
          dataKey={`votes.${candidate.candidate_name}`}
          name={candidate.candidate_name}
          stroke={COLORS[index % COLORS.length]}
          activeDot={{ r: 8 }}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

const renderTurnoutChart = () => {
  if (!electionDetails) return null;
  
  const turnoutData = [
    { name: 'Voted', value: electionDetails.total_votes || 0 },
    { name: 'Not Voted', value: (electionDetails.eligible_voters || 0) - (electionDetails.total_votes || 0) }
  ];
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={turnoutData}
          cx="50%"
          cy="50%"
          labelLine={true}
          outerRadius={150}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
        >
          <Cell fill="#3498db" />
          <Cell fill="#e74c3c" />
        </Pie>
        <Tooltip 
          formatter={(value, name) => [
            `${value} voters (${((value / (electionDetails.eligible_voters || 1)) * 100).toFixed(1)}%)`, 
            name
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

const renderComparisonChart = () => {
  const comparisonElectionDetails = elections.find(
    e => e.electionid === comparisonElection
  );
  
  // Create comparison data
  const comparisonData = getComparisonData();
  
  return (
    <div className="comparison-chart">
      <h3>Comparison: {electionDetails?.title || ""} vs {comparisonElectionDetails?.title || ""}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={comparisonData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={100}
          />
          <Tooltip 
            formatter={(value, name, props) => {
              const isCurrentElection = name === (electionDetails?.title || "Current");
              return [
                `${value} ${showPercentage ? '%' : 'votes'}`,
                `${name} (${isCurrentElection ? props.payload.currentParty : props.payload.comparisonParty})`
              ];
            }}
          />
          <Legend />
          <Bar 
            dataKey="current" 
            name={electionDetails?.title || "Current"} 
            fill="#3498db" 
            animationDuration={1000}
          />
          <Bar 
            dataKey="comparison" 
            name={comparisonElectionDetails?.title || "Comparison"} 
            fill="#e74c3c" 
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const getComparisonData = () => {
  // Create a map of all candidates from both elections
  const allCandidates = new Set();
  results.forEach(r => allCandidates.add(r.candidate_name));
  comparisonResults.forEach(r => allCandidates.add(r.candidate_name));
  
  // Create comparison data
  return Array.from(allCandidates).map(candidate => {
    const currentResult = results.find(r => r.candidate_name === candidate);
    const comparisonResult = comparisonResults.find(r => r.candidate_name === candidate);
    
    return {
      name: candidate,
      current: currentResult ? (showPercentage ? parseFloat(currentResult.percentage) : currentResult.votes) : 0,
      comparison: comparisonResult ? (showPercentage ? parseFloat(comparisonResult.percentage) : comparisonResult.votes) : 0,
      currentParty: currentResult?.party || "N/A",
      comparisonParty: comparisonResult?.party || "N/A"
    };
  });
};

const renderWinner = () => {
  if (!results.length) return null;
  
  const winner = [...results].sort((a, b) => b.votes - a.votes)[0];
  const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);
  const winningMargin = results.length > 1 
    ? (winner.votes - results.sort((a, b) => b.votes - a.votes)[1].votes) 
    : winner.votes;
  
  return (
    <div className="winner-card">
      <div className="winner-header">
        <FaTrophy className="winner-icon" />
        <h3>Election Winner</h3>
      </div>
      <div className="winner-details">
        <div className="winner-name">{winner.candidate_name}</div>
        <div className="winner-party">{winner.party || "N/A"}</div>
        <div className="winner-votes">
          <span className="votes-count">{winner.votes}</span> votes
          <span className="votes-percentage">({winner.percentage}%)</span>
        </div>
        <div className="winner-margin">
          Won by <strong>{winningMargin}</strong> votes
          <span className="margin-percentage">
            ({((winningMargin / totalVotes) * 100).toFixed(1)}% margin)
          </span>
        </div>
      </div>
    </div>
  );
};

const renderElectionDetails = () => {
  if (!electionDetails) return null;
  
  return (
    <div className="election-details-card">
      <div className="election-details-header">
        <h3>Election Details</h3>
        <button 
          className="toggle-details-btn"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Hide Details" : "Show Details"}
        </button>
      </div>
      
      {showDetails && (
        <div className="election-details-content">
          <div className="detail-item">
            <FaCalendarAlt className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Start Date:</span>
              <span className="detail-value">
                {new Date(electionDetails.start_date).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="detail-item">
            <FaCalendarAlt className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">End Date:</span>
              <span className="detail-value">
                {new Date(electionDetails.end_date).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="detail-item">
            <FaClock className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Duration:</span>
              <span className="detail-value">
                {Math.ceil((new Date(electionDetails.end_date) - new Date(electionDetails.start_date)) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          </div>
          
          <div className="detail-item">
            <FaUserFriends className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Eligible Voters:</span>
              <span className="detail-value">
                {electionDetails.eligible_voters || "N/A"}
              </span>
            </div>
          </div>
          
          <div className="detail-item">
            <FaVoteYea className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Total Votes:</span>
              <span className="detail-value">
                {electionDetails.total_votes || 0}
              </span>
            </div>
          </div>
          
          <div className="detail-item">
            <FaChartPie className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Turnout:</span>
              <span className="detail-value">
                {electionDetails.eligible_voters 
                  ? `${((electionDetails.total_votes / electionDetails.eligible_voters) * 100).toFixed(1)}%` 
                  : "N/A"}
              </span>
            </div>
          </div>
          
          <div className="detail-item">
            <FaMapMarkerAlt className="detail-icon" />
            <div className="detail-text">
              <span className="detail-label">Location:</span>
              <span className="detail-value">
                {electionDetails.location || "National"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const renderStatusBadge = (status) => {
  // Use the passed status parameter or the component state
  const currentStatus = status || electionStatus;
  
  let badgeClass = "";
  let badgeText = "";
  
  switch (currentStatus) {
    case "active":
      badgeClass = "status-badge-active";
      badgeText = "Active";
      break;
    case "upcoming":
      badgeClass = "status-badge-upcoming";
      badgeText = "Upcoming";
      break;
    case "completed":
      badgeClass = "status-badge-completed";
      badgeText = "Completed";
      break;
    default:
      return null;
  }
  
  return <span className={`status-badge ${badgeClass}`}>{badgeText}</span>;
};

if (loading && !results.length) {
  return (
    <div className="results-container">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading election results...</p>
      </div>
    </div>
  );
}

return (
  <div className="results-container">
    <ToastContainer position="top-right" autoClose={3000} />
    
    <div className="results-header">
      <h2>
        <FaChartBar className="header-icon" />
        Election Results
      </h2>
      
      <div className="election-selector">
        <select
          value={selectedElection}
          onChange={handleElectionChange}
          className="election-select"
        >
          <option value="">Select an election</option>
          {elections.map((election) => (
            <option key={election.electionid} value={election.electionid}>
              {election.title}
            </option>
          ))}
        </select>
      </div>
    </div>
    
    {error ? (
      <div className="error-message">
        <FaExclamationTriangle className="error-icon" />
        <p>{error}</p>
        <button 
          className="retry-button"
          onClick={() => fetchResults(selectedElection)}
        >
          Retry
        </button>
      </div>
    ) : selectedElection ? (
      <div className="results-content" ref={resultsRef}>
        {electionDetails && (
          <div className="election-title-section">
            <h3>{electionDetails.title}</h3>
            {renderStatusBadge()}
            {electionStatus === "active" && (
              <div className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </div>
            )}
          </div>
        )}
        
        <div className="results-controls">
          <div className="control-group">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search candidates or parties..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
            </div>
            
            <div className="filter-options">
              <label className="filter-label">
                <FaFilter className="filter-icon" />
                Sort by:
              </label>
              <select
                value={sortOrder}
                onChange={(e) => handleSortOrderChange(e.target.value)}
                className="filter-select"
              >
                  <option value="votes">Votes (High to Low)</option>
                  <option value="name">Candidate Name</option>
                  <option value="party">Party</option>
                </select>
              </div>
            </div>
            
            <div className="control-group">
              <div className="chart-type-selector">
                <button
                  className={`chart-type-btn ${chartType === "bar" ? "active" : ""}`}
                  onClick={() => handleChartTypeChange("bar")}
                  title="Bar Chart"
                >
                  <FaChartBar />
                </button>
                <button
                  className={`chart-type-btn ${chartType === "pie" ? "active" : ""}`}
                  onClick={() => handleChartTypeChange("pie")}
                  title="Pie Chart"
                >
                  <FaChartPie />
                </button>
                <button
                  className={`chart-type-btn ${chartType === "historical" ? "active" : ""}`}
                  onClick={() => handleChartTypeChange("historical")}
                  title="Historical Trend"
                >
                  <FaChartLine />
                </button>
                <button
                  className={`chart-type-btn ${chartType === "turnout" ? "active" : ""}`}
                  onClick={() => handleChartTypeChange("turnout")}
                  title="Voter Turnout"
                >
                  <FaUserFriends />
                </button>
              </div>
              
              <div className="display-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showVotes}
                    onChange={() => setShowVotes(!showVotes)}
                  />
                  Show Votes
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showPercentage}
                    onChange={() => setShowPercentage(!showPercentage)}
                  />
                  Show Percentage
                </label>
                {electionStatus === "active" && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={liveUpdate}
                      onChange={toggleLiveUpdate}
                    />
                    Live Updates
                  </label>
                )}
              </div>
            </div>
            
            <div className="control-group">
              <div className="export-options">
                <button
                  className="export-btn"
                  onClick={exportToPDF}
                  title="Export to PDF"
                >
                  <FaDownload /> PDF
                </button>
                <button
                  className="export-btn"
                  onClick={exportToImage}
                  title="Export as Image"
                >
                  <FaDownload /> Image
                </button>
                <CSVLink
                  data={getCSVData()}
                  filename={`election-results-${selectedElection}.csv`}
                  className="export-btn"
                  target="_blank"
                >
                  <FaDownload /> CSV
                </CSVLink>
                <button
                  className="export-btn"
                  onClick={printResults}
                  title="Print Results"
                >
                  <FaPrint /> Print
                </button>
              </div>
              
              <div className="comparison-options">
                <button
                  className={`comparison-btn ${comparisonMode ? "active" : ""}`}
                  onClick={toggleComparisonMode}
                >
                  {comparisonMode ? "Hide Comparison" : "Compare Elections"}
                </button>
              </div>
            </div>
          </div>
          
          {comparisonMode && (
            <div className="comparison-controls">
              <label>Compare with:</label>
              <select
                value={comparisonElection}
                onChange={handleComparisonElectionChange}
                className="comparison-select"
              >
                <option value="">Select an election</option>
                {elections
                  .filter(e => e.electionid !== selectedElection)
                  .map(election => (
                    <option key={election.electionid} value={election.electionid}>
                      {election.title}
                    </option>
                  ))}
              </select>
            </div>
          )}
          
          {lastUpdated && (
            <div className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {electionStatus === "active" && liveUpdate && (
                <span className="updating-indicator"> (Auto-updating)</span>
              )}
            </div>
          )}
          
          <div className="results-dashboard">
            <div className="results-main">
              <div className="chart-container" ref={chartRef}>
                {comparisonMode && comparisonElection ? (
                  renderComparisonChart()
                ) : chartType === "bar" ? (
                  renderBarChart(filteredResults)
                ) : chartType === "pie" ? (
                  renderPieChart(filteredResults)
                ) : chartType === "historical" ? (
                  renderHistoricalChart()
                ) : chartType === "turnout" ? (
                  renderTurnoutChart()
                ) : null}
              </div>
              
              <div className="results-table-container">
                <h3>Detailed Results</h3>
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Candidate</th>
                      <th>Party</th>
                      <th>Votes</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((result, index) => (
                      <tr 
                        key={result.candidate_name}
                        className={index === 0 ? "winner-row" : ""}
                      >
                        <td>{index + 1}</td>
                        <td>{result.candidate_name}</td>
                        <td>
                          <span className="party-badge">{result.party || "N/A"}</span>
                        </td>
                        <td>{result.votes.toLocaleString()}</td>
                        <td>{result.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3">Total</td>
                      <td>
                        {filteredResults
                          .reduce((sum, result) => sum + result.votes, 0)
                          .toLocaleString()}
                      </td>
                      <td>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="results-sidebar">
              {renderWinner()}
              {renderElectionDetails()}
              
              <div className="stats-card">
                <h3>Quick Stats</h3>
                <div className="stats-item">
                  <span className="stats-label">Total Candidates:</span>
                  <span className="stats-value">{results.length}</span>
                </div>
                <div className="stats-item">
                  <span className="stats-label">Total Votes Cast:</span>
                  <span className="stats-value">
                    {results
                      .reduce((sum, result) => sum + result.votes, 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="stats-item">
                  <span className="stats-label">Voter Turnout:</span>
                  <span className="stats-value">
                    {electionDetails?.eligible_voters 
                      ? `${((electionDetails.total_votes / electionDetails.eligible_voters) * 100).toFixed(1)}%` 
                      : "N/A"}
                  </span>
                </div>
                <div className="stats-item">
                  <span className="stats-label">Election Status:</span>
                  <span className="stats-value">
                    {renderStatusBadge()}
                  </span>
                </div>
              </div>
              
              {electionStatus === "active" && (
                <div className="live-updates-card">
                  <h3>Live Updates</h3>
                  <p>This election is currently active. Results are being updated in real-time.</p>
                  <label className="live-toggle">
                    <input
                      type="checkbox"
                      checked={liveUpdate}
                      onChange={toggleLiveUpdate}
                    />
                    <span className="toggle-slider"></span>
                    Auto-update results
                  </label>
                  {lastUpdated && (
                    <div className="last-updated-time">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-election-selected">
          <FaInfoCircle className="info-icon" />
          <p>Please select an election to view results</p>
        </div>
      )}
    </div>
  );
};

export default Results;
