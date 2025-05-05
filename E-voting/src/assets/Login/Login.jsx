import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";
import { useUserContext } from "../../Context/UserContext";

const API_URL = "http://localhost:5000/api/users";

const Login = () => {
  const { setUser } = useUserContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    nin: "",
    voterID: "",
    voterid: "",
  });

  const [errors, setErrors] = useState({});
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!isLogin && !formData.name.trim()) newErrors.name = "Name is required.";
    if (!formData.email.trim()) newErrors.email = "Email is required.";
    if (!formData.password.trim()) newErrors.password = "Password is required.";
    if (!isLogin && !formData.nin.trim()) newErrors.nin = "NIN is required.";
    if (!isLogin && !formData.voterID.trim())
      newErrors.voterID = "Voter ID is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setLoading(true);
      const endpoint = isLogin ? "/login" : "/sign-up";
      const requestData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        nin: formData.nin,
        voterid: formData.voterID,
      };
      try {
        const response = await axios.post(
          `${API_URL}${endpoint}`,
          requestData,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!isLogin) {
          setIsLogin(true);
          setFormData({
            name: "",
            email: "",
            password: "",
            nin: "",
            voterID: "",
            voterid: "",
          });
          alert("Registration successful! Please login with your credentials.");
          return;
        }

        const { user, token } = response.data;
        
        // Debug the user data
        console.log("User data from login:", user);
        console.log("User role:", user.role);
        
        // Store user data and token in localStorage
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("token", token);
        
        // Clear welcome flag to show welcome message on next login
        localStorage.removeItem("welcomeShown");
        
        // Update context
        setUser(user);
        
        // Redirect based on role
        const redirectPath = user.role === "admin" ? "/admin-dashboard" : "/dashboard";
        navigate(redirectPath);
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          "An error occurred. Please try again.";
        setErrors({ server: errorMessage });
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      nin: "",
      voterID: "",
      voterid: "",
    });
    setErrors({});
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };
  
  return (
    <div className="signin-container">
      <div className="signin-form">
        <h1>{isLogin ? "Login" : "Sign Up"}</h1>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
              />
              <label htmlFor="nin">NIN</label>
              <input
                type="text"
                id="nin"
                name="nin"
                value={formData.nin || ""}
                onChange={handleChange}
              />
              <label htmlFor="voterID">Voter ID</label>
              <input
                type="text"
                id="voterID"
                name="voterID"
                value={formData.voterID || ""}
                onChange={handleChange}
              />
            </>
          )}
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email || ""}
            onChange={handleChange}
          />
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password || ""}
            onChange={handleChange}
          />
          {errors.server && <p className="error-message">{errors.server}</p>}
          {Object.keys(errors).length > 0 && !errors.server && (
            <div className="error-messages">
              {Object.values(errors).map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </div>
          )}
          <button type="submit" disabled={loading}>
            {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
          </button>
          <p>
            {isLogin ? (
              <span className="toggle-link" onClick={toggleMode}>
                Don't have an account? Sign Up
              </span>
            ) : (
              <span className="toggle-link" onClick={toggleMode}>
                Already have an account? Login
              </span>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
