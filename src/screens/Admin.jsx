import React, { useEffect, useState } from "react";
import { auth, db, login } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// pdf.js setup
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const ADMIN_EMAILS = ["rajvedant64@gmail.com"]; // 🔹 change to your admin email

export default function Admin() {
  const [user, setUser] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [title, setTitle] = useState("NEET Full Mock 1");
  const [testId, setTestId] = useState("mock-1");
  const [duration, setDuration] = useState(200);
  const [negative, setNegative] = useState(1);
  const [answerText, setAnswerText] = useState(""); // e.g. lines: "1 3", "2 2", ...
  const [log, setLog] = useState([]);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  function parseAnswerKey(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const map = {};
    for (const ln of lines) {
      const m = ln.match(/^(\d+)\D*([1-4])$/);
      if (m) {
        map[parseInt(m[1], 10)] = parseInt(m[2], 10);
      }
    }
    return map;
  }

  async function handleCreate() {
    if (!isAdmin) {
      alert("Not admin");
      return;
    }
    if (!pdfFile) {
      alert("Upload PDF");
      return;
    }

    const buf = await pdfFile.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buf).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    const ak = parseAnswerKey(answerText);

    await setDoc(doc(db, "tests", testId), {
      title,
      durationMin: duration,
      negative,
      pdfBase64: base64, // 🔹 store PDF directly in Firestore
      answerKey: ak,
      createdBy: user.email,
      createdAt: new Date().toISOString(),
    });

    setLog((l) => [...l, "✅ Test created successfully"]);
  }

  return (
    <div className="screen admin">
      <h2>Admin • Create Test</h2>

      {!user && (
        <button className="primary" onClick={login}>
          Sign in with Google
        </button>
      )}
      {user && <p>Signed in as {user.email}</p>}
      {!isAdmin && user && (
        <div className="warn">⚠️ Not an admin. Ask the admin to add your email.</div>
      )}

      {isAdmin && (
        <div className="card">
          <label>Test ID</label>
          <input
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            placeholder="mock-1"
          />
          <label>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="NEET Full Mock 1"
          />
          <div className="row">
            <div>
              <label>Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
              />
            </div>
            <div>
              <label>Negative per wrong</label>
              <input
                type="number"
                step="0.25"
                value={negative}
                onChange={(e) => setNegative(+e.target.value)}
              />
            </div>
          </div>
          <label>Upload Questions PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          />
          <label>Answer Key (lines like "1 3")</label>
          <textarea
            rows="8"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="1 3\n2 2\n3 1\n..."
          />
          <button className="primary" onClick={handleCreate}>
            Create Test
          </button>
        </div>
      )}

      <div className="log">
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
