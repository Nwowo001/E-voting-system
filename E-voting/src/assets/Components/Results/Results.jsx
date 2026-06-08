import { useState, useEffect, useRef } from "react";
import { 
  FaChartBar, 
  FaDownload, 
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
  FaVoteYea,
  FaSpinner
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
  Line
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_URL } from "../../../config";

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
    "#6366f1", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", 
    "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#a855f7"
  ];

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (liveUpdate && selectedElection && electionStatus === "active") {
      const interval = setInterval(() => {
        fetchResults(selectedElection);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [liveUpdate, selectedElection, electionStatus]);

  const fetchElections = async () => {
    try {
      const response = await fetch(`${API_URL}/elections`);
      const data = await response.json();
      setElections(data);
      setLoading(false);
      
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
      const response = await fetch(`${API_URL}/elections/results/${electionId}`);
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

      const sortedResults = sortResults(resultsWithPercentage, sortOrder);
      setResults(sortedResults);
      setError(null);
    } catch (error) {
      setError("Failed to fetch results");
    } finally {
      setLastUpdated(new Date());
    }
  };

  const fetchElectionDetails = async (electionId) => {
    try {
      const response = await fetch(`${API_URL}/elections/${electionId}`);
      const data = await response.json();
      setElectionDetails(data);
      
      const now = new Date();
      const startDateTime = new Date(`${data.start_date.slice(0, 10)}T${data.start_time || '00:00:00'}`);
      const endDateTime = new Date(`${data.end_date.slice(0, 10)}T${data.end_time || '23:59:59'}`);
      
      if (now >= startDateTime && now <= endDateTime && data.isactive) {
        setElectionStatus("active");
        setLiveUpdate(true);
      } else if (now < startDateTime) {
        setElectionStatus("upcoming");
        setLiveUpdate(false);
      } else {
        setElectionStatus("completed");
        setLiveUpdate(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchHistoricalData = async (electionId) => {
    try {
      const response = await fetch(`${API_URL}/elections/historical/${electionId}`);
      if (response.ok) {
        const data = await response.json();
        setHistoricalData(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchComparisonResults = async (electionId) => {
    try {
      const response = await fetch(`${API_URL}/elections/results/${electionId}`);
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
      console.error(error);
    }
  };

  const handleElectionChange = (e) => {
    const electionId = e.target.value;
    setSelectedElection(electionId);
    if (electionId) {
      fetchResults(electionId);
      fetchElectionDetails(electionId);
      fetchHistoricalData(electionId);
      
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
      if (order === "votes") return b.votes - a.votes;
      if (order === "name") return a.candidate_name.localeCompare(b.candidate_name);
      return 0;
    });
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredResults = results.filter(result => 
    result.candidate_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleComparisonMode = () => {
    setComparisonMode(!comparisonMode);
    if (!comparisonMode) {
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

  const toggleLiveUpdate = () => setLiveUpdate(!liveUpdate);

  const exportToPDF = () => {
    if (!resultsRef.current) return;
    toast.info("Generating PDF report...");
    
    const input = resultsRef.current;
    html2canvas(input, { scale: 2, backgroundColor: "#0f172a" }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      pdf.addImage(imgData, 'PNG', 0, 10, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`election_audit_${selectedElection}.pdf`);
      toast.success("Audit PDF report downloaded!");
    });
  };

  const exportToImage = () => {
    if (!chartRef.current) return;
    toast.info("Generating graphic stand png...");
    
    html2canvas(chartRef.current, { backgroundColor: "#1e293b" }).then(canvas => {
      const link = document.createElement('a');
      link.download = `election_stands_${selectedElection}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success("Graphic standing saved!");
    });
  };

  const exportToCSV = () => {
    const headers = ["Candidate", "Votes", "Percentage"];
    const csvContent = [
      headers.join(","),
      ...filteredResults.map(r => [
        `"${r.candidate_name}"`,
        r.votes,
        `"${r.percentage}%"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `results_${selectedElection}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV table downloaded!");
  };

  const renderBarChart = (data) => (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
        <XAxis 
          dataKey="candidate_name" 
          stroke="#94a3b8" 
          fontSize={11}
          tickLine={false}
        />
        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload;
              return (
                <div className="bg-surface border border-border p-3 rounded-xl shadow-xl text-xs">
                  <p className="text-text font-bold">{item.candidate_name}</p>
                  {showVotes && <p className="text-indigo-400 font-bold mt-1">{item.votes} votes</p>}
                  {showPercentage && <p className="text-emerald-400 font-bold">{item.percentage}% of total</p>}
                </div>
              );
            }
            return null;
          }}
        />
        {showVotes && <Bar dataKey="votes" fill="#6366f1" radius={[4, 4, 0, 0]} />}
        {showPercentage && <Bar dataKey="percentage" fill="#10b981" radius={[4, 4, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = (data) => (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#8884d8"
          dataKey={showVotes ? "votes" : "percentage"}
          nameKey="candidate_name"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload;
              return (
                <div className="bg-surface border border-border p-3 rounded-xl shadow-xl text-xs">
                  <p className="text-text font-bold">{item.candidate_name}</p>
                  <p className="text-indigo-400 font-bold mt-1">{item.votes} votes ({item.percentage}%)</p>
                </div>
              );
            }
            return null;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderTurnoutChart = () => {
    if (!electionDetails) return null;
    const turnoutData = [
      { name: 'Voted participation', value: results.reduce((sum, r) => sum + r.votes, 0) },
      { name: 'Non-participants', value: Math.max(0, (electionDetails.eligible_voters || 0) - results.reduce((sum, r) => sum + r.votes, 0)) }
    ];
    
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={turnoutData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
          >
            <Cell fill="#6366f1" />
            <Cell fill="#ef4444" />
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderWinner = () => {
    if (!results.length) return null;
    const winner = [...results].sort((a, b) => b.votes - a.votes)[0];
    const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);
    const runnerUp = [...results].sort((a, b) => b.votes - a.votes)[1];
    const winningMargin = runnerUp ? winner.votes - runnerUp.votes : winner.votes;
    
    return (
      <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute right-4 top-4 text-amber-400 text-5xl opacity-20">
          <FaTrophy />
        </div>
        <div className="flex items-center gap-3 mb-4">
          <FaTrophy className="text-amber-400 text-xl" />
          <h3 className="text-text font-bold text-sm">Projected Winner</h3>
        </div>
        
        <div className="space-y-1">
          <p className="text-2xl font-bold text-text leading-tight">{winner.candidate_name}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 border-t border-border/50 pt-4 text-xs">
          <div>
            <p className="text-text-muted">Winning Votes</p>
            <p className="text-base font-bold text-text mt-0.5">
              {winner.votes.toLocaleString()} <span className="text-xs text-emerald-400 font-semibold">({winner.percentage}%)</span>
            </p>
          </div>
          <div>
            <p className="text-text-muted">Winning Margin</p>
            <p className="text-base font-bold text-text mt-0.5">
              +{winningMargin.toLocaleString()} <span className="text-xs text-indigo-400">({((winningMargin / (totalVotes || 1)) * 100).toFixed(1)}%)</span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderStatusBadge = (status) => {
    const current = status || electionStatus;
    if (current === "active") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
          Active
        </span>
      );
    }
    if (current === "upcoming") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Upcoming
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
        Completed
      </span>
    );
  };

  if (loading && !results.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface/20 border border-border rounded-2xl">
        <FaSpinner className="text-4xl text-indigo-500 animate-spin mb-3" />
        <p className="text-text-muted text-sm">Aggregating ballot responses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <FaChartBar className="text-indigo-500" /> Election Campaign Auditing
          </h2>
          <p className="text-text-muted text-sm">Compare campaign outcomes, graph standings in real-time, and download audit sheets</p>
        </div>
        
        <div className="w-full sm:w-64">
          <select
            value={selectedElection}
            onChange={handleElectionChange}
            className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text focus:border-indigo-500 transition-all text-sm cursor-pointer"
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
        <div className="text-center py-16 bg-surface/20 border border-red-500/20 rounded-2xl">
          <FaExclamationTriangle className="text-5xl text-red-500 mx-auto mb-3" />
          <h3 className="text-text font-bold text-base mb-1">Audit Failed</h3>
          <p className="text-text-muted text-sm mb-4">{error}</p>
          <button 
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all"
            onClick={() => fetchResults(selectedElection)}
          >
            Retry Audit Sync
          </button>
        </div>
      ) : selectedElection ? (
        <div className="space-y-6" ref={resultsRef}>
          {/* Top Info Strip */}
          {electionDetails && (
            <div className="bg-surface/20 border border-border rounded-2xl p-5 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-text font-bold text-lg">{electionDetails.title}</h3>
                <p className="text-text-muted text-xs mt-0.5">{electionDetails.description}</p>
              </div>
              <div className="flex items-center gap-3">
                {renderStatusBadge()}
                {electionStatus === "active" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                    LIVE COUNT
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="bg-surface/20 border border-border rounded-2xl p-4 backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
                <input
                  type="text"
                  placeholder="Filter contenders..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="pl-9 pr-4 py-2 rounded-xl bg-surface/60 border border-border/50 text-text placeholder-slate-400 text-xs focus:border-indigo-500 transition-all w-48"
                />
              </div>

              <div className="flex items-center gap-2">
                <FaFilter className="text-text-muted text-[10px]" />
                <select
                  value={sortOrder}
                  onChange={(e) => handleSortOrderChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-surface border border-border/50 text-text text-xs cursor-pointer"
                >
                  <option value="votes">Rank Standings</option>
                  <option value="name">Contender Name</option>
                </select>
              </div>
            </div>

            {/* Toggle Graph representation */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-surface/20 p-1 rounded-xl">
                <button
                  className={`p-2 rounded-lg text-xs transition-all ${chartType === "bar" ? "bg-indigo-600 text-white shadow" : "text-text-muted hover:text-text"}`}
                  onClick={() => handleChartTypeChange("bar")}
                  title="Bar chart stands"
                >
                  <FaChartBar />
                </button>
                <button
                  className={`p-2 rounded-lg text-xs transition-all ${chartType === "pie" ? "bg-indigo-600 text-white shadow" : "text-text-muted hover:text-text"}`}
                  onClick={() => handleChartTypeChange("pie")}
                  title="Pie chart stands"
                >
                  <FaChartPie />
                </button>
                <button
                  className={`p-2 rounded-lg text-xs transition-all ${chartType === "turnout" ? "bg-indigo-600 text-white shadow" : "text-text-muted hover:text-text"}`}
                  onClick={() => handleChartTypeChange("turnout")}
                  title="Voter Turnout pie"
                >
                  <FaUserFriends />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={exportToPDF}
                  className="px-3 py-1.5 rounded-xl bg-surface/20 border border-border text-text text-xs hover:bg-surface/40 transition-all font-semibold"
                >
                  PDF Report
                </button>
                <button 
                  onClick={exportToImage}
                  className="px-3 py-1.5 rounded-xl bg-surface/20 border border-border text-text text-xs hover:bg-surface/40 transition-all font-semibold"
                >
                  Save Image
                </button>
                <button 
                  onClick={exportToCSV}
                  className="px-3 py-1.5 rounded-xl bg-surface/20 border border-border text-text text-xs hover:bg-surface/40 transition-all font-semibold"
                >
                  Save Table (CSV)
                </button>
              </div>
            </div>
          </div>

          {/* Graphical standings vs Details table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Graphic container */}
              <div ref={chartRef} className="bg-surface/20 border border-border rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-text font-bold text-sm mb-4">Graphic Standings Representation</h3>
                {chartType === "bar" ? renderBarChart(filteredResults) : chartType === "pie" ? renderPieChart(filteredResults) : renderTurnoutChart()}
              </div>

              {/* Detailed results logs */}
              <div className="bg-surface/20 border border-border rounded-2xl p-6 backdrop-blur-xl overflow-hidden">
                <h3 className="text-text font-bold text-sm mb-4">Ballot Audit Table</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface/10 font-semibold text-text-muted">
                        <th className="p-3">Standing Rank</th>
                        <th className="p-3">Contender Name</th>
                        <th className="p-3 text-right">Votes Audited</th>
                        <th className="p-3 text-right">Percentage Log</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 text-text-muted">
                      {filteredResults.map((result, idx) => (
                        <tr key={idx} className={idx === 0 ? "bg-amber-500/5 text-amber-300" : "hover:bg-surface/10"}>
                          <td className="p-3 font-bold">#{idx + 1} {idx === 0 && "🏆"}</td>
                          <td className="p-3 font-semibold">{result.candidate_name}</td>
                          <td className="p-3 text-right font-mono font-semibold">{result.votes.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold">{result.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface/10 font-bold text-text border-t border-border">
                        <td colSpan="2" className="p-3">Total Auditor Log</td>
                        <td className="p-3 text-right font-mono text-indigo-400">
                          {filteredResults.reduce((sum, r) => sum + r.votes, 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-400">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar stats logs */}
            <div className="space-y-6">
              {renderWinner()}

              {/* Quick stats indicators */}
              <div className="bg-surface/20 border border-border rounded-2xl p-5 backdrop-blur-xl space-y-4">
                <h3 className="text-text font-bold text-sm border-b border-border/50 pb-2">Auditor Index Summary</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-muted">Total Ballot Contenders</span>
                    <span className="text-text font-bold">{results.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-muted">Total Valid Votes</span>
                    <span className="text-text font-bold">{results.reduce((sum, r) => sum + r.votes, 0).toLocaleString()}</span>
                  </div>
                  {electionDetails && (
                    <>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-text-muted">Eligible Registered Voters</span>
                        <span className="text-text font-bold">{electionDetails.eligible_voters || "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-text-muted">Participation Turnout Rate</span>
                        <span className="text-emerald-400 font-bold">
                          {electionDetails.eligible_voters 
                            ? `${((results.reduce((sum, r) => sum + r.votes, 0) / electionDetails.eligible_voters) * 100).toFixed(1)}%` 
                            : "N/A"}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-muted">Real-time Sync Pulse</span>
                    <span className="text-text-muted font-bold uppercase">{electionStatus}</span>
                  </div>
                </div>
              </div>

              {/* Live sync details */}
              {electionStatus === "active" && (
                <div className="bg-surface/40 border border-border/50 rounded-2xl p-5 space-y-3">
                  <h3 className="text-text font-bold text-xs">Auto Sync Updates</h3>
                  <p className="text-text-muted text-xs leading-relaxed">The campaign is actively open. The database results are refreshed and validated every 8 seconds via active socket connections.</p>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="live-toggle-checkbox"
                      checked={liveUpdate}
                      onChange={toggleLiveUpdate}
                      className="cursor-pointer"
                    />
                    <label htmlFor="live-toggle-checkbox" className="text-xs text-text-muted font-semibold cursor-pointer select-none">
                      Enable Real-time Polling
                    </label>
                  </div>
                  {lastUpdated && (
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Last synced: {lastUpdated.toLocaleTimeString()}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-2xl">
          <FaInfoCircle className="text-4xl text-slate-500 mb-2" />
          <p className="text-text-muted text-sm">Please select a campaign from the dropdown selector to generate audited counts</p>
        </div>
      )}
    </div>
  );
};

export default Results;
