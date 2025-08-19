import React, { useMemo, useState, useEffect } from 'react'
import { parseQuestionsFromText, parseAnswerKeyFromText, subjectOf } from './parser.js'

const DEFAULT_DURATION_MIN = 200

function useLocal(key, initial){
  const [state, set] = useState(() => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : initial }
    catch { return initial }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)) }, [key, state])
  return [state, set]
}

function readFileAsText(file){
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(String(fr.result))
    fr.onerror = rej
    fr.readAsText(file)
  })
}

function secondsToHMS(sec){
  const h = Math.floor(sec/3600).toString().padStart(2,'0')
  const m = Math.floor((sec%3600)/60).toString().padStart(2,'0')
  const s = Math.floor(sec%60).toString().padStart(2,'0')
  return `${h}:${m}:${s}`
}

export default function App(){
  const [paperText, setPaperText] = useLocal('paperText', '')
  const [answerText, setAnswerText] = useLocal('answerText', '')
  const [duration, setDuration] = useLocal('duration', DEFAULT_DURATION_MIN)
  const [negative, setNegative] = useLocal('negative', 1)
  const [state, setState] = useLocal('state', { started:false, current:1, answers:{}, flagged:{}, startAt:0 })
  const [score, setScore] = useState(null)
  const [showReview, setShowReview] = useState(false)

  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!state.started) return
    const tick = () => {
      const endAt = state.startAt + duration*60*1000
      const now = Date.now()
      const left = Math.max(0, Math.floor((endAt - now)/1000))
      setRemaining(left)
      if (left<=0) handleSubmit()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [state.started, state.startAt, duration])

  const questions = useMemo(() => parseQuestionsFromText(paperText || ''), [paperText])
  const answerKey = useMemo(() => parseAnswerKeyFromText(answerText || ''), [answerText])

  const total = 180
  const currentQ = state.current
  const current = useMemo(() => questions.find(q => q.number===currentQ) || { number: currentQ, stem:'', options:['','','',''] }, [questions, currentQ])

  function goto(n){
    if (n<1) n=1
    if (n>total) n=total
    setState(s => ({...s, current:n}))
  }

  async function onUploadBoth(e){
    const file = e.target.files?.[0]
    if (!file) return
    const text = await readFileAsText(file)
    setPaperText(text)
    const key = parseAnswerKeyFromText(text)
    if (Object.keys(key).length) setAnswerText(text)
  }

  async function onUploadPaper(e){
    const file = e.target.files?.[0]
    if (!file) return
    const text = await readFileAsText(file)
    setPaperText(text)
  }

  async function onUploadAnswers(e){
    const file = e.target.files?.[0]
    if (!file) return
    const text = await readFileAsText(file)
    setAnswerText(text)
    }

