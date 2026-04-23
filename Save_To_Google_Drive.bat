@echo off
setlocal
echo ===================================================
echo     Saving CeylonTerrece to Google Drive...
echo ===================================================
echo.

:: Try to automatically find the Google Drive folder
set "GDRIVE_PATH="
if exist "G:\My Drive" (
    set "GDRIVE_PATH=G:\My Drive\CeylonTerrece_Backup"
) else if exist "H:\My Drive" (
    set "GDRIVE_PATH=H:\My Drive\CeylonTerrece_Backup"
) else if exist "%USERPROFILE%\Google Drive" (
    set "GDRIVE_PATH=%USERPROFILE%\Google Drive\CeylonTerrece_Backup"
) else (
    echo [!] Could not automatically detect Google Drive.
    echo Please type your Google Drive Backup folder path manually.
    set /p GDRIVE_PATH="Enter Path (e.g., D:\GoogleDrive\Backup): "
)

echo.
echo Copying files to: %GDRIVE_PATH%
echo This may take a moment depending on the project size...
echo.

:: Use ROBOCOPY to copy the project folder to Google Drive
:: We exclude node_modules and .git because they contain too many small files that slow down Google Drive
robocopy "%~dp0." "%GDRIVE_PATH%" /MIR /XD node_modules .git /W:1 /R:1 /NDL /NFL /NJH /NJS

echo.
echo ===================================================
echo     Successfully Saved to Google Drive!
echo ===================================================
pause
