import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Review() {
  const { testId, attemptId } = useParams();
  const [test, setTest] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      const td = await getDoc(doc(db, "tests", testId));
      const rd = await getDoc(doc(db, "results", result?.uid || "unknown", "attempts", attemptId));
      if (td.exists()) setTest(td.data());
      if (rd.exists()) setResult(rd.data());
    })();
  }, [testId, attemptId]);

  if (!test || !result) return <div className="screen">Loading...</div>;

  return (
    <div className="screen review">
      <h2>{test.title} • Review</h2>

      <div className="summary">
        <p>Score: <b>{result.score}</b></p>
        <p>Accuracy: <b>{result.accuracy}%</b></p>
        <p>Correct: <b>{result.correct}</b></p>
        <p>Wrong: <b>{result.wrong}</b></p>
        <p>Unattempted: <b>{result.unattempted}</b></p>
      </div>

      <h3>Your Answers</h3>
      <div className="answers-list">
        {Object.entries(result.answers).map(([qNum, ans]) => {
          const correct = test.answerKey[qNum];
          return (
            <div key={qNum} className="answer-card">
              <span>Q{qNum}</span>
              <span>
                You: {ans || "—"} | Correct: {correct}
              </span>
              <span className={ans === correct ? "correct" : ans ? "wrong" : "na"}>
                {ans === correct ? "✅" : ans ? "❌" : "⚪"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
    }
