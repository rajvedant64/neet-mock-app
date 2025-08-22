import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// pdf.js
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function Exam() {
  const { testId } = useParams();
  const nav = useNavigate();
  const [test, setTest] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(0);
  const [uid, setUid] = useState(null);

  // Watch auth
  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
  }, []);

  // Load test
  useEffect(() => {
    (async () => {
      const td = await getDoc(doc(db, "tests", testId));
      if (!td.exists()) return;
      const t = td.data();
      setTest(t);
      setRemaining((t.durationMin || 200) * 60);

      // Load PDF from Base64
      const bin = Uint8Array.from(atob(t.pdfBase64), (c) => c.charCodeAt(0));
      const pdf = await pdfjsLib.getDocument({ data: bin }).promise;
      setPdfDoc(pdf);
    })();
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    if (!test) return;
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [test]);

  // Render current PDF page
  useEffect(() => {
    if (!pdfDoc) return;
    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.getElementById("pdf-canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
  }, [pdfDoc, pageNum]);

  function selectAnswer(n) {
    setAnswers((a) => ({ ...a, [pageNum]: n }));
  }

  async function submit() {
    if (!uid || !test) return;
    const total = pdfDoc.numPages;
    let correct = 0,
      wrong = 0,
      unattempted = 0;
    for (let i = 1; i <= total; i++) {
      const u = answers[i] || 0;
      const k = test.answerKey?.[i] || 0;
      if (!u) unattempted++;
      else if (u === k) correct++;
      else wrong++;
    }
    const score = correct * 4 - wrong * (test.negative || 1);
    const attempted = correct + wrong;
    const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;

    const docRef = await addDoc(collection(db, "results", uid, "attempts"), {
      testId,
      answers,
      score,
      accuracy,
      correct,
      wrong,
      unattempted,
      date: new Date().toISOString(),
    });

    nav(`/review/${testId}/${docRef.id}`);
  }

  return (
    <div className="screen exam">
      <div className="top">
        <div>{test?.title || "Exam"}</div>
        <div className="timer">
          {new Date(remaining * 1000).toISOString().substr(11, 8)}
        </div>
      </div>

      <canvas id="pdf-canvas" style={{ width: "100%", border: "1px solid #ddd" }} />

      <div className="options">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            className={"opt " + (answers[pageNum] === n ? "selected" : "")}
            onClick={() => selectAnswer(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="controls">
        <button onClick={() => setPageNum((p) => Math.max(1, p - 1))}>Prev</button>
        <button onClick={() => setPageNum((p) => Math.min(pdfDoc?.numPages || 1, p + 1))}>
          Next
        </button>
        <button className="primary" onClick={submit}>
          Submit
        </button>
      </div>
    </div>
  );
            }
