import React, { useMemo, useState, useEffect } from 'react'
import { parseQuestionsFromText, parseAnswerKeyFromText, subjectOf } from './parser.js'

// ====== PDF.js setup (Vite-compatible worker) ======
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
// ===================================================

const TOTAL_Q = 180
const DEFAULT_DURATION_MIN = 200

// ---- small localStorage hook
function useLocal(key, initial){
  const [state, set] = useState(() => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : initial }
    catch { return initial }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)) }, [key, state])
  return [state, set]
}

// ---- utils
function readFileAsText(file){
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(String(fr.result))
    fr.onerror = rej
    fr.readAsText(file)
  })
}

async function readPdfAsText(file){
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++){
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map(it => ('str' in it ? it.str : '')).filter(Boolean)
    // Join with spaces, but add a newline periodically to help the parser
    fullText += strings.join(' ').replace(/\s{2,}/g,' ') + '\n\n'
  }
  return fullText
}

function secondsToHMS(sec){
  const h = Math.floor(sec/3600).toString().padStart(2,'0')
  const m = Math.floor((sec%3600)/60).toString().padStart(2,'0')
  const s = Math.floor(sec%60).toString().padStart(2,'0')
  return `${h}:${m}:${s}`
}

function shuffle(arr){
  const a = arr.slice()
  for(let i = a.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---- compute subject breakdown
function breakdown(answers, key){
  let sub = {
    Physics:{correct:0, wrong:0, unattempted:0},
    Chemistry:{correct:0, wrong:0, unattempted:0},
    Botany:{correct:0, wrong:0, unattempted:0},
    Zoology:{correct:0, wrong:0, unattempted:0},
  }
  for(let i=1;i<=TOTAL_Q;i++){
    const s = subjectOf(i)
    const u = answers[i] ?? 0
    const k = key[i] ?? 0
    if (!u) sub[s].unattempted++
    else if (u===k) sub[s].correct++
    else sub[s].wrong++
  }
  return sub
}

function marksFrom(corr, wrong, neg){
  return corr*4 - wrong*neg
}

// ---- THEMES
const THEMES = {
  dark: {
    '--bg':'#0b1220','--card':'#0f172a','--accent':'#0ea5e9','--text':'#e5e7eb','--muted':'#94a3b8'
  },
  light: {
    '--bg':'#f7fafc','--card':'#ffffff','--accent':'#0ea5e9','--text':'#0f172a','--muted':'#475569'
  }
}
const ACCENTS = {
  blue:'#0ea5e9', green:'#22c55e', purple:'#a855f7', orange:'#f59e0b', pink:'#ec4899'
}
function applyTheme(themeName, accentKey){
  const t = THEMES[themeName] || THEMES.dark
  const root = document.documentElement
  Object.entries(t).forEach(([k,v]) => root.style.setProperty(k,v))
  const accent = ACCENTS[accentKey] || ACCENTS.blue
  root.style.setProperty('--accent', accent)
}

// ---- MAIN APP
export default function App(){
  // persisted inputs
  const [paperText, setPaperText] = useLocal('paperText', '')
  const [answerText, setAnswerText] = useLocal('answerText', '')

  // settings
  const [duration, setDuration] = useLocal('duration', DEFAULT_DURATION_MIN)
  const [negative, setNegative] = useLocal('negative', 1)
  const [shuffleQuestions, setShuffleQuestions] = useLocal('shuffleQuestions', false)
  const [shuffleOptions, setShuffleOptions] = useLocal('shuffleOptions', false)

  // theme + profile
  const [theme, setTheme] = useLocal('theme', 'dark')
  const [accent, setAccent] = useLocal('accent', 'blue')
  const [profileName, setProfileName] = useLocal('profileName', '')
  const [profiles, setProfiles] = useLocal('profiles', {}) // { [name]: { attempts: Attempt[] } }

  // test state
  const [state, setState] = useLocal('state', {
    started:false,
    currentIndex:0,          // index within order[]
    answers:{},              // { [qnum]: 1..4 }
    flagged:{},              // { [qnum]: true }
    startAt:0,
    order: Array.from({length:TOTAL_Q}, (_,i)=>i+1),            // [qnums]
    optionOrder: {}          // { [qnum]: [0,1,2,3] } (indexes)
  })

  const [remaining, setRemaining] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [lastResult, setLastResult] = useState(null) // saved attempt summary

  useEffect(() => { applyTheme(theme, accent) }, [theme, accent])

  // timer
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

  // parsing
  const questionsRaw = useMemo(() => parseQuestionsFromText(paperText || ''), [paperText])
  const answerKeyRaw = useMemo(() => parseAnswerKeyFromText(answerText || ''), [answerText])

  // session-aware question (applies option shuffle)
  const order = state.order
  const currentQnum = order[state.currentIndex] || 1
  const baseQ = useMemo(() => {
    return questionsRaw.find(q => q.number===currentQnum) || { number: currentQnum, stem:'', options:['','','',''] }
  }, [questionsRaw, currentQnum])

  const currentOptionMap = state.optionOrder[currentQnum] || [0,1,2,3]
  const currentOptions = currentOptionMap.map(i => baseQ.options[i] || '')

  // answerKey with option shuffle applied (if any)
  const answerKey = useMemo(() => {
    // if shuffleOptions is true, we must remap correct option per qnum
    const map = {...answerKeyRaw}
    if (shuffleOptions){
      const remapped = {}
      for (let q=1;q<=TOTAL_Q;q++){
        const correct = map[q]
        const ord = state.optionOrder[q] || [0,1,2,3]
        // ord[newIndex] = oldIndex
        // find where oldIndex == (correct-1)
        const oldIdx = (correct ?? 0) - 1
        const newIndex = ord.findIndex(x => x===oldIdx)
        if (newIndex>=0) remapped[q] = newIndex+1
      }
      return remapped
    }
    return map
  }, [answerKeyRaw, shuffleOptions, state.optionOrder])

  // ======== uploads (TXT or PDF) ========
  async function ingestFileToText(file){
    if (!file) return ''
    const isPdf = file.type==='application/pdf' || /\.pdf$/i.test(file.name)
    try{
      return isPdf ? await readPdfAsText(file) : await readFileAsText(file)
    }catch(e){
      alert('Failed to read file: '+ e?.message)
      return ''
    }
  }

  async function onUploadBoth(e){
    const file = e.target.files?.[0]
    if (!file) return
    const text = await ingestFileToText(file)
    if (!text) return
    setPaperText(text)
    // if combined, attempt to extract answers too
    const key = parseAnswerKeyFromText(text)
    if (Object.keys(key).length) setAnswerText(text)
  }

  async function onUploadPaper(e){
    const file = e.target.files?.[0]
    if (!file) return
    const text = await ingestFileToText(file)
    if (text) setPaperText(text)
  }

  async function onUploadAnswers(e){
    const file = e.target.files?.[0]
    if (!file) return
    const text = await ingestFileToText(file)
    if (text) setAnswerText(text)
  }

  // ======== test flow ========
  function startTest(){
    if (!questionsRaw.length){
      alert('Please upload or paste the question paper (TXT or PDF) first.')
      return
    }
    // prepare order + option shuffle
    let ord = Array.from({length:TOTAL_Q},(_,i)=>i+1)
    if (shuffleQuestions) ord = shuffle(ord)

    const optOrder = {}
    for (let q=1;q<=TOTAL_Q;q++){
      optOrder[q] = shuffleOptions ? shuffle([0,1,2,3]) : [0,1,2,3]
    }

    setState({
      started:true,
      currentIndex:0,
      answers:{},
      flagged:{},
      startAt: Date.now(),
      order: ord,
      optionOrder: optOrder
    })
    setShowReview(false)
    setLastResult(null)
  }

  function gotoIndex(idx){
    if (idx<0) idx=0
    if (idx>=TOTAL_Q) idx=TOTAL_Q-1
    setState(s => ({...s, currentIndex: idx}))
  }
  function gotoQ(qnum){
    const idx = state.order.indexOf(qnum)
    if (idx>=0) gotoIndex(idx)
  }

  function markAnswer(n){
    const q = currentQnum
    setState(s => ({...s, answers:{...s.answers, [q]: n}}))
  }
  function toggleFlag(){
    const q = currentQnum
    setState(s => ({...s, flagged:{...s.flagged, [q]: !s.flagged[q]}}))
  }

  function handleSubmit(){
    const ans = state.answers
    let correct=0, wrong=0, unattempted=0
    for (let i=1;i<=TOTAL_Q;i++){
      const u = ans[i] ?? 0
      const k = answerKey[i] ?? 0
      if (!u) unattempted++
      else if (u===k) correct++
      else wrong++
    }
    const totalMarks = marksFrom(correct, wrong, negative)
    const sub = breakdown(ans, answerKey)
    const attempted = correct+wrong
    const accuracy = attempted ? Math.round((correct/attempted)*100) : 0

    const result = {
      date: new Date().toISOString(),
      durationMin: duration,
      negative,
      shuffleQuestions,
      shuffleOptions,
      totals: { correct, wrong, unattempted, totalMarks, accuracy },
      perSubject: sub,
      answers: ans,
      answerKey: answerKey
    }
    setShowReview(true)
    setLastResult(result)
    setState(s => ({...s, started:false}))

    // persist to profile history
    if (profileName){
      setProfiles(p => {
        const prev = p[profileName] || { attempts: [] }
        return { ...p, [profileName]: { attempts:[result, ...prev.attempts].slice(0,200) } }
      })
    }
  }

  function exportCSV(){
    const rows = [["Q","Subject","Marked","Correct"]]
    for (let i=1;i<=TOTAL_Q;i++){
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

  // ======== computed
  const answeredCount = Object.keys(state.answers).length
  const flaggedCount = Object.values(state.flagged).filter(Boolean).length

  // ======== UI bits
  function TopBar(){
    return (
      <div className="topbar">
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <span className="badge">NEET PWA</span>
          <span className="small">Profiles • Themes • PDF</span>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <select className="select" value={theme} onChange={e=>setTheme(e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
          <select className="select" value={accent} onChange={e=>setAccent(e.target.value)}>
            {Object.keys(ACCENTS).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <div className="small">Install: Menu → Add to Home screen</div>
        </div>
      </div>
    )
  }

  function ProfileCard(){
    return (
      <div className="card row" style={{gap:12}}>
        <h2>Profile</h2>
        <div className="grid-3">
          <div>
            <label className="small">Your name</label>
            <input className="input" value={profileName} onChange={e=>setProfileName(e.target.value.trim())} placeholder="Enter your name"/>
          </div>
          <div>
            <label className="small">Theme</label>
            <div style={{display:'flex', gap:8}}>
              <select className="select" value={theme} onChange={e=>setTheme(e.target.value)}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
              <select className="select" value={accent} onChange={e=>setAccent(e.target.value)}>
                {Object.keys(ACCENTS).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="small">Quick tips</label>
            <div className="small">• Upload TXT or PDF • Questions use options 1–4 • Auto subject mapping</div>
          </div>
        </div>
      </div>
    )
  }

  function UploadCard(){
    return (
      <div className="card row" style={{gap:16}}>
        <h2>Upload Questions & Answers</h2>
        <div className="grid-2">
          <div>
            <label className="small">Upload single file (TXT or PDF) where answers are at the end:</label>
            <input type="file" accept=".txt,application/pdf" onChange={onUploadBoth}/>
          </div>
          <div>
            <label className="small">OR upload separately (TXT/PDF):</label>
            <div className="row">
              <input type="file" accept=".txt,application/pdf" onChange={onUploadPaper}/>
              <input type="file" accept=".txt,application/pdf" onChange={onUploadAnswers}/>
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div>
            <label className="small">Or paste questions (plain text from your PDF):</label>
            <textarea placeholder="Paste the 180 questions here..." value={paperText} onChange={e=>setPaperText(e.target.value)} />
          </div>
          <div>
            <label className="small">Or paste answer key (format: 1 3 / 1:3 / 1) 3)):</label>
            <textarea placeholder="1 3\n2 2\n3 1\n..." value={answerText} onChange={e=>setAnswerText(e.target.value)} />
          </div>
        </div>
      </div>
    )
  }

  function SettingsCard(){
    return (
      <div className="card row" style={{gap:12}}>
        <h2>Exam Settings</h2>
        <div className="grid-3">
          <div>
            <label className="small">Duration (minutes)</label>
            <input className="input" type="number" min="10" max="300" value={duration} onChange={e=>setDuration(parseInt(e.target.value||'0',10))}/>
          </div>
          <div>
            <label className="small">Negative marks per wrong</label>
            <input className="input" type="number" min="0" max="4" step="0.25" value={negative} onChange={e=>setNegative(parseFloat(e.target.value||'0'))}/>
          </div>
          <div>
            <label className="small">Randomization</label>
            <div style={{display:'flex', gap:8}}>
              <label className="small"><input type="checkbox" checked={shuffleQuestions} onChange={e=>setShuffleQuestions(e.target.checked)} /> Shuffle questions</label>
              <label className="small"><input type="checkbox" checked={shuffleOptions} onChange={e=>setShuffleOptions(e.target.checked)} /> Shuffle options</label>
            </div>
          </div>
        </div>
        <div>
          <button className="btn" onClick={startTest}>Start Test</button>
          <button className="btn ghost" style={{marginLeft:8}} onClick={()=>{setPaperText('');setAnswerText('')}}>Clear Paper</button>
        </div>
      </div>
    )
  }

  function QuestionPane(){
    return (
      <div className="card">
        <div className="topbar">
          <div>Q{currentQnum} <span className="small">({subjectOf(currentQnum)})</span></div>
          <div className="small">Timer: <span className="kbd">{secondsToHMS(remaining)}</span></div>
        </div>
        <div className="question">
          <div style={{whiteSpace:'pre-wrap'}}>{baseQ.stem || '—'}</div>
          <div className="options">
            {[1,2,3,4].map(n => (
              <div key={n}
                   className={'option '+(state.answers[currentQnum]===n?'selected':'')}
                   onClick={()=>markAnswer(n)}>
                <b>{n}.</b> {currentOptions[n-1] || ''}
              </div>
            ))}
          </div>
          <div style={{display:'flex', gap:8, marginTop:10}}>
            <button className="btn secondary" onClick={()=>gotoIndex(state.currentIndex-1)}>Prev</button>
            <button className="btn secondary" onClick={()=>gotoIndex(state.currentIndex+1)}>Next</button>
            <button className="btn ghost" onClick={toggleFlag}>{state.flagged[currentQnum]?'Unflag':'Flag'}</button>
            <button className="btn" onClick={handleSubmit}>Submit</button>
          </div>
        </div>
      </div>
    )
  }

  function Navigator(){
    return (
      <div className="card">
        <div className="subject-tabs">
          {['Physics','Chemistry','Botany','Zoology'].map(sub => {
            const range = sub==='Physics'?[1,45]:sub==='Chemistry'?[46,90]:sub==='Botany'?[91,135]:[136,180]
            return (
              <div key={sub} className={'tab '+(currentQnum>=range[0]&&currentQnum<=range[1]?'active':'')}
                   onClick={()=>gotoQ(range[0])}>
                {sub} <span className="small">({range[0]}–{range[1]})</span>
              </div>
            )
          })}
        </div>
        <div className="progress" style={{marginTop:10}}><div style={{width: (answeredCount/TOTAL_Q*100)+'%'}}/></div>
        <div className="small" style={{marginTop:8}}>Answered: {answeredCount}/{TOTAL_Q} • Flagged: {flaggedCount}</div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(10, 1fr)', gap:6, marginTop:12}}>
          {Array.from({length:TOTAL_Q}, (_,i)=>i+1).map(n => {
            const a = state.answers[n]; const f = state.flagged[n];
            return (
              <button key={n} className="btn ghost" style={{padding:'8px 0', borderColor:a?'#22d3ee':'#334155', background: f?'#1d3b4d':'transparent'}}
                      onClick={()=>gotoQ(n)}>
                {n}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function ReviewBlock({qnum}){
    const q = questionsRaw.find(x=>x.number===qnum) || {stem:'',options:['','','','']}
    // For review, show options in the session order that was shown during the test:
    const ord = state.optionOrder[qnum] || [0,1,2,3]
    const opts = ord.map(i => q.options[i] || '')
    const user = state.answers[qnum] ?? 0
    const corr = answerKey[qnum] ?? 0
    return (
      <div className="question" style={{marginTop:12}}>
        <div className="small">Q{qnum} • {subjectOf(qnum)}</div>
        <div style={{whiteSpace:'pre-wrap', marginTop:6}}>{q.stem || '—'}</div>
        <div className="options">
          {[1,2,3,4].map(n => {
            const isCorrect = n===corr
            const isUser = n===user
            const style = {
              borderColor: isCorrect ? '#16a34a' : isUser && !isCorrect ? '#ef4444' : undefined,
              background: isCorrect ? '#0b2a16' : isUser && !isCorrect ? '#2a0b0b' : undefined
            }
            return (
              <div key={n} className="option" style={style}>
                <b>{n}.</b> {opts[n-1] || ''} {isCorrect ? ' ✅' : isUser && !isCorrect ? ' ❌' : ''}
              </div>
            )
          })}
        </div>
        {!user && <div className="small" style={{marginTop:6}}>Not attempted</div>}
      </div>
    )
  }

  function ReviewPanel(){
    if (!lastResult) return null
    const t = lastResult.totals
    const sub = lastResult.perSubject
    return (
      <div className="card" style={{marginTop:16}}>
        <h2>Review & Results</h2>
        <div className="row grid-3">
          <div>Correct: <b>{t.correct}</b></div>
          <div>Wrong: <b>{t.wrong}</b></div>
          <div>Unattempted: <b>{t.unattempted}</b></div>
        </div>
        <p>Total Marks (4 for correct, -{negative} for wrong): <b>{t.totalMarks}</b> • Accuracy: <b>{t.accuracy}%</b></p>
        <table style={{marginTop:8}}>
          <thead><tr><th>Subject</th><th>Correct</th><th>Wrong</th><th>Unattempted</th></tr>
