import React, { useEffect, useState } from "react";
import { auth, login, logout } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="screen settings">
      <h2>Settings</h2>

      {!user && <button onClick={login}>Sign in with Google</button>}
      {user && (
        <>
          <p>Signed in as: {user.displayName || user.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      )}

      <div className="card">
        <h3>Theme</h3>
        <button onClick={() => setTheme("light")} className={theme === "light" ? "active" : ""}>
          Light
        </button>
        <button onClick={() => setTheme("dark")} className={theme === "dark" ? "active" : ""}>
          Dark
        </button>
      </div>
    </div>
  );
}
