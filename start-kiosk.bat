@echo off
title Kiosk Inventory System
echo Starting Kiosk Server...
cd /d "%~dp0"

:: Start the server in a new minimized window
start /min cmd /c "npm run dev"

:: Wait 5 seconds for the server to initialize
echo Waiting for server to start...
timeout /t 5 /nobreak > NUL

:: Open the default web browser to the app in kiosk mode (Chrome example)
:: start chrome --kiosk http://localhost:3000
:: Or just open the default browser:
start http://localhost:3000

echo App started! You can close this window.
exit
