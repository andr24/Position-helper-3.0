# Kiosk Inventory System (Client-Server Architecture)

This project is a robust, offline-first inventory management system designed for warehouse kiosks. It uses a **Client-Server architecture** to allow multiple tablets or PCs (Kiosks) to connect to a single, central database hosted on a dedicated local PC.

## Architecture Overview

*   **The Host PC (Server):** One computer in the warehouse runs the Node.js backend. It hosts the SQLite database (`kiosk.db`) and serves the React frontend.
*   **The Kiosks (Clients):** Other devices (tablets, laptops, phones) connect to the Host PC over the local Wi-Fi/LAN using a standard web browser (Chrome, Edge, Safari).
*   **No Cloud Required:** Everything runs locally on your network. No internet connection or Microsoft/Azure logins are required.

## Features

*   **Multi-User Sync:** Because all kiosks talk to the single Host PC, data is always perfectly in sync. No race conditions or overwritten files.
*   **Smart Storage Logic:** Automatically finds the best physical column for an item based on configurable rules (priority, capacity, part type compatibility).
*   **Partial Storage (NS/SUB):** Handles items that come in two parts (NS and SUB). It will pair them together in the same slot if they share a Notification ID.
*   **A-Rank Items:** Handles large items that take up a full slot immediately.
*   **Visual Map:** A real-time visual representation of the warehouse columns and slots.
*   **Admin Panel:** PIN-protected area to configure column rules, view action logs, and export/import the entire database to Excel.

---

## Setup Instructions

### Phase 1: Setting up the "Host PC" (The Server)

You must pick **one** computer in the warehouse to act as the server. This computer must remain turned on while the warehouse is operating.

1.  **Install Node.js:** Download and install Node.js from [nodejs.org](https://nodejs.org/).
2.  **Download the Code:** Extract this project folder onto the Host PC.
3.  **Install Dependencies:**
    Open a terminal (Command Prompt or PowerShell) in the project folder and run:
    ```bash
    npm install
    ```
4.  **Build the App:**
    Compile the React frontend so it's ready to be served:
    ```bash
    npm run build
    ```
5.  **Start the Server Manually:**
    Start the backend server:
    ```bash
    npm run start
    ```
    *You should see a message saying: `Server running on http://0.0.0.0:3000`*

### Phase 1.5: Automatic Windows Startup (Optional but Recommended)

To make the Host PC automatically start the server and open the app whenever it is turned on or rebooted:

1.  Press `Win + R` on your keyboard to open the Run dialog.
2.  Type `shell:startup` and press Enter. This will open your Windows Startup folder.
3.  Go back to your project folder, right-click on the `start-kiosk-hidden.vbs` file, and select **Create shortcut**.
4.  Drag and drop that newly created shortcut into the Windows Startup folder you opened in step 2.
5.  *That's it!* Now, whenever the PC turns on, the server will start silently in the background, and the app will open automatically in your default browser. You can also just double-click `start-kiosk.bat` at any time to launch it manually.

### Phase 1.8: Setting a Static IP (Crucial for Reliability)

By default, the Host PC's IP address (e.g., `192.168.1.50`) might change if the router restarts. If this happens, all the Kiosks will stop working until you update their bookmarks. To prevent this, set a **Static IP** on the Host PC:

1.  **Get Current Details:**
    *   Open Command Prompt on the Host PC and type `ipconfig /all`.
    *   Write down the following values: **IPv4 Address**, **Subnet Mask**, **Default Gateway**, and **DNS Servers**.
2.  **Open Network Settings:**
    *   Go to **Settings > Network & Internet**.
    *   Click on **Ethernet** (or **Wi-Fi** > **Manage known networks** > Select your network).
    *   Find the **IP assignment** section and click **Edit**.
3.  **Set Manual IP:**
    *   Change the setting from **Automatic (DHCP)** to **Manual**.
    *   Toggle **IPv4** to **On**.
    *   Fill in the boxes with the values you wrote down in Step 1.
    *   Click **Save**.
4.  **Done:** Your Host PC will now always keep the same IP address, ensuring the Kiosks can always find it.

### Phase 2: Connecting the Kiosks

Now that the Host PC is running, you can connect to it from any other device on the same Wi-Fi network.

1.  **Find the Host PC's IP Address:**
    *   On the Host PC, open Command Prompt and type `ipconfig`.
    *   Look for the **IPv4 Address** (e.g., `192.168.1.50`).
2.  **Open the App on a Kiosk:**
    *   On your tablet or other PC, open a web browser (Chrome/Edge).
    *   Type the Host PC's IP address followed by `:3000` into the address bar.
    *   Example: `http://192.168.1.50:3000`
3.  **Bookmark it:** Save this URL to the home screen of the tablet for easy access.

---

## Admin Panel & Excel Management

The Admin panel is protected by a PIN (Default: **0000**). 

From the Admin panel, you can:
1.  **Change Column Rules:** Enable/disable columns, change their priority (1 is highest), and set which item types are allowed in them.
2.  **View Logs:** See a history of every item stored and picked.
3.  **Export/Import Excel:** 
    *   You can download the entire database (Positions, Rules, Logs) as an `.xlsx` file.
    *   You can edit the Positions or Rules in Excel, and then **Import** the file back into the app to instantly overwrite the database. *(Warning: This replaces the current live data).*

## Troubleshooting

*   **Cannot connect from a Kiosk:**
    *   Ensure the Host PC and the Kiosk are on the exact same Wi-Fi network.
    *   Ensure the Host PC's Windows Firewall is not blocking port `3000`. You may need to add an inbound rule in Windows Defender Firewall to allow TCP port 3000.
*   **Server crashes or won't start:**
    *   Ensure no other application is using port 3000.
    *   Check the terminal for error messages. Ensure you ran `npm install` successfully.
*   **Data isn't saving:**
    *   Ensure the Host PC has write permissions in the project folder (specifically the `data` folder where `kiosk.db` is stored).
