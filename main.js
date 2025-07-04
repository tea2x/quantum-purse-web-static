const { app, BrowserWindow, session, shell } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1010,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.setMinimumSize(1010, 700);
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
    });

    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = Object.assign({}, details.responseHeaders);
        responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin'];
        responseHeaders['Cross-Origin-Embedder-Policy'] = ['require-corp'];
        callback({ responseHeaders });
    });

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});