import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUserContext } from "../../Context/UserContext";
import {
  FaVoteYea,
  FaSun,
  FaMoon,
  FaLock,
  FaEnvelope,
  FaUser,
  FaIdCard,
  FaSpinner,
  FaArrowLeft,
  FaKey,
} from "react-icons/fa";
import { API_URL as BASE_API_URL } from "../../config";

const API_URL = BASE_API_URL + "/users";

const getPasswordStrength = (pass) => {
  if (!pass) return { score: 0, label: "", color: "bg-slate-500/20", progress: "w-0" };
  let score = 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 10) score++;
  if (/[a-z]/.test(pass)) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/\d/.test(pass)) score++;
  if (/[^a-zA-Z\d]/.test(pass)) score++;

  let strengthScore = Math.min(4, Math.floor(score / 1.5));
  if (pass.length < 6) strengthScore = 0;

  const levels = [
    { score: 0, label: "Very Weak (Min. 6 chars with letters & numbers)", color: "text-red-400 bg-red-500/10 border-red-500/25", progress: "w-[15%] bg-red-500" },
    { score: 1, label: "Weak (Need both letters & numbers)", color: "text-orange-400 bg-orange-500/10 border-orange-500/25", progress: "w-[35%] bg-orange-500" },
    { score: 2, label: "Fair", color: "text-amber-400 bg-amber-500/10 border-amber-500/25", progress: "w-[60%] bg-amber-500" },
    { score: 3, label: "Good", color: "text-blue-400 bg-blue-500/10 border-blue-500/25", progress: "w-[80%] bg-blue-500" },
    { score: 4, label: "Strong & Secure 💪", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", progress: "w-full bg-emerald-500" },
  ];

  const hasLetter = /[a-zA-Z]/.test(pass);
  const hasNumber = /\d/.test(pass);
  let label = levels[strengthScore].label;
  if (pass.length >= 6 && (!hasLetter || !hasNumber)) {
    label = "Invalid (Must contain letters AND numbers)";
    return { score: 1, label, color: "text-red-400 bg-red-500/10 border-red-500/25", progress: "w-[30%] bg-red-500" };
  }

  return { ...levels[strengthScore], label };
};

