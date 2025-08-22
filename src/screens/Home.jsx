import React, { useEffect, useState } from "react";
import { auth, login, logout, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

export default function Home() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ attempts: 0, avgScore: 0, avgAccuracy: 0 });

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const qs = await getDocs(collection(db, "results", user.uid, "attempts"));
      let totalScore = 0, totalAcc = 0, count = 0;
      qs.forEach(doc => {
        const d = doc.data();
        totalScore += d.score || 0;
        totalAcc += d.accuracy || 0;
        count++;
      });
      if (count > 0) {
        setStats({
          attempts: count,
          avgScore: Math.round(totalScore / count),
          avgAccuracy: Math.round(totalAcc / count)
        });
      }
    })();
  }, [user]);

  return (
    <div className="screen home">
      {!user ? (
        <button className="primary" onClick={login}>
          Sign in with Google
        </button>
      ) : (
        <>
          <h2>Hi, {user.displayName || user.email} 👋</h2>
          <div className="stats">
            <div className="card">Attempts: {stats.attempts}</div>
            <div className="card">Avg Score: {stats.avgScore}</div>
            <div className="card">Accuracy: {stats.avgAccuracy}%</div>
          </div>
          <Link to="/tests" className="btn primary">Start Test</Link>
          <button onClick={logout} className="btn">Logout</button>
        </>
      )}
    </div>
  );
      }
