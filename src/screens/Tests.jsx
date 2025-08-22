import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

export default function Tests() {
  const [tests, setTests] = useState([]);

  useEffect(() => {
    (async () => {
      const qs = await getDocs(collection(db, "tests"));
      const list = [];
      qs.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTests(list);
    })();
  }, []);

  return (
    <div className="screen tests">
      <h2>Available Tests</h2>
      {tests.length === 0 && <p>No tests uploaded yet.</p>}
      {tests.map((t) => (
        <div key={t.id} className="test-card">
          <h3>{t.title}</h3>
          <p>Duration: {t.durationMin} min | Questions: {Object.keys(t.answerKey || {}).length}</p>
          <Link to={`/exam/${t.id}`} className="btn primary">Start</Link>
        </div>
      ))}
    </div>
  );
}
