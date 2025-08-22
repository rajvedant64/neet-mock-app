/* Global styles */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  background: var(--bg);
  color: var(--text);
  transition: 0.3s;
}

:root {
  --bg: #f9f9f9;
  --text: #222;
  --card: #fff;
  --primary: #4a90e2;
  --danger: #e74c3c;
}

body[data-theme="dark"] {
  --bg: #121212;
  --text: #eee;
  --card: #1e1e1e;
  --primary: #4a90e2;
  --danger: #e74c3c;
}

.screen {
  padding: 1rem;
  max-width: 700px;
  margin: auto;
}

h2, h3 {
  margin-top: 0;
}

/* Cards */
.card {
  background: var(--card);
  border-radius: 10px;
  padding: 1rem;
  margin: 1rem 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* Buttons */
button, .btn {
  padding: 0.6rem 1rem;
  margin: 0.3rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  background: #ccc;
  color: #000;
  text-decoration: none;
  display: inline-block;
}

button.primary, .btn.primary {
  background: var(--primary);
  color: white;
}

button.active {
  background: var(--primary);
  color: white;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Exam screen */
.qimg, #pdf-canvas {
  width: 100%;
  margin: 1rem 0;
  border: 1px solid #ddd;
}

.options {
  display: flex;
  justify-content: space-around;
  margin: 1rem 0;
}

.options .opt {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 1.2rem;
  background: var(--card);
  border: 2px solid var(--primary);
  color: var(--text);
}

.options .opt.selected {
  background: var(--primary);
  color: white;
}

/* History + Review */
.attempt-card, .answer-card, .test-card {
  background: var(--card);
  padding: 0.8rem;
  margin: 0.5rem 0;
  border-radius: 8px;
}

.answer-card span {
  margin-right: 1rem;
}

.correct { color: green; }
.wrong { color: red; }
.na { color: gray; }

/* Bottom nav */
nav.bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: var(--card);
  border-top: 1px solid #ddd;
  padding: 0.5rem 0;
}

nav.bottom a {
  text-decoration: none;
  color: var(--text);
  font-weight: bold;
}

nav.bottom a.active {
  color: var(--primary);
    }
