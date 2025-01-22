import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { UserProvider } from "./Context/UserContext"; // Make sure to import the UserProvider

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <UserProvider>
      {" "}
      {/* Wrap the App component with UserProvider */}
      <App />
    </UserProvider>
  </StrictMode>
);
