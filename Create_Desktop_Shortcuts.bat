@echo off
echo Cleaning up old shortcuts and creating new ones...

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $DesktopPath = [Environment]::GetFolderPath('Desktop'); if (Test-Path ($DesktopPath + '\Admin Backend.lnk')) { Remove-Item ($DesktopPath + '\Admin Backend.lnk') }; if (Test-Path ($DesktopPath + '\Admin Backend Server.lnk')) { Remove-Item ($DesktopPath + '\Admin Backend Server.lnk') }; if (Test-Path ($DesktopPath + '\Admin Dashboard.lnk')) { Remove-Item ($DesktopPath + '\Admin Dashboard.lnk') }; $Shortcut1 = $WshShell.CreateShortcut($DesktopPath + '\Website Frontend.lnk'); $Shortcut1.TargetPath = 'd:\Ceylonsmartlands.lk\ceylonlands\Start_Frontend.bat'; $Shortcut1.WorkingDirectory = 'd:\Ceylonsmartlands.lk\ceylonlands'; $Shortcut1.Save(); $Shortcut2 = $WshShell.CreateShortcut($DesktopPath + '\Super Admin.lnk'); $Shortcut2.TargetPath = 'd:\Ceylonsmartlands.lk\ceylonlands\Start_SuperAdmin.bat'; $Shortcut2.WorkingDirectory = 'd:\Ceylonsmartlands.lk\ceylonlands'; $Shortcut2.Save();"

echo.
echo Success! Your Desktop now has exactly two shortcuts:
echo 1. Website Frontend
echo 2. Super Admin (Starts the server AND opens the Super Admin page!)
pause
