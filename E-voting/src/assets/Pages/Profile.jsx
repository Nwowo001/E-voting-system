import { useEffect, useState, useRef } from "react";
import axios from "axios";
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
  FaEyeSlash,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
  
  const [participationHistory, setParticipationHistory] = useState([]);
  const [participationLoading, setParticipationLoading] = useState(false);
  
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
    display_name: "",
    phone: "",
    bio: "",
  });
  
  const imageUrlRef = useRef(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (activeTab === "voting-history") {
      fetchParticipation();
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
        display_name: userData.display_name || "",
        phone: userData.phone || "",
        bio: userData.bio || "",
      });
      
      if (userData.profile_image) {
        const imageUrl = userData.profile_image;
        const fullImageUrl = imageUrl.startsWith('http') ? 
          imageUrl : 
          `${API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        
        if (imageUrlRef.current !== fullImageUrl) {
          imageUrlRef.current = fullImageUrl;
          setProfileImage(fullImageUrl);
        }
      } else {
        setProfileImage(null);
      }
      
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load profile data");
      setLoading(false);
    }
  };

  const fetchParticipation = async () => {
    setParticipationLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/voters/participation`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      setParticipationHistory(response.data);
    } catch (error) {
      toast.error("Failed to load participation history");
    } finally {
      setParticipationLoading(false);
    }
  };

  const updateUserData = (updatedData) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const newUserData = { ...storedUser, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUserData));
      if (userContext && typeof userContext.setUser === 'function') {
        userContext.setUser(newUserData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5000000) {
        toast.error("File size should be less than 5MB");
        return;
      }

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

        const imageUrl = response.data.imageUrl;
        const fullImageUrl = imageUrl.startsWith('http') ? 
          imageUrl : 
          `${API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        
        imageUrlRef.current = fullImageUrl;
        setProfileImage(fullImageUrl);
        updateUserData({ profileImage: fullImageUrl });
        toast.success("Profile image updated successfully");
        fetchUserData();
      } catch (error) {
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
        {
          name: editedUser.name,
          email: editedUser.email,
          display_name: editedUser.display_name,
          phone: editedUser.phone,
          bio: editedUser.bio
        },
        {
          withCredentials: true,
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
        }
      );

      const updatedUserData = response.data;
      setUser((prevUser) => ({
        ...prevUser,
        ...updatedUserData
      }));
      updateUserData(updatedUserData);
      setIsEditing(false);
      toast.success("Profile updated successfully");
      fetchUserData();
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
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
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="text-4xl text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-text-muted">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(user.role === 'admin' ? '/admin-dashboard' : '/dashboard')}
            className="flex items-center justify-center p-2 rounded-lg bg-surface-2/40 border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-all cursor-pointer"
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text flex items-center gap-2">
              Profile Settings
            </h1>
            <p className="text-text-muted text-sm font-medium">Update your public details and manage account preferences</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-surface-2/30 border border-border p-1 rounded-xl w-fit">
          <button 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "profile" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25" : "text-text-muted hover:text-text"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            <FaUser /> Profile Details
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "voting-history" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25" : "text-text-muted hover:text-text"
            }`}
            onClick={() => setActiveTab("voting-history")}
          >
            <FaHistory /> Participation Ledger
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "security" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25" : "text-text-muted hover:text-text"
            }`}
            onClick={() => setActiveTab("security")}
          >
            <FaLock /> Security Settings
          </button>
        </div>

        {/* Contents */}
        <div className="bg-surface/20 border border-border rounded-2xl p-6 backdrop-blur-xl transition-all duration-300">
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Photo Area */}
              <div className="flex flex-col items-center space-y-4 md:border-r md:border-border/50 md:pr-8">
                <div className="relative group w-36 h-36 rounded-full overflow-hidden bg-surface border-2 border-border flex items-center justify-center">
                  {uploadLoading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                      <FaSpinner className="text-2xl text-indigo-400 animate-spin" />
                    </div>
                  )}
                  {previewImage || profileImage ? (
                    <img
                      src={previewImage || profileImage}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 items-center justify-center text-4xl bg-surface flex">
                    👤
                  </div>
                  
                  {/* Photo selector label */}
                  <label htmlFor="profileImageInput" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-all">
                    <FaCamera className="text-xl" />
                  </label>
                </div>
                
                <input
                  type="file"
                  id="profileImageInput"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                
                <div className="text-center">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                    {user.role} Privilege
                  </span>
                </div>
              </div>

              {/* Form Details Area */}
              <div className="md:col-span-2 space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={editedUser.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-primary transition-all outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Display Name</label>
                        <input
                          type="text"
                          name="display_name"
                          value={editedUser.display_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-primary transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={editedUser.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-primary transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Phone Number</label>
                        <input
                          type="text"
                          name="phone"
                          value={editedUser.phone}
                          onChange={handleInputChange}
                          placeholder="e.g. +2348012345678"
                          className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-primary transition-all outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">Bio / Department Notes</label>
                      <textarea
                        name="bio"
                        rows={3}
                        value={editedUser.bio}
                        onChange={handleInputChange}
                        placeholder="Write a brief bio..."
                        className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text text-sm focus:border-primary transition-all outline-none resize-none"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={handleSaveChanges}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm transition-all flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        <FaSave /> Save Changes
                      </button>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2.5 rounded-xl bg-surface-2/40 border border-border text-text hover:bg-surface-2 transition-all text-sm font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">Full Name</p>
                        <p className="text-text font-bold mt-1">{user.name}</p>
                      </div>
                      <div>
                        <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">Display Name</p>
                        <p className="text-text font-bold mt-1">{user.display_name || user.name}</p>
                      </div>
                      <div>
                        <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">Email Address</p>
                        <p className="text-text font-bold mt-1">{user.email || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">Phone Number</p>
                        <p className="text-text font-bold mt-1">{user.phone || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">Voter Serial ID</p>
                        <p className="text-text font-mono font-bold mt-1">#{user.id}</p>
                      </div>
                      <div>
                        <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">Matric No. / Staff ID</p>
                        <p className="text-text font-mono font-bold mt-1">{user.matric_number || user.staff_id || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">Bio / Department Notes</p>
                      <p className="text-text mt-1.5 italic bg-surface-2/20 border border-border/40 p-3.5 rounded-xl leading-relaxed">
                        {user.bio || "No bio added yet. Tell us a bit about yourself."}
                      </p>
                    </div>

                    <button 
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2.5 rounded-xl bg-surface-2/40 border border-border text-text hover:bg-surface-2 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FaEdit /> Modify Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "voting-history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="text-text font-bold text-base flex items-center gap-2">
                  <FaVoteYea className="text-indigo-400" /> Ledger Auditing
                </h3>
              </div>

              {participationLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <FaSpinner className="text-3xl text-indigo-500 animate-spin mb-2" />
                  <p className="text-text-muted text-xs">Querying participation ledger...</p>
                </div>
              ) : participationHistory.length > 0 ? (
                <div className="space-y-3">
                  {participationHistory.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface/20 p-4 rounded-xl border border-border/50 hover:border-border transition-all text-xs">
                      <div>
                        <p className="text-text font-semibold text-sm">{item.title}</p>
                        <p className="text-text-muted text-[10px] mt-0.5">
                          Timeline: {new Date(item.start_date + "T00:00:00").toLocaleDateString()} — {new Date(item.end_date + "T00:00:00").toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        {item.has_voted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            <FaCheckCircle /> Registered Voted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                            <FaTimesCircle /> Missed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaVoteYea className="text-4xl text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted text-sm">No ballot records synchronized yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="text-text font-bold text-base flex items-center gap-2">
                  <FaLock className="text-indigo-400" /> Account Security Controls
                </h3>
              </div>

              {/* Created Date */}
              {user.created_at && (
                <div className="text-xs bg-surface/40 border border-border/50 p-4 rounded-xl">
                  <p className="text-text-muted">Account Created Timestamp</p>
                  <p className="text-text font-bold mt-0.5">{new Date(user.created_at).toLocaleString()}</p>
                </div>
              )}

              {/* Password update form */}
              <div className="space-y-4">
                <h4 className="text-text font-bold text-sm">Update Account Credentials</h4>
                
                {!showPasswordForm ? (
                  <button 
                    onClick={() => setShowPasswordForm(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow"
                  >
                    Change Account Password
                  </button>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md animate-slide-in">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.current ? "text" : "password"}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-text text-xs focus:border-indigo-500 pr-10"
                          required
                        />
                        <button 
                          type="button" 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          {showPassword.current ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.new ? "text" : "password"}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-text text-xs focus:border-indigo-500 pr-10"
                          required
                        />
                        <button 
                          type="button" 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {showPassword.new ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.confirm ? "text" : "password"}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-text text-xs focus:border-indigo-500 pr-10"
                          required
                        />
                        <button 
                          type="button" 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {showPassword.confirm ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        type="submit" 
                        disabled={passwordLoading}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm transition-all flex items-center gap-1.5 shadow"
                      >
                        {passwordLoading ? <FaSpinner className="animate-spin" /> : "Update Password"}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                        }}
                        className="px-4 py-2 rounded-xl bg-surface/20 border border-border text-text hover:bg-surface/40 transition-all text-sm font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;