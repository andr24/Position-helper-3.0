# Warehouse PC Server Setup

This folder contains the Kiosk Inventory System server.

## 1. Prerequisites
- **Node.js**: Install the latest LTS version from [nodejs.org](https://nodejs.org/).

## 2. First Time Setup
1. Copy this entire folder to the Warehouse PC.
2. Open a terminal (CMD or PowerShell) in this folder.
3. Run: `npm install`

## 3. How to Start
- **Visible Console**: Double-click `start-server.bat`.
- **Hidden Background**: Double-click `start-kiosk-hidden.vbs`.

## 4. Accessing the App
Once the server is running, other PCs/Tablets on the same network can access it via:
`http://[SERVER_IP]:3000`

The server's IP address will be displayed in the app header once you open it on the server PC.

## 5. Auto-Start on Boot
1. Press `Win + R`.
2. Type `shell:startup` and press Enter.
3. Create a shortcut to `start-kiosk-hidden.vbs` and paste it into that folder.
