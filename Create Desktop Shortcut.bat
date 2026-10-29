@echo off
rem Puts a "Notes" shortcut on your Desktop (and in the Start menu) pointing at the built app.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-desktop-shortcut.ps1"
echo.
pause
