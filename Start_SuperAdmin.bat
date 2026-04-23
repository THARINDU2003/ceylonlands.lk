@echo off
echo Starting CeylonTerrece Server and opening Super Admin...

:: Start the backend server in a new window
start "CeylonTerrece Server" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Wait for the server to start (4 seconds)
timeout /t 4 /nobreak > nul

:: Open the Super Admin page
echo Opening Super Admin in your web browser...
start http://localhost:5000/super-admin.html

exit