const Login = () => {
  const { setUser, theme, toggleTheme } = useUserContext();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  // Verification states
  const [verificationStep, setVerificationStep] = useState("form"); // 'form', 'verify_registration', 'forgot_password', 'reset_password'
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    surname: "",
    firstName: "",
    otherName: "",
    matric_number: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [matricVerified, setMatricVerified] = useState(false);
  const [verifyingMatric, setVerifyingMatric] = useState(false);
  const [forgotForm, setForgotForm] = useState({ email: "" });
  const [resetForm, setResetForm] = useState({
    code: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleLoginChange = (e) =>
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  const handleSignupChange = (e) =>
    setSignupForm({ ...signupForm, [e.target.name]: e.target.value });
  const handleForgotChange = (e) =>
    setForgotForm({ ...forgotForm, [e.target.name]: e.target.value });
  const handleResetChange = (e) =>
    setResetForm({ ...resetForm, [e.target.name]: e.target.value });

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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.identifier || !loginForm.password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(
        `${API_URL}/login`,
        {
          identifier: loginForm.identifier,
          password: loginForm.password,
        },
        { withCredentials: true },
      );
      const { user, token } = response.data;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
      setUser(user);
      navigate(user.role === "admin" ? "/admin-dashboard" : "/dashboard");
    } catch (err) {
      if (
        err.response?.status === 403 &&
        err.response?.data?.requiresVerification
      ) {
        // Redirect to OTP verification for unverified account
        setVerificationEmail(err.response.data.email);
        setVerificationStep("verify_registration");
        setError("Please verify your email before logging in.");
        startResendTimer();
      } else {
        setError(
          err.response?.data?.message ||
            "Login failed. Please check your credentials.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Validates matric number: 6-15 alphanumeric chars containing at least one letter
  // Covers all real formats: 22N02001, 22N02005TS, ACU20252567, SP20220055, etc.
  const isValidMatric = (matric) => {
    const upper = matric.trim().toUpperCase();
    return /^[A-Z0-9]{6,15}$/.test(upper) && /[A-Z]/.test(upper);
  };

  // Calls /verify-matric and auto-fills name fields
  const handleVerifyMatric = async () => {
    if (!signupForm.matric_number) {
      setError("Please enter your matric number first.");
      return;
    }
    if (!isValidMatric(signupForm.matric_number)) {
      setError("Invalid matric number format.");
      return;
    }
    setVerifyingMatric(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/verify-matric`, {
        matric_number: signupForm.matric_number,
      });
      const { surname, firstName, otherName } = res.data;
      setSignupForm((prev) => ({
        ...prev,
        surname: surname || "",
        firstName: firstName || "",
        otherName: otherName || "",
      }));
      setMatricVerified(true);
      setSuccess("Matric number verified! Your name has been filled in below.");
    } catch (err) {
      setMatricVerified(false);
      setError(
        err.response?.data?.message ||
          "Matric number not found. Only eligible students can register."
      );
    } finally {
      setVerifyingMatric(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!matricVerified) {
      setError("Please verify your matric number first.");
      return;
    }
    if (!signupForm.surname || !signupForm.firstName) {
      setError("Surname and First Name are required.");
      return;
    }
    if (!signupForm.matric_number || !signupForm.email || !signupForm.password) {
      setError("Matric Number, Email, and Password are required.");
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (signupForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    const fullName = [signupForm.surname, signupForm.firstName, signupForm.otherName]
      .filter(Boolean)
      .join(" ");
    try {
      const response = await axios.post(
        `${API_URL}/sign-up`,
        {
          name: fullName,
          matric_number: signupForm.matric_number,
          email: signupForm.email,
          password: signupForm.password,
        },
        { withCredentials: true },
      );

      setSuccess(response.data.message);
      setVerificationEmail(signupForm.email);
      setVerificationStep("verify_registration");
      setSignupForm({
        surname: "",
        firstName: "",
        otherName: "",
        matric_number: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setMatricVerified(false);
      startResendTimer();
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(
        `${API_URL}/verify-registration`,
        {
          email: verificationEmail,
          code: otpCode,
        },
        { withCredentials: true },
      );

      const { user, token } = response.data;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
      setUser(user);
      setSuccess("Account verified successfully! Logging you in...");
      setTimeout(() => {
        navigate(user.role === "admin" ? "/admin-dashboard" : "/dashboard");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Verification failed. Incorrect or expired code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e) => {
    e.preventDefault();
    if (!forgotForm.email) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API_URL}/forgot-password`, {
        email: forgotForm.email,
      });
      setVerificationEmail(forgotForm.email);
      setSuccess("A verification code has been sent to your email.");
      setVerificationStep("reset_password");
      startResendTimer();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to request code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (
      !resetForm.code ||
      !resetForm.newPassword ||
      !resetForm.confirmPassword
    ) {
      setError("All fields are required");
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API_URL}/reset-password`, {
        email: verificationEmail,
        code: resetForm.code,
        newPassword: resetForm.newPassword,
      });
      setSuccess("Password updated successfully! You can now log in.");
      setVerificationStep("form");
      setIsLogin(true);
      setResetForm({ code: "", newPassword: "", confirmPassword: "" });
      setLoginForm({ identifier: verificationEmail, password: "" });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Reset failed. Invalid code or password format.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (otpType) => {
    if (resendTimer > 0) return;
    try {
      await axios.post(`${API_URL}/resend-otp`, {
        email: verificationEmail,
        type: otpType,
      });
      setSuccess("A new verification code has been sent to your email.");
      startResendTimer();
    } catch (err) {
      setError("Failed to resend code. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Floating Theme Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-surface/30 border border-border text-text hover:bg-surface hover:text-primary transition-all duration-200 flex items-center justify-center cursor-pointer z-20"
        aria-label="Toggle Theme"
      >
        {theme === "light" ? (
          <FaMoon className="text-sm" />
        ) : (
          <FaSun className="text-sm" />
        )}
      </button>

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-4 shadow-lg shadow-indigo-500/30">
            <FaVoteYea className="text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-text mb-1">AcuVote</h1>
          <p className="text-text-muted text-sm">
            Secure, transparent, democratic
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-surface/20 border border-border rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-300">
          {/* Error / Success Alerts */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-xs">
              <span className="text-base shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-xs">
              <span className="text-base shrink-0">🎉</span>
              <span>{success}</span>
            </div>
          )}

          {/* Verification Flows */}
          {verificationStep === "verify_registration" && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-text mb-1">
                  Email Verification
                </h2>
                <p className="text-text-muted text-xs">
                  We sent a 6-digit verification code to{" "}
                  <span className="text-text font-bold">
                    {verificationEmail}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                  Verification Code
                </label>
                <div className="relative">
                  <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface/50 border border-border text-text placeholder-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none font-mono text-center tracking-[4px]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 shadow"
              >
                {loading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  "Verify & Log In"
                )}
              </button>

              <div className="text-center pt-2 text-xs">
                {resendTimer > 0 ? (
                  <p className="text-text-muted">
                    Resend code in {resendTimer}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleResendCode("registration")}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setVerificationStep("form")}
                className="w-full flex items-center justify-center gap-2 text-text-muted hover:text-text text-xs pt-4"
              >
                <FaArrowLeft /> Back to Log In
              </button>
            </form>
          )}

          {verificationStep === "forgot_password" && (
            <form onSubmit={handleRequestPasswordReset} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-text mb-1">
                  Reset Password
                </h2>
                <p className="text-text-muted text-xs">
                  Enter your registered email below to receive a password reset
                  code.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                  <input
                    type="email"
                    name="email"
                    value={forgotForm.email}
                    onChange={handleForgotChange}
                    placeholder="e.g. john@university.edu"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface/50 border border-border text-text placeholder-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 shadow"
              >
                {loading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  "Send Reset Code"
                )}
              </button>

              <button
                type="button"
                onClick={() => setVerificationStep("form")}
                className="w-full flex items-center justify-center gap-2 text-text-muted hover:text-text text-xs pt-2"
              >
                <FaArrowLeft /> Cancel & Go Back
              </button>
            </form>
          )}

          {verificationStep === "reset_password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-text mb-1">
                  Set New Password
                </h2>
                <p className="text-text-muted text-xs">
                  A code was sent to your email. Enter it below along with your
                  new password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                  Verification Code
                </label>
                <div className="relative">
                  <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                  <input
                    type="text"
                    name="code"
                    maxLength={6}
                    value={resetForm.code}
                    onChange={handleResetChange}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface/50 border border-border text-text placeholder-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none font-mono text-center tracking-[4px]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                  <input
                    type="password"
                    name="newPassword"
                    value={resetForm.newPassword}
                    onChange={handleResetChange}
                    placeholder="Min. 6 chars with letter/number"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface/50 border border-border text-text placeholder-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={resetForm.confirmPassword}
                    onChange={handleResetChange}
                    placeholder="Confirm new password"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface/50 border border-border text-text placeholder-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 shadow"
              >
                {loading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  "Update Password"
                )}
              </button>

              <div className="text-center pt-2 text-xs">
                {resendTimer > 0 ? (
                  <p className="text-text-muted">
                    Resend code in {resendTimer}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleResendCode("password_reset")}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Resend Reset Code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setVerificationStep("forgot_password")}
                className="w-full flex items-center justify-center gap-2 text-text-muted hover:text-text text-xs pt-2"
              >
                <FaArrowLeft /> Back to Request Reset
              </button>
            </form>
          )}

          {/* Standard Login / Signup Forms */}
          {verificationStep === "form" && (
            <>
              {/* Tab Switcher */}
              <div className="flex bg-surface-2/30 rounded-xl p-1 mb-6 border border-border">
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setError("");
                    setSuccess("");
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isLogin
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setError("");
                    setSuccess("");
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                    !isLogin
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Student Sign Up
                </button>
              </div>

              {isLogin ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                      Matric Number / Staff ID / Email
                    </label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                      <input
                        type="text"
                        name="identifier"
                        value={loginForm.identifier}
                        onChange={handleLoginChange}
                        placeholder="Enter your identifier"
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface/50 border border-border text-text placeholder-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setVerificationStep("forgot_password")}
                        className="text-primary hover:underline text-xs font-semibold cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        placeholder="Enter your password"
                        className="w-full pl-11 pr-12 py-3 rounded-xl bg-surface/50 border border-border text-text placeholder-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors duration-150 cursor-pointer"
                      >
                        {showPassword ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* ── Matric Number + Verify Button ── */}
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                      Matric Number
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                        <input
                          type="text"
                          name="matric_number"
                          value={signupForm.matric_number}
                          onChange={(e) => {
                            setSignupForm({ ...signupForm, matric_number: e.target.value.toUpperCase(), surname: "", firstName: "", otherName: "" });
                            setMatricVerified(false);
                            setSuccess("");
                          }}
                          placeholder="e.g. 22N02001 or ACU20251815"
                          className={`w-full pl-11 pr-4 py-3 rounded-xl bg-surface/50 border text-text placeholder-text-muted/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none font-mono tracking-wider ${
                            matricVerified
                              ? "border-emerald-500/60 focus:border-emerald-500"
                              : "border-border focus:border-primary"
                          }`}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        id="verify-matric-btn"
                        onClick={handleVerifyMatric}
                        disabled={verifyingMatric || matricVerified}
                        className={`shrink-0 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                          matricVerified
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        }`}
                      >
                        {verifyingMatric ? (
                          <><FaSpinner className="animate-spin" /> Checking...</>
                        ) : matricVerified ? (
                          <>✓ Verified</>
                        ) : (
                          "Verify"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ── Name Fields — shown after verification ── */}
                  {matricVerified && (
                    <div className="space-y-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 animate-pulse-once">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        ✓ Identity confirmed from student records
                      </p>
                      {/* Surname */}
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">Surname</label>
                        <div className="relative">
                          <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/70 text-sm" />
                          <input
                            type="text"
                            value={signupForm.surname}
                            readOnly
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 text-text text-sm outline-none cursor-not-allowed font-semibold"
                          />
                        </div>
                      </div>
                      {/* First Name */}
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">First Name</label>
                        <div className="relative">
                          <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/70 text-sm" />
                          <input
                            type="text"
                            value={signupForm.firstName}
                            readOnly
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 text-text text-sm outline-none cursor-not-allowed"
                          />
                        </div>
                      </div>
                      {/* Other Name */}
                      {signupForm.otherName && (
                        <div>
                          <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">Other Name</label>
                          <div className="relative">
                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/70 text-sm" />
                            <input
                              type="text"
                              value={signupForm.otherName}
                              readOnly
                              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/25 text-text text-sm outline-none cursor-not-allowed"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                      <input
                        type="email"
                        name="email"
                        value={signupForm.email}
                        onChange={handleSignupChange}
                        placeholder="e.g. john@university.edu"
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface/50 border border-border text-text placeholder-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                      <input
                        type={showSignupPassword ? "text" : "password"}
                        name="password"
                        value={signupForm.password}
                        onChange={handleSignupChange}
                        placeholder="Min. 6 characters with letter/number"
                        className="w-full pl-11 pr-12 py-3 rounded-xl bg-surface/50 border border-border text-text placeholder-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors duration-150 cursor-pointer"
                      >
                        {showSignupPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {signupForm.password && (
                      <div className="mt-2 space-y-1.5">
                        <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 ${getPasswordStrength(signupForm.password).progress}`} />
                        </div>
                        <p className={`text-[10px] font-bold border rounded-lg px-2 py-0.5 w-fit ${getPasswordStrength(signupForm.password).color}`}>
                          Password Strength: {getPasswordStrength(signupForm.password).label}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
                      <input
                        type={showSignupConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={signupForm.confirmPassword}
                        onChange={handleSignupChange}
                        placeholder="Re-enter password"
                        className="w-full pl-11 pr-12 py-3 rounded-xl bg-surface/50 border border-border text-text placeholder-text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors duration-150 cursor-pointer"
                      >
                        {showSignupConfirmPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-amber-400 text-[10px] leading-relaxed">
                    <span className="text-xs">⚠️</span>
                    <span>
                      Staff members are added by the administrator. Only
                      students can self-register here. Verification code will be
                      sent to your email.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p className="text-center text-text-muted text-xs mt-6">
          AcuVote System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;
