# Offline Kiosk Application

This is a React-based Kiosk application designed to work fully offline using `sql.js` (SQLite in the browser) and the File System Access API.

## Features

- **Offline-First**: Runs entirely in the browser without a backend server dependency for data operations.
- **Local Database**: Uses `sql.js` to manage a SQLite database (`kiosk.db`) directly in the browser.
- **File System Access**: Connects to a local folder to persist the database and store JSON files for each position.
- **Kiosk UI**: Large, touch-friendly interface for managing inventory positions (A-Z x 1-8).
- **Admin Panel**: Secure settings area to manage column rules and reset the storage folder connection.

## Prerequisites

- Node.js (v18 or higher recommended)
- A modern browser (Chrome, Edge, or Opera) that supports the File System Access API.

## Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Development

To run the application in development mode with hot-reloading:

```bash
npm run electron:dev
```

This will start the Vite frontend server and launch the Electron application window.

## Deployment & Installation

The application can be deployed in three main ways depending on your target device:

### 1. Windows (Standalone Application)
This project uses `electron-builder` to package the web app into a native Windows executable that runs securely offline.

To build the executable, run:
```bash
npm run build:exe
```
This will automatically compile the app and create a `dist_electron` folder containing:
- **`Kiosk Inventory System Setup x.x.x.exe`**: A standard Windows installer.
- **`win-unpacked/Kiosk Inventory System.exe`**: A portable executable folder you can run directly from a USB drive without installing.

### 2. Web Version (Browser / Intranet)
Because the app uses the native **File System Access API**, it can be hosted as a standard static website on any local intranet server, and accessed via Chrome or Edge.

To build the static web version:
```bash
npm run build
```
This generates a `dist` folder. You can host this folder using any static web server (like NGINX, Apache, or Python's `http.server`). 
*Note: The browser will ask for permission to read/write to your chosen local folder every time the page hard-refreshes.*

### 3. iOS / iPad Deployment
Apple's iOS Safari **does not support** the File System Access API required by this application to securely write JSON files to the device without a server. 

To deploy this exactly as-is to an iPad, you must wrap the web build in a native app shell using **Capacitor**:
1. Run `npm run build` to generate the web assets.
2. Initialize Capacitor in the project (`npx cap init`).
3. Add the iOS platform (`npx cap add ios`).
4. **Important Code Change**: You must replace the web `showDirectoryPicker` logic in `src/services/filesystem.ts` with the `@capacitor/filesystem` plugin to allow the app to write to the iPad's internal storage natively.
5. Open XCode (`npx cap open ios`) and build the app to your provisioned iPad.

## Usage

1. **Launch the App**: Open the compiled `.exe` or run `npm run electron:dev`.
2. **Connect Folder**: On first launch, you will be prompted to select a local folder. Choose an empty folder where you want the database (`kiosk_db.json`) and position files to be stored.
3. **Home Screen**: Navigate to Store, Pick, Map, or Admin.
4. **Store**: Enter an ID, select NS/SUB/A-Rank, and store the item. The system enforces strict matching for partial parts.
5. **Pick**: Search for an item by Notification ID and confirm pick. Partial positions cannot be picked.
6. **Map**: View the visual status of all positions and real-time insights.
7. **Admin**: Enter PIN (default `0000`) to manage column rules, view Action Logs, and Import/Export Excel backups.

## Troubleshooting

- **"Storage folder not connected"**: Click "Change Storage Folder" in the Admin panel to re-select your database directory.
- **Build Errors**: Ensure you have run `npm install` and that no other instances of the app are running when you run `npm run build:exe`.
