import { app, BrowserWindow, dialog } from "electron";
import log from "electron-log";
import { autoUpdater } from "electron-updater";
import path from "path";

// Webpack entry points
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Configure logging for auto-updater
log.transports.file.level = "debug";
autoUpdater.logger = log;
autoUpdater.autoDownload = false;

// Reference to main window
let mainWindow: BrowserWindow | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

const isDev = process.env.NODE_ENV === "development";

// Configure logging
log.transports.file.level = "debug";
autoUpdater.logger = log;

// Enable debugging in development
if (isDev) {
  autoUpdater.updateConfigPath = path.join(__dirname, "dev-app-update.yml");
  // Log all update-related events
  autoUpdater.on("checking-for-update", () => {
    log.info("DEV: Checking for updates");
  });
  autoUpdater.on("update-available", (info) => {
    log.info("DEV: Update available", info);
  });
  autoUpdater.on("update-not-available", (info) => {
    log.info("DEV: Update not available", info);
  });
  autoUpdater.on("error", (err) => {
    log.error("DEV: Error in auto-updater:", err);
  });
}

// Setup auto-updater with debug options
function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.allowDowngrade = true; // Useful for testing

  // Use a shorter check interval in development
  const CHECK_INTERVAL = isDev ? 1 * 60 * 1000 : 4 * 60 * 60 * 1000; // 1 min in dev, 4 hours in prod

  autoUpdater.on("update-available", (info) => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update Available",
        message: `Version ${info.version} is available. Would you like to download it now?`,
        detail: isDev ? "Running in development mode" : undefined,
        buttons: ["Yes", "No"],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  // Other event handlers...

  // Start update checks
  setInterval(() => {
    log.info("Checking for updates...");
    autoUpdater.checkForUpdates().catch((err) => {
      log.error("Error checking for updates:", err);
    });
  }, CHECK_INTERVAL);
}
// Set up periodic update checks (every 4 hours)
function scheduleUpdateChecks(): void {
  const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error("Error in scheduled update check:", err);
    });
  }, CHECK_INTERVAL);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
  scheduleUpdateChecks();
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
