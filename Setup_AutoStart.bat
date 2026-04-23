@echo off
echo ========================================
echo  CeylonTerrece - Auto Start Setup
echo ========================================
echo.
echo This will make your website backend start
echo automatically every time Windows starts!
echo.

set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS_FILE=D:\Ceylonsmartlands.lk\ceylonlands\Start_Backend_Silent.vbs

echo Copying startup script to Windows Startup folder...
copy "%VBS_FILE%" "%STARTUP_FOLDER%\CeylonTerrece_Backend.vbs" /Y

if %ERRORLEVEL% == 0 (
    echo.
    echo ========================================
    echo  SUCCESS! Setup Complete!
    echo ========================================
    echo.
    echo Your backend will now start AUTOMATICALLY
    echo every time you turn on your computer!
    echo.
    echo Your website will be available at:
    echo   http://localhost:5000
    echo.
    echo Starting the server RIGHT NOW...
    echo.
    wscript "%VBS_FILE%"
    echo Server is running! Open your browser and go to:
    echo   http://localhost:5000
) else (
    echo.
    echo ERROR: Could not copy file. 
    echo Please run this file as Administrator!
    echo Right-click the file and select "Run as administrator"
)

echo.
pause