function startTest(){
    if (!questions.length) { alert('Please paste or upload the question paper first.'); return; }
    setState({ started:true, current:1, answers:{}, flagged:{}, startAt: Date.now() })
    setScore(null)
    setShowReview(false)
  }

  function markAnswer(n){
    setState(s => ({...s, answers:{...s.answers, [currentQ]: n}}))
  }

  function toggleFlag(){
    setState(s => ({...s, flagged:{...s.flagged, [currentQ]: !s.flagged[currentQ]}}))
  }

  function handleSubmit(){
    let correct=0, wrong=0, unattempted=0
    for (let i=1;i<=total;i++){
      const user = state.answers[i] ?? 0
      const ans = answerKey[i] ?? 0
      if (!user) { unattempted++; continue; }
      if (user===ans) correct++
      else wrong++
    }
    const totalMarks = correct*4 - wrong*negative
    setScore({correct, wrong, unattempted, totalMarks})
    setShowReview(true)
    setState(s => ({...s, started:false}))
  }

  function exportCSV(){
    const rows = [["Q","Subject","Marked","Correct"]]
    for (let i=1;i<=total;i++){
      rows.push([
        i,
        subjectOf(i),
        state.answers[i] ?? '',
        answerKey[i] ?? ''
      ])
    }
    const csv = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], {type:"text/csv"})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'neet-mock-results.csv'
    a.click()
  }

  return (
    <div className="container">
      <div className="topbar">
        <div><span className="badge">NEET PWA</span></div>
        <div className="small">Install: Menu → Add to Home screen</div>
      </div>

      <div className="card row" style={{gap:16}}>
        <h2>Upload or Paste Paper & Answer Key</h2>
        <div className="grid-2">
          <div>
            <label className="small">Upload single file (questions + answers together):</label>
            <input type="file" accept=".txt" onChange={onUploadBoth}/>
          </div>
          <div>
            <label className="small">OR upload separately:</label>
            <div className="row">
              <input type="file" accept=".txt" onChange={onUploadPaper}/>
              <input type="file" accept=".txt" onChange={onUploadAnswers}/>
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div>
            <label className="small">Or paste questions (plain text from your PDF):</label>
            <textarea placeholder="Paste the 180 questions here..." value={paperText} onChange={e=>setPaperText(e.target.value)} />
          </div>
          <div>
            <label className="small">Or paste answer key (format: 1 3 / 1:3 / 1) 3):</label>
            <textarea placeholder="1 3\n2 2\n3 1\n..." value={answerText} onChange={e=>setAnswerText(e.target.value)} />
          </div>
        </div>

        <div className="grid-3">
          <div>
            <label className="small">Exam duration (minutes)</label>
            <input className="input" type="number" min="10" max="300" value={duration} onChange={e=>setDuration(parseInt(e.target.value||'0',10))}/>
          </div>
          <div>
            <label className="small">Negative marks per wrong</label>
            <input className="input" type="number" min="0" max="4" step="0.25" value={negative} onChange={e=>setNegative(parseFloat(e.target.value||'0'))}/>
          </div>
          <div style={{display:'flex', alignItems:'end', gap:8}}>
            <button className="btn" onClick={startTest}>Start Test</button>
            <button className="btn ghost" onClick={()=>{setPaperText('');setAnswerText('')}}>Clear</button>
          </div>
        </div>
      </div>

      <div className="row" style={{marginTop:16}}>
        <div className="card">
          <div className="topbar">
            <div>Q{current.number} <span className="small">({subjectOf(current.number)})</span></div>
            <div className="small">Timer: <span className="kbd">{secondsToHMS(remaining)}</span></div>
          </div>
          <div className="question">
            <div style={{whiteSpace:'pre-wrap'}}>{current.stem || '—'}</div>
            <div className="options">
              {[1,2,3,4].map(n => (
                <div key={n}
                     className={'option '+(state.answers[current.number]===n?'selected':'')}
                     onClick={()=>markAnswer(n)}>
                  <b>{n}.</b> {current.options[n-1] || ''}
                </div>
              ))}
            </div>
            <div style={{display:'flex', gap:8, marginTop:10}}>
              <button className="btn secondary" onClick={()=>goto(current.number-1)}>Prev</button>
              <button className="btn secondary" onClick={()=>goto(current.number+1)}>Next</button>
              <button className="btn ghost" onClick={toggleFlag}>{state.flagged[current.number]?'Unflag':'Flag'}</button>
              <button className="btn" onClick={handleSubmit}>Submit</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="subject-tabs">
            {['Physics','Chemistry','Botany','Zoology'].map(sub => {
              const range = sub==='Physics'?[1,45]:sub==='Chemistry'?[46,90]:sub==='Botany'?[91,135]:[136,180]
              return (
                <div key={sub} className={'tab '+(current.number>=range[0]&&current.number<=range[1]?'active':'')}
                     onClick={()=>goto(range[0])}>
                  {sub} <span className="small">({range[0]}–{range[1]})</span>
                </div>
              )
            })}
          </div>
          <div className="progress" style={{marginTop:10}}><div style={{width: (Object.keys(state.answers).length/180*100)+'%'}}/></div>
          <div className="small" style={{marginTop:8}}>Answered: {Object.keys(state.answers).length}/180 • Flagged: {Object.values(state.flagged).filter(Boolean).length}</div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(10, 1fr)', gap:6, marginTop:12}}>
            {Array.from({length:180}, (_,i)=>i+1).map(n => {
              const a = state.answers[n]; const f = state.flagged[n];
              return (
                <button key={n} className="btn ghost" style={{padding:'8px 0', borderColor:a?'#22d3ee':'#334155', background: f?'#1d3b4d':'transparent'}}
                        onClick={()=>goto(n)}>
                  {n}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {showReview && score && (
        <div className="card" style={{marginTop:16}}>
          <h3>Result</h3>
          <div className="row grid-3">
            <div>Correct: <b>{score.correct}</b></div>
            <div>Wrong: <b>{score.wrong}</b></div>
            <div>Unattempted: <b>{score.unattempted}</b></div>
          </div>
          <p>Total Marks (4 for correct, -{negative} for wrong): <b>{score.totalMarks}</b></p>
          <button className="btn" onClick={exportCSV}>Export CSV</button>
        </div>
      )}

      <div className="footer">Made for you — offline-ready PWA. Tip: Upload .txt exported from your PDF for best parsing.</div>
    </div>
  )
                    }
