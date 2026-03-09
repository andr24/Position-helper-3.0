@echo off
cd /d "%~dp0"

echo Starting Kiosk Server...
:: Start the Node.js server in the background
start /B npm run start

echo Waiting for server to start...
:: Wait for 5 seconds to let the server start up
timeout /t 5 /nobreak > NUL

echo Opening App in Fullscreen...
:: Launch Edge in Fullscreen (Kiosk) mode
:: If you prefer Chrome, change 'msedge' to 'chrome'
start msedge --kiosk http://localhost:3000
