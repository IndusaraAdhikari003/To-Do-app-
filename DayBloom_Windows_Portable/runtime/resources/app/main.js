const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } = require("electron");
app.setAppUserModelId("com.daybloom.desktop");
const path = require("path");
const fs = require("fs");

let mainWindow;
let tray;
let reminderTimer;

const dataFile = () => path.join(app.getPath("userData"), "daybloom-data.json");

const defaultData = {
  tasks: [],
  notes: [],
  events: [],
  settings: {
    theme: "sakura",
    accent: "#e88aa7",
    compact: false,
    startup: false
  }
};

function readData() {
  try {
    const file = dataFile();
    if (!fs.existsSync(file)) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
      return structuredClone(defaultData);
    }
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      ...defaultData,
      ...parsed,
      settings: { ...defaultData.settings, ...(parsed.settings || {}) }
    };
  } catch {
    return structuredClone(defaultData);
  }
}

function writeData(data) {
  try {
    fs.mkdirSync(path.dirname(dataFile()), { recursive: true });
    fs.writeFileSync(dataFile(), JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 650,
    backgroundColor: "#fff8fb",
    title: "DayBloom",
    icon: path.join(__dirname, "src", "assets", "DayBloom.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

  mainWindow.on("close", (event) => {
    if (process.platform === "win32" && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function scheduleReminders() {
  clearInterval(reminderTimer);
  reminderTimer = setInterval(() => {
    const data = readData();
    const now = new Date();

    for (const task of data.tasks) {
      if (!task.reminder || task.completed || task.reminded) continue;
      const when = new Date(task.reminder);
      if (!Number.isNaN(when.getTime()) && when <= now) {
        if (Notification.isSupported()) {
          new Notification({
            title: "🌸 DayBloom Reminder",
            body: task.title
          }).show();
        }
        task.reminded = true;
      }
    }
    writeData(data);
  }, 15000);
}

app.whenReady().then(() => {
  createWindow();
  scheduleReminders();

  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip("DayBloom");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open DayBloom", click: () => mainWindow.show() },
    { label: "Quit", click: () => { app.isQuitting = true; app.quit(); } }
  ]));
});

app.on("window-all-closed", () => {
  if (process.platform !== "win32") app.quit();
});

ipcMain.handle("load-data", () => readData());

ipcMain.handle("save-data", (_, data) => {
  return writeData(data);
});

ipcMain.handle("window-hide", () => mainWindow.hide());
ipcMain.handle("window-minimize", () => mainWindow.minimize());
ipcMain.handle("window-maximize", () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.handle("set-startup", (_, enabled) => {
  try {
    app.setLoginItemSettings({ openAtLogin: !!enabled });
    return true;
  } catch { return false; }
});

ipcMain.handle("show-notification", (_, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
    return true;
  }
  return false;
});