@echo off
echo Starting CeylonTerrece Backend...

:: Move to the directory where this script is located
cd /d "%~dp0"

cd backend
npm run dev
pause
