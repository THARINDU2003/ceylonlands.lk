@echo off
echo Starting CeylonTerrece Backend and Frontend...

:: Open a new window that explicitly navigates to the exact backend folder and starts the server
start "CeylonTerrece Server" cmd /k "cd /d "%~dp0backend" && node server.js"

:: Wait 4 seconds for the server to spin up
timeout /t 4 /nobreak > nul

:: Open the frontend in the default browser
echo Opening Frontend in your web browser...
start http://localhost:5000

exit
