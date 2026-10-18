@echo off
echo Starting ScoreLogic Backend and Frontend...
start cmd /k "cd backend && npm run server"
start cmd /k "cd frontend && npm run dev"
exit
