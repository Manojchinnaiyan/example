// main.tsx
import { app, BrowserWindow, dialog } from "electron";
import log from "electron-log";
import { autoUpdater } from "electron-updater";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Configure logging
log.transports.file.level = "debug";
autoUpdater.logger = log;

let mainWindow: BrowserWindow | null = null;

function setupAutoUpdater() {
  // Configure updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (error) => {
    log.error("Auto Updater error:", error);
    dialog.showErrorBox("Error", error.message);
  });

  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for update...");
  });

  autoUpdater.on("update-available", () => {
    if (!mainWindow) return;

    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Update Available",
        message: "A new version is available. Do you want to download it now?",
        buttons: ["Yes", "No"],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      })
      .catch((err) => {
        log.error("Error in update dialog:", err);
      });
  });

  autoUpdater.on("download-progress", (progressObj) => {
    let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
    logMessage += ` - Downloaded ${progressObj.percent}%`;
    logMessage += ` (${progressObj.transferred}/${progressObj.total})`;
    log.info(logMessage);

    if (mainWindow) {
      mainWindow.setProgressBar(progressObj.percent / 100);
    }
  });

  autoUpdater.on("update-downloaded", () => {
    if (!mainWindow) return;

    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Update Ready",
        message: "Install and restart now?",
        buttons: ["Yes", "No"],
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false);
        }
      })
      .catch((err) => {
        log.error("Error in install dialog:", err);
      });
  });
}

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  // Setup auto updater after window is created
  setupAutoUpdater();

  // Initial update check
  autoUpdater.checkForUpdates().catch((err) => {
    log.error("Error checking for updates:", err);
  });

  // Check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error("Error in periodic update check:", err);
    });
  }, 60 * 60 * 1000);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle Squirrel events
if (require("electron-squirrel-startup")) {
  app.quit();
}
