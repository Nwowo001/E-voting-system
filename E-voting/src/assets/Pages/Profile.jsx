import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./Profile.css";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../Context/UserContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaIdCard, 
  FaVoteYea, 
  FaHistory, 
  FaLock, 
  FaCamera, 
  FaArrowLeft, 
  FaEdit, 
  FaSave, 
  FaTimes, 
  FaEye, 
  FaEyeSlash 
} from "react-icons/fa";

const API_URL = "http://localhost:5000/api";

const Profile = () => {
  const navigate = useNavigate();
  const userContext = useUserContext();
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [votingHistory, setVotingHistory] = useState([]);
  const [votingHistoryLoading, setVotingHistoryLoading] = useState(false);
  const [securityInfo, setSecurityInfo] = useState({
    lastLogin: "N/A",
    loginAttempts: 0,
    accountCreated: "N/A",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editedUser, setEditedUser] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
  });
  
  // Use a ref to prevent unnecessary re-renders of the image
  const imageUrlRef = useRef(null);

  useEffect(() => {
    fetchUserData();
    if (activeTab === "voting-history") {
      fetchVotingHistory();
    }
    if (activeTab === "security") {
      fetchSecurityInfo();
    }
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/auth/me`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = response.data;
      setUser(userData);
      setEditedUser({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        bio: userData.bio || "",
      });
      
      // Handle profile image URL - only update if it's different
      if (userData.profileImage) {
        const imageUrl = userData.profileImage;
        const fullImageUrl = imageUrl.startsWith('http') ? 
          imageUrl : 
          `${API_URL}/${imageUrl.replace(/^\//, '')}`;
        
        // Only update if the image URL has changed
        if (imageUrlRef.current !== fullImageUrl) {
          imageUrlRef.current = fullImageUrl;
          setProfileImage(fullImageUrl);
        }
      } else if (!profileImage) {
        setProfileImage("/default-avatar.png");
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to load profile data:", error);
      toast.error("Failed to load profile data");
      setLoading(false);
    }
  };

  const fetchVotingHistory = async () => {
    setVotingHistoryLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/votes/user`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Get election details for each vote
      const votesWithDetails = await Promise.all(
        response.data.map(async (vote) => {
          try {
            const electionResponse = await axios.get(
              `${API_URL}/elections/${vote.electionid}`,
              {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            
            const candidateResponse = await axios.get(
              `${API_URL}/candidates/${vote.candidateid}`,
              {
                withCredentials: true,
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            
            return {
              ...vote,
              electionTitle: electionResponse.data.title,
              candidateName: candidateResponse.data.name,
              candidateParty: candidateResponse.data.party,
            };
          } catch (error) {
            return {
              ...vote,
              electionTitle: "Unknown Election",
              candidateName: "Unknown Candidate",
              candidateParty: "Unknown Party",
            };
          }
        })
      );
      
      setVotingHistory(votesWithDetails);
    } catch (error) {
      console.error("Failed to load voting history:", error);
      toast.error("Failed to load voting history");
    } finally {
      setVotingHistoryLoading(false);
    }
  };

  const fetchSecurityInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/auth/security-info`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSecurityInfo({
        lastLogin: new Date(response.data.lastLogin).toLocaleString() || "N/A",
        loginAttempts: response.data.loginAttempts || 0,
        accountCreated: new Date(response.data.created_at).toLocaleDateString() || "N/A",
      });
    } catch (error) {
      console.error("Failed to load security info:", error);
      // Use fallback data from user object if available
      if (user) {
        setSecurityInfo({
          lastLogin: "N/A",
          loginAttempts: 0,
          accountCreated: user.created_at 
            ? new Date(user.created_at).toLocaleDateString() 
            : "N/A",
        });
      }
    }
  };

  // Function to update both context and localStorage
  const updateUserData = (updatedData) => {
    // Update localStorage
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const newUserData = { ...storedUser, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUserData));
      
      // Update context if setUser is available
      if (userContext && typeof userContext.setUser === 'function') {
        userContext.setUser(newUserData);
      }
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5000000) {
        toast.error("File size should be less than 5MB");
        return;
      }

      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);

      try {
        setUploadLoading(true);
        const formData = new FormData();
        formData.append("profileImage", file);

        const token = localStorage.getItem("token");
        const response = await axios.post(
          `${API_URL}/users/upload-profile-image`,
          formData,
          {
            withCredentials: true,
            headers: { 
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`
            },
          }
        );

        // Make sure we're using the full URL path
        const imageUrl = response.data.imageUrl;
        const fullImageUrl = imageUrl.startsWith('http') ? 
          imageUrl : 
          `${API_URL}/${imageUrl.replace(/^\//, '')}`;
        
        // Update ref to prevent re-renders
        imageUrlRef.current = fullImageUrl;
        setProfileImage(fullImageUrl);
        
        // Update user data in both context and localStorage
        updateUserData({ profileImage: fullImageUrl });
        
        toast.success("Profile image updated successfully");
        
        // Refresh user data to ensure we have the latest
        await fetchUserData();
      } catch (error) {
        console.error("Image upload error:", error);
        toast.error("Failed to upload profile image");
      } finally {
        setUploadLoading(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSaveChanges = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/users/update-profile`,
        editedUser,
        {
          withCredentials: true,
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
        }
      );

      // Get the updated user data from response
      const updatedUserData = response.data;
      
      // Update local state
      setUser((prevUser) => ({
        ...prevUser,
        ...updatedUserData
      }));
      
      // Update user data in both context and localStorage
      updateUserData(updatedUserData);
      
      setIsEditing(false);
      toast.success("Profile updated successfully");
      
      // Refresh user data to ensure we have the latest
      await fetchUserData();
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    
    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/auth/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          withCredentials: true,
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
        }
      );
      
      toast.success("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Current password is incorrect");
      } else {
        toast.error("Failed to change password");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="profile-header">
        <button onClick={() => navigate("/dashboard")} className="back-button">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <h2>Profile Settings</h2>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <FaUser /> Profile
        </button>
        <button 
          className={`tab-button ${activeTab === "voting-history" ? "active" : ""}`}
          onClick={() => setActiveTab("voting-history")}
        >
          <FaHistory /> Voting History
        </button>
        <button 
          className={`tab-button ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <FaLock /> Security
        </button>
      </div>

      <div className="profile-content">
        {activeTab === "profile" && (
          <div className="profile-card">
            <div className="profile-image-section">
              <div className="image-container">
                {uploadLoading && (
                  <div className="upload-overlay">
                    <div className="spinner small"></div>
                  </div>
                )}
                <img
                  src={previewImage || profileImage || "/default-avatar.png"}
                  alt="Profile"
                  className="profile-image"
                  onError={(e) => {
                    e.target.src = "/default-avatar.png";
                    e.target.onerror = null; // Prevent infinite error loop
                  }}
                  key={profileImage} // Add key to force re-render when image changes
                />
                <label htmlFor="profileImage" className="camera-icon">
                  <FaCamera />
                </label>
              </div>
              <input
                type="file"
                id="profileImage"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label htmlFor="profileImage" className="change-photo-btn">
                Change Photo
              </label>
              <div className="user-role">
                <span className="role-badge">{user.role}</span>
              </div>
            </div>

            <div className="profile-info">
              {isEditing ? (
                                <div className="edit-form">
                                <div className="form-group">
                                  <label><FaUser /> Full Name</label>
                                  <input
                                    type="text"
                                    name="name"
                                    value={editedUser.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                  />
                                </div>
                                <div className="form-group">
                                  <label><FaEnvelope /> Email</label>
                                  <input
                                    type="email"
                                    name="email"
                                    value={editedUser.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter your email"
                                  />
                                </div>
                                <div className="form-group">
                                  <label><FaPhone /> Phone Number</label>
                                  <input
                                    type="text"
                                    name="phone"
                                    value={editedUser.phone || ""}
                                    onChange={handleInputChange}
                                    placeholder="Enter your phone number"
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Bio</label>
                                  <textarea
                                    name="bio"
                                    value={editedUser.bio || ""}
                                    onChange={handleInputChange}
                                    placeholder="Tell us about yourself"
                                    rows="4"
                                  ></textarea>
                                </div>
                                <div className="button-group">
                                  <button onClick={handleSaveChanges} className="save-btn">
                                    <FaSave /> Save Changes
                                  </button>
                                  <button
                                    onClick={() => setIsEditing(false)}
                                    className="cancel-btn"
                                  >
                                    <FaTimes /> Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="info-display">
                                <div className="info-group">
                                  <label><FaUser /> Full Name</label>
                                  <p>{user.name}</p>
                                </div>
                                <div className="info-group">
                                  <label><FaEnvelope /> Email</label>
                                  <p>{user.email}</p>
                                </div>
                                <div className="info-group">
                                  <label><FaIdCard /> Voter ID</label>
                                  <p>{user.voterid}</p>
                                </div>
                                <div className="info-group">
                                  <label><FaPhone /> Phone Number</label>
                                  <p>{user.phone || "Not provided"}</p>
                                </div>
                                {user.bio && (
                                  <div className="info-group">
                                    <label>Bio</label>
                                    <p className="user-bio">{user.bio}</p>
                                  </div>
                                )}
                                <button onClick={() => setIsEditing(true)} className="edit-btn">
                                  <FaEdit /> Edit Profile
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
              
                      {activeTab === "voting-history" && (
                        <div className="voting-history-card">
                          <h3><FaVoteYea /> Your Voting History</h3>
                          
                          {votingHistoryLoading ? (
                            <div className="loading-spinner centered">
                              <div className="spinner small"></div>
                              <p>Loading voting history...</p>
                            </div>
                          ) : votingHistory.length > 0 ? (
                            <div className="voting-history-list">
                              {votingHistory.map((vote, index) => (
                                <div key={index} className="vote-record">
                                  <div className="vote-header">
                                    <h4>{vote.electionTitle}</h4>
                                    <span className="vote-date">
                                      {new Date(vote.votetimestamp).toLocaleDateString()} at {new Date(vote.votetimestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div className="vote-details">
                                    <div className="vote-info">
                                      <span className="label">Candidate:</span>
                                      <span className="value">{vote.candidateName}</span>
                                    </div>
                                    <div className="vote-info">
                                      <span className="label">Party:</span>
                                      <span className="value">{vote.candidateParty}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="empty-state">
                              <p>You haven't participated in any elections yet.</p>
                              <button onClick={() => navigate("/dashboard")} className="action-btn">
                                View Available Elections
                              </button>
                            </div>
                          )}
                        </div>
                      )}
              
                      {activeTab === "security" && (
                        <div className="security-card">
                          <h3><FaLock /> Security Settings</h3>
                          
                          <div className="security-info">
                            <div className="info-group">
                              <label>Account Created</label>
                              <p>{securityInfo.accountCreated}</p>
                            </div>
                            <div className="info-group">
                              <label>Last Login</label>
                              <p>{securityInfo.lastLogin}</p>
                            </div>
                            <div className="info-group">
                              <label>Login Attempts</label>
                              <p>{securityInfo.loginAttempts}</p>
                            </div>
                          </div>
                          
                          <div className="security-actions">
                            <h4>Password Management</h4>
                            {!showPasswordForm ? (
                              <button 
                                onClick={() => setShowPasswordForm(true)} 
                                className="change-password-btn"
                              >
                                Change Password
                              </button>
                            ) : (
                              <form onSubmit={handleChangePassword} className="password-form">
                                <div className="form-group">
                                  <label>Current Password</label>
                                  <div className="password-input-container">
                                    <input
                                      type={showPassword.current ? "text" : "password"}
                                      name="currentPassword"
                                      value={passwordData.currentPassword}
                                      onChange={handlePasswordChange}
                                      required
                                    />
                                    <button 
                                      type="button" 
                                      className="toggle-password"
                                      onClick={() => togglePasswordVisibility('current')}
                                    >
                                      {showPassword.current ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="form-group">
                                  <label>New Password</label>
                                  <div className="password-input-container">
                                    <input
                                      type={showPassword.new ? "text" : "password"}
                                      name="newPassword"
                                      value={passwordData.newPassword}
                                      onChange={handlePasswordChange}
                                      required
                                    />
                                    <button 
                                      type="button" 
                                      className="toggle-password"
                                      onClick={() => togglePasswordVisibility('new')}
                                    >
                                      {showPassword.new ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="form-group">
                                  <label>Confirm New Password</label>
                                  <div className="password-input-container">
                                    <input
                                      type={showPassword.confirm ? "text" : "password"}
                                      name="confirmPassword"
                                      value={passwordData.confirmPassword}
                                      onChange={handlePasswordChange}
                                      required
                                    />
                                    <button 
                                      type="button" 
                                      className="toggle-password"
                                      onClick={() => togglePasswordVisibility('confirm')}
                                    >
                                      {showPassword.confirm ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="password-requirements">
                                  <p>Password must:</p>
                                  <ul>
                                    <li className={passwordData.newPassword.length >= 6 ? "met" : ""}>
                                      Be at least 6 characters long
                                    </li>
                                    <li className={/[A-Za-z]/.test(passwordData.newPassword) && /[0-9]/.test(passwordData.newPassword) ? "met" : ""}>
                                      Include both letters and numbers
                                    </li>
                                    <li className={passwordData.newPassword === passwordData.confirmPassword && passwordData.newPassword !== "" ? "met" : ""}>
                                      Passwords match
                                    </li>
                                  </ul>
                                </div>
                                
                                <div className="button-group">
                                  <button 
                                    type="submit" 
                                    className="save-btn"
                                    disabled={passwordLoading}
                                  >
                                    {passwordLoading ? (
                                      <>
                                        <div className="spinner-small"></div> Changing...
                                      </>
                                    ) : (
                                      <>
                                        <FaSave /> Update Password
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowPasswordForm(false);
                                      setPasswordData({
                                        currentPassword: "",
                                        newPassword: "",
                                        confirmPassword: "",
                                      });
                                    }}
                                    className="cancel-btn"
                                  >
                                    <FaTimes /> Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                            
                            <div className="security-tips">
                              <h4>Security Tips</h4>
                              <ul>
                                <li>Use a strong, unique password for your voting account</li>
                                <li>Never share your login credentials with anyone</li>
                                <li>Log out when using shared computers</li>
                                <li>Update your password regularly</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              };
              
              export default Profile;
              