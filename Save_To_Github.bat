@echo off
echo ===================================================
echo     Saving CeylonTerrace to GitHub...
echo ===================================================
echo.

:: Navigate to the directory where this script is located
cd /d "%~dp0"

echo Adding files...
git add .

echo Committing changes...
git commit -m "Auto backup: saved latest changes to GitHub and device"

echo Pushing to GitHub...
git push origin main

echo.
echo ===================================================
echo     Successfully Saved to GitHub!
echo ===================================================
pause
