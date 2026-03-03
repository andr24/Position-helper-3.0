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

## Building the Windows Executable (.exe)

This project uses `electron-builder` to package the app into a single, installable Windows application.

To build the executable:

```bash
npm run build:exe
```

This will create a `dist_electron` folder containing:
1. **`Kiosk Inventory System Setup x.x.x.exe`**: An installer for the application.
2. **`win-unpacked/Kiosk Inventory System.exe`**: A portable version of the app you can run directly without installing.

## iOS or macOS Deployment

**Electron** is designed for desktop applications (Windows, macOS, Linux) and **cannot compile directly to an iOS app**. 

### Deploying to macOS
If you are on a Mac, you can update the `build:exe` script in `package.json` to include `"electron-builder --mac"` instead of `--win`, which will output a `.dmg` or `.app` file.

### Running on an iPad or iOS Device
Because this application relies on the **File System Access API** (specifically `showDirectoryPicker` to select a local SQLite/JSON folder), it currently requires a desktop-class browser (like Chrome, Edge, or the packaged Electron app). 

**iOS Safari does not support the File System Access API.** 

To eventually run this on an iPad natively, you would need to:
1. Wrap the compiled Vite application (`dist` folder) using a mobile wrapper like **Capacitor**.
2. Replace the web `showDirectoryPicker` logic in `src/services/filesystem.ts` with the `@capacitor/filesystem` plugin to read and write files to the iOS device's local storage.

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
