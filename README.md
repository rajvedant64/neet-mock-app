# NEET Mock Test PWA (Source)

This is a Vite + React offline-capable PWA for taking NEET-style mock tests.

## Features
- Upload questions + answers together (or separately) as `.txt` files (exported from your PDFs).
- Options are **1,2,3,4** (not A/B/C/D).
- Subjects auto-mapped:  
  - Physics (1–45)  
  - Chemistry (46–90)  
  - Botany (91–135)  
  - Zoology (136–180)
- Timer, flagging, progress grid, offline caching, result CSV export.
- Works as a **Progressive Web App (PWA)** → installable on phone.

## Quick Start (Android Termux / Node)
```bash
pkg install nodejs -y
npm install
npm run build
# open dist/index.html in Chrome and "Add to Home Screen"
