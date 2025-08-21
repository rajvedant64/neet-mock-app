import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./screens/Home";
import Tests from "./screens/Tests";
import Exam from "./screens/Exam";
import Review from "./screens/Review";
import History from "./screens/History";
import Settings from "./screens/Settings";
import Admin from "./screens/Admin";
import "./styles.css";

function NavBar() {
  const location = useLocation();
  return (
    <nav className="bottom">
      <Link to="/" className={location.pathname === "/" ? "active" : ""}>🏠 Home</Link>
      <Link to="/tests" className={location.pathname.startsWith("/tests") ? "active" : ""}>📝 Tests</Link>
      <Link to="/history" className={location.pathname.startsWith("/history") ? "active" : ""}>📊 History</Link>
      <Link to="/settings" className={location.pathname.startsWith("/settings") ? "active" : ""}>⚙️ Settings</Link>
      <Link to="/admin" className={location.pathname.startsWith("/admin") ? "active" : ""}>🔑 Admin</Link>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tests" element={<Tests />} />
          <Route path="/exam/:testId" element={<Exam />} />
          <Route path="/review/:testId/:attemptId" element={<Review />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <NavBar />
      </div>
    </Router>
  );
}
