import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  FaCheck,
  FaArrowLeft,
  FaVoteYea,
  FaUsers,
  FaSpinner,
} from "react-icons/fa";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { useUserContext } from "../../../Context/UserContext";
import { API_URL, SOCKET_URL, BACKEND_URL } from "../../../config";

const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ["polling", "websocket"],
});

const ElectionCandidates = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserContext();

  useEffect(() => {
    if (user && user.role === "candidate") {
      navigate("/dashboard");
    }
  }, [user, navigate]);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const toggleSelectCandidate = (candidate) => {
    const pos = candidate.position || "General";
    setSelectedCandidates((prev) => {
      const next = { ...prev };
      if (next[pos] === candidate.candidateid) {
        delete next[pos];
      } else {
        next[pos] = candidate.candidateid;
      }
      return next;
    });
  };

  // Voting Verification OTP states
  const [verificationStep, setVerificationStep] = useState("confirm"); // 'confirm' or 'otp'
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [receiptId] = useState(
    () => `ACU-${Math.floor(100000 + Math.random() * 900000)}`,
  );

  useEffect(() => {
    fetchCandidates();

    socket.on("connect_error", () =>
      setError("Connection issue. Please refresh."),
    );
    socket.on("vote_recorded", () => fetchCandidates());

    return () => {
      socket.off("vote_recorded");
      socket.off("connect_error");
    };
  }, []);

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const fetchCandidates = async () => {
    try {
      const res = await axios.get(`${API_URL}/candidates/${electionId}`);
      setCandidates(res.data);
    } catch {
      setError("Failed to load candidates.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVoteOTP = async () => {
    setVoting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/voters/request-otp`,
        { electionid: parseInt(electionId) },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setVerificationStep("otp");
      startResendTimer();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to request voting verification code.",
      );
      setConfirming(false);
    } finally {
      setVoting(false);
    }
  };

  const handleVote = async (e) => {
    if (e) e.preventDefault();
    const candidateIdsArray = Object.values(selectedCandidates);
    if (candidateIdsArray.length === 0) return;
    if (!otpCode || otpCode.length < 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }
    setVoting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/voters/votes`,
        {
          candidateids: candidateIdsArray,
          electionid: parseInt(electionId),
          otp: otpCode,
        },
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      socket.emit("vote_cast", {
        electionId: parseInt(electionId),
        candidateIds: candidateIdsArray,
      });
      setSuccessMessage("Your vote has been cast successfully! 🎉");
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to cast vote. Please try again.",
      );
      setVerificationStep("confirm");
      setConfirming(false);
    } finally {
      setVoting(false);
    }
  };

  const downloadPDFReceipt = () => {
    const receiptElement = document.getElementById("receipt-card");
    if (!receiptElement) return;

    // Temporarily hide buttons for receipt image generation
    const actionButtons = document.getElementById("receipt-actions");
    if (actionButtons) actionButtons.style.display = "none";

    html2canvas(receiptElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#1e293b", // Force dark styled card background for receipt PDF
    })
      .then((canvas) => {
        if (actionButtons) actionButtons.style.display = "flex";

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a5");
        const imgWidth = 128;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
        pdf.save(`AcuVote_Receipt_${receiptId}.pdf`);
      })
      .catch((err) => {
        if (actionButtons) actionButtons.style.display = "flex";
        console.error("PDF download failed", err);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4 transition-colors duration-300">
        <div
          id="receipt-card"
          className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-scale-up"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-5">
            <FaCheck className="text-emerald-400 text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Vote Cast!</h2>
          <p className="text-text-muted text-xs mb-6">{successMessage}</p>

          <div className="bg-surface-2/40 border border-border/50 rounded-2xl p-5 text-left text-xs space-y-3 mb-6 font-medium">
            <p className="text-indigo-400 font-bold uppercase tracking-wider text-[10px] border-b border-border/40 pb-1.5">
              Official Digital Ballot Receipt
            </p>
            <div className="flex justify-between">
              <span className="text-text-muted">Receipt ID:</span>
              <span className="font-mono text-text font-bold">{receiptId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Election ID:</span>
              <span className="font-mono text-text">#{electionId}</span>
            </div>
            <div className="space-y-1.5 border-t border-b border-border/30 py-2.5 my-1 text-left">
              <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px]">
                Candidates Voted:
              </span>
              {Object.entries(selectedCandidates).map(([pos, cid]) => {
                const cand = candidates.find((c) => c.candidateid === cid);
                return (
                  <div key={pos} className="flex justify-between text-[11px] font-medium">
                    <span className="text-text-muted">{pos}:</span>
                    <span className="text-text font-bold">{cand?.name}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <span className="text-text-muted">Timestamp:</span>
              <span className="text-text-muted">
                {new Date().toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border/40 text-[10px] text-emerald-400 font-semibold">
              <span>Security State:</span>
              <span>CRYPTOGRAPHICALLY SECURED</span>
            </div>
          </div>

          <div id="receipt-actions" className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={downloadPDFReceipt}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-xs shadow-md transition-all hover:from-indigo-500 hover:to-violet-500 cursor-pointer"
            >
              Download PDF Receipt
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 py-3 rounded-xl bg-surface-2/30 border border-border text-text hover:bg-surface-2 transition-all font-semibold text-xs cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-300">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface/20 border border-border text-text-muted hover:text-text hover:bg-surface/40 transition-all text-sm cursor-pointer"
          >
            <FaArrowLeft /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-text">Cast Your Vote</h1>
            <p className="text-text-muted text-sm font-medium">
              Select a candidate below — your choice is private and secure
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <span className="text-lg">⚠️</span> {error}
          </div>
        )}

        {/* Privacy notice */}
        <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center gap-3">
          <div className="text-indigo-400 text-xl shrink-0">🔒</div>
          <div>
            <p className="text-indigo-300 text-sm font-bold">
              Your vote is anonymous
            </p>
            <p className="text-indigo-400/80 text-xs mt-0.5">
              Only the total count is recorded. Your individual choice is never
              linked to your identity.
            </p>
          </div>
        </div>

        {/* Candidates grid */}
        {candidates.length === 0 ? (
          <div className="text-center py-20 bg-surface/10 border border-border rounded-2xl">
            <FaUsers className="text-5xl text-text-muted mx-auto mb-4" />
            <p className="text-text-muted">
              No candidates have been added for this election.
            </p>
          </div>
        ) : (
          <div className="space-y-10 mb-28">
            {Object.entries(
              candidates.reduce((acc, candidate) => {
                const pos = candidate.position || "General";
                if (!acc[pos]) acc[pos] = [];
                acc[pos].push(candidate);
                return acc;
              }, {})
            ).map(([position, posCandidates]) => (
              <div key={position} className="space-y-4">
                <h2 className="text-base font-bold text-indigo-400 border-b border-border/30 pb-2 flex items-center gap-2">
                  🎯 {position}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {posCandidates.map((candidate, index) => {
                    const isSelected = selectedCandidates[candidate.position || "General"] === candidate.candidateid;
                    return (
                      <button
                        key={candidate.candidateid}
                        onClick={() => toggleSelectCandidate(candidate)}
                        className={`relative group text-left rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-600/15 shadow-lg shadow-indigo-500/20 scale-[1.02]"
                            : "border-border/50 bg-surface/20 hover:border-border hover:bg-surface/35"
                        }`}
                      >
                        {/* Selected checkmark */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center z-10 shadow-lg">
                            <FaCheck className="text-white text-xs" />
                          </div>
                        )}

                        {/* Candidate number badge */}
                        <div className="absolute top-3 left-3 z-10">
                          <span className="px-2 py-0.5 rounded-lg bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Candidate image */}
                        <div className="aspect-[4/3] bg-gradient-to-br from-indigo-500/20 to-violet-500/20 relative overflow-hidden">
                          <img
                            src={
                              candidate.image_url?.startsWith("http")
                                ? candidate.image_url
                                : `${BACKEND_URL}${candidate.image_url?.startsWith("/") ? "" : "/"}${candidate.image_url}`
                            }
                            alt={candidate.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-opacity duration-500"
                            style={{ opacity: 0 }}
                            onLoad={(e) => {
                              e.target.style.opacity = 1;
                              const spinner =
                                e.target.parentNode.querySelector(".image-spinner");
                              if (spinner) spinner.style.display = "none";
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                              const spinner =
                                e.target.parentNode.querySelector(".image-spinner");
                              if (spinner) spinner.style.display = "none";
                              const fallback =
                                e.target.parentNode.querySelector(".fallback-avatar");
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                          <div className="image-spinner absolute inset-0 flex items-center justify-center bg-surface/20">
                            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                          <div className="fallback-avatar hidden absolute inset-0 items-center justify-center text-6xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10">
                            👤
                          </div>

                          {/* Party banner overlay at bottom of image */}
                          {candidate.party && (
                             <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                               <span className="text-white text-xs font-bold truncate block">
                                 🏛️ {candidate.party}
                               </span>
                             </div>
                          )}
                        </div>

                        {/* Candidate info */}
                        <div className="p-4 space-y-2">
                          <h3 className="text-text font-bold text-sm leading-tight truncate">
                            {candidate.name}
                          </h3>

                          {candidate.party && (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[10px] font-semibold truncate max-w-full">
                                {candidate.party}
                              </span>
                            </div>
                          )}

                          {(candidate.biography || candidate.manifesto) && (
                            <p className="text-text-muted text-[11px] leading-relaxed line-clamp-2 pt-0.5 border-t border-border/40">
                              {candidate.biography || candidate.manifesto}
                            </p>
                          )}

                          {/* Vote indicator */}
                          <div
                            className={`mt-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                              isSelected
                                ? "text-indigo-400"
                                : "text-text-muted/50"
                            }`}
                          >
                            {isSelected
                              ? "✓ Selected"
                              : "Tap to select"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation panel */}
        {Object.keys(selectedCandidates).length > 0 && !confirming && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20 animate-slide-in">
            <div className="bg-surface/95 backdrop-blur-xl border border-indigo-500/35 rounded-2xl p-4 shadow-2xl shadow-indigo-500/20">
              <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto pr-1 text-left">
                <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider mb-1 border-b border-border/20 pb-1">
                  Your Selected Ballot
                </p>
                {Object.entries(selectedCandidates).map(([pos, cid]) => {
                  const candObj = candidates.find((c) => c.candidateid === cid);
                  return (
                    <div key={pos} className="flex justify-between items-center text-xs py-0.5">
                      <span className="text-text-muted font-medium">{pos}:</span>
                      <span className="text-text font-bold truncate max-w-[200px]">{candObj?.name}</span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setVerificationStep("confirm");
                  setConfirming(true);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
              >
                Confirm My Vote ({Object.keys(selectedCandidates).length} selected)
              </button>
            </div>
          </div>
        )}

        {/* Final confirmation & OTP modal */}
        {confirming && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-scale-up">
              {verificationStep === "confirm" ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center mx-auto mb-4">
                    <FaVoteYea className="text-amber-400 text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-text mb-2">
                    Confirm Your Ballot
                  </h3>
                  
                  <div className="space-y-1.5 mb-4 max-h-36 overflow-y-auto text-left bg-surface-2/40 p-3 border border-border/50 rounded-xl">
                    <p className="text-text-muted text-[9px] uppercase font-bold tracking-wider mb-1 border-b border-border/30 pb-0.5">
                      Ballot selections
                    </p>
                    {Object.entries(selectedCandidates).map(([pos, cid]) => {
                      const candObj = candidates.find((c) => c.candidateid === cid);
                      return (
                        <div key={pos} className="flex justify-between items-center text-xs">
                          <span className="text-text-muted">{pos}:</span>
                          <span className="text-text font-bold truncate max-w-[150px]">{candObj?.name}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] leading-relaxed text-left">
                    ⚠️ To prevent duplicate voting, a 6-digit verification code will be sent to your email to validate your ballot.
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={voting}
                      className="flex-1 py-3 rounded-xl bg-surface-2/30 border border-border text-text font-bold text-sm hover:bg-surface-2 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRequestVoteOTP}
                      disabled={voting}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
                    >
                      {voting ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        "Send Code"
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleVote} className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center mx-auto mb-4">
                    <span className="text-indigo-400 text-xl font-bold">
                      🔐
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-text">
                    Enter Voting Code
                  </h3>
                  <p className="text-text-muted text-xs">
                    A 6-digit verification code was sent to your email.
                  </p>

                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="000000"
                      className="w-full px-4 py-3 rounded-xl bg-surface-2/50 border border-border text-text font-mono text-center text-xl tracking-[6px] focus:border-indigo-500 transition-all outline-none"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationStep("confirm");
                        setOtpCode("");
                      }}
                      disabled={voting}
                      className="flex-1 py-3 rounded-xl bg-surface-2/30 border border-border text-text font-bold text-sm hover:bg-surface-2 transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={voting}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
                    >
                      {voting ? (
                        <>
                          <FaSpinner className="animate-spin" /> Casting...
                        </>
                      ) : (
                        "Cast Vote"
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-2 text-xs">
                    {resendTimer > 0 ? (
                      <p className="text-text-muted">
                        Resend code in {resendTimer}s
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestVoteOTP}
                        className="text-indigo-400 hover:underline font-bold cursor-pointer"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElectionCandidates;
