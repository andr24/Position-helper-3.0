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

To run the application in development mode:

```bash
npm run dev
```

Open your browser to `http://localhost:3000`.

## Production Build

To build the application for production:

```bash
npm run build
```

This will generate static files in the `dist` directory.

To run the production build:

```bash
npm start
```

## Creating a Single Executable (EXE)

To package this application as a single portable executable (EXE) that requires no installation, you can use `pkg`.

1.  **Install `pkg` globally:**
    ```bash
    npm install -g pkg
    ```

2.  **Build the React app:**
    ```bash
    npm run build
    ```

3.  **Package the application:**
    Run the following command to create an executable for Windows (win), macOS (macos), or Linux (linux).
    
    *Note: You may need to adjust the `package.json` "bin" entry or create a separate entry file if `pkg` has trouble with `tsx` directly. A common approach is to compile `server.ts` to JS first or point `pkg` to a JS entry point.*

    **Simplified Steps:**
    
    a. Create a `build-server.js` script (or just use `tsc` to compile `server.ts` to `dist-server/server.js`).
    b. Run:
       ```bash
       pkg . --targets node18-win-x64 --output kiosk-app.exe
       ```
    
    **Important:** `pkg` bundles the Node.js runtime and your server code. It does *not* automatically bundle the `dist` folder (the frontend assets) unless configured. You must ensure the `dist` folder is either:
    -   Copied alongside the EXE.
    -   Or configured in `pkg` assets.

    **Recommended Approach for Kiosk Deployment:**
    
    Since this is a web app, the most robust "single file" solution is actually to use **Electron** or a simple **Chrome Kiosk Mode** shortcut.

    **Option A: Chrome Kiosk Mode (Easiest)**
    1.  Install Chrome on the Kiosk machine.
    2.  Create a shortcut with the target:
        ```
        "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=http://localhost:3000
        ```
    3.  Run the local server (`npm start`) in the background (e.g., via a startup script or Windows Service).

    **Option B: Electron (True Single EXE)**
    1.  Add Electron to the project.
    2.  Configure `electron-builder` to package the React app and a minimal Electron main process.
    3.  Build the executable.

## Usage

1.  **Launch the App**: Open the application in your browser.
2.  **Connect Folder**: You will be prompted to select a local folder. Choose a folder where you want the database and JSON files to be stored.
    -   *Note*: The browser will ask for permission to view and edit files in this folder.
3.  **Home Screen**: Navigate to Store, Pick, Map, or Admin.
4.  **Store**: Enter item details to store them in a free position.
5.  **Pick**: Search for an item by Notification ID and confirm pick.
6.  **Map**: View the status of all positions.
7.  **Admin**: Enter PIN (default `0000`) to manage rules. Use "Change Storage Folder" to reset the connection.

## Troubleshooting

-   **"Folder connection failed"**: Ensure you are using a supported browser (Chrome/Edge) and serving the app over localhost or HTTPS.
-   **Database not saving**: Check if you granted "Read/Write" permissions when prompted by the browser.
