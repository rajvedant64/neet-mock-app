import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Link } from "react-router-dom";

export default function History() {
  const [uid, setUid] = useState(null);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUid(u.uid);
      }
    });
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const qs = await getDocs(collection(db, "results", uid, "attempts"));
      const list = [];
      qs.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAttempts(list);
    })();
  }, [uid]);

  return (
    <div className="screen history">
      <h2>Past Attempts</h2>
      {attempts.length === 0 && <p>No attempts yet.</p>}
      {attempts.map((a) => (
        <div key={a.id} className="attempt-card">
          <div>
            <b>{a.testId}</b> • {new Date(a.date).toLocaleString()}
          </div>
          <div>
            Score: {a.score} | Accuracy: {a.accuracy}%
          </div>
          <Link to={`/review/${a.testId}/${a.id}`} className="btn">
            Review
          </Link>
        </div>
      ))}
    </div>
  );
}
