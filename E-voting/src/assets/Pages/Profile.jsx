import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Profile.css";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "../../Context/UserContext";
import { toast } from "react-toastify";

const API_URL = "http://localhost:5000/api";

const Profile = () => {
  const navigate = useNavigate();
  const { user: contextUser, updateUser } = useUserContext();
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        withCredentials: true,
      });
      const userData = response.data;
      setUser(userData);
      setEditedUser(userData);
      setProfileImage(userData.profileImage || "/default-avatar.png");
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load profile data");
      setLoading(false);
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

        const response = await axios.post(
          `${API_URL}/users/upload-profile-image`,
          formData,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        setProfileImage(response.data.imageUrl);
        toast.success("Profile image updated successfully");
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

  const handleSaveChanges = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/users/update-profile`,
        editedUser,
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      setUser(response.data);
      updateUser(response.data);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
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
      <div className="profile-header">
        <button onClick={() => navigate("/dashboard")} className="back-button">
          ← Back to Dashboard
        </button>
        <h2>Profile Settings</h2>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-image-section">
            <img
              src={previewImage || profileImage}
              alt="Profile"
              className="profile-image"
            />
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
          </div>

          <div className="profile-info">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editedUser.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editedUser.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="button-group">
                  <button onClick={handleSaveChanges} className="save-btn">
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="info-display">
                <div className="info-group">
                  <label>Name</label>
                  <p>{user.name}</p>
                </div>
                <div className="info-group">
                  <label>Email</label>
                  <p>{user.email}</p>
                </div>
                <div className="info-group">
                  <label>Role</label>
                  <p className="role-badge">{user.role}</p>
                </div>
                <button onClick={() => setIsEditing(true)} className="edit-btn">
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
