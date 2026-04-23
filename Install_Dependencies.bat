@echo off
echo Installing missing backend dependencies (like helmet)...
cd /d "%~dp0backend"
npm install
echo.
echo Installation complete! You can now close this window and try your Admin Backend shortcut again.
pause
