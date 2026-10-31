@echo off
rem Rebuilds release\win-unpacked\Ponder.exe from the source code. Close Ponder first.
rem Your notes in the data folder are never touched by this.
cd /d "%~dp0"

tasklist /FI "IMAGENAME eq Ponder.exe" 2>nul | find /I "Ponder.exe" >nul
if not errorlevel 1 (
  echo Ponder is still open. Close it first, then run this again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing building blocks - first time only, this can take a few minutes...
  call npm install
  if errorlevel 1 goto :fail
)

echo Building Ponder...
call npm run package
if errorlevel 1 goto :fail

echo.
echo Done! The app is at release\win-unpacked\Ponder.exe
echo If you do not have a Desktop shortcut yet, double-click "Create Desktop Shortcut.bat".
echo.
pause
exit /b 0

:fail
echo.
echo The build failed - see the messages above.
pause
exit /b 1
