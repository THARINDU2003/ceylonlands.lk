@echo off
echo Starting CeylonTerrece Server and opening Website Frontend...

:: Start the backend server in a new window
start "CeylonTerrece Server" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Wait for the server to start (4 seconds)
timeout /t 4 /nobreak > nul

:: Open the Website Frontend
echo Opening Frontend in your web browser...
start http://localhost:5000

exit
