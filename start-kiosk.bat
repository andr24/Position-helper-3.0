@echo off
cd /d "%~dp0"

echo Starting Kiosk Server...
:: Start the Node.js server in the background
start /B npm run start

echo Waiting for server to start...
:: Wait for 5 seconds to let the server start up
timeout /t 5 /nobreak > NUL

echo Opening App in Fullscreen...
:: Using a temporary user data directory forces Edge to open a brand new window.
:: This ensures the --kiosk flag works even if you already have Edge open in the background.
start msedge --kiosk http://localhost:3000 --user-data-dir="%temp%\kiosk_session"
