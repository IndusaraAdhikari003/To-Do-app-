const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dayBloom", {
  loadData: () => ipcRenderer.invoke("load-data"),
  saveData: (data) => ipcRenderer.invoke("save-data", data),
  notify: (title, body) => ipcRenderer.invoke("show-notification", title, body),
  setStartup: (enabled) => ipcRenderer.invoke("set-startup", enabled),
  minimize: () => ipcRenderer.invoke("window-minimize"),
  maximize: () => ipcRenderer.invoke("window-maximize"),
  hide: () => ipcRenderer.invoke("window-hide")
});