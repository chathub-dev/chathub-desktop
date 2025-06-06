import { electronApp } from '@electron-toolkit/utils'
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'

// Register custom protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('chathub', process.execPath, [process.argv[1]])
  }
} else {
  app.setAsDefaultProtocolClient('chathub')
}

let mainWindow = null

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    titleBarStyle: 'hiddenInset'
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Handle custom protocol
  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleProtocolUrl(url)
  })

  // Handle protocol on Windows
  if (process.platform === 'win32') {
    const gotTheLock = app.requestSingleInstanceLock()
    if (!gotTheLock) {
      app.quit()
      return
    }

    app.on('second-instance', (event, commandLine) => {
      // Someone tried to run a second instance, we should focus our window
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }

      // Handle protocol URL from command line
      const url = commandLine.find((arg) => arg.startsWith('chathub://'))
      if (url) {
        handleProtocolUrl(url)
      }
    })
  }

  mainWindow.loadURL('https://app.chathub.gg')
  // mainWindow.loadURL('http://localhost:3000')

  return mainWindow
}

function handleProtocolUrl(url) {
  try {
    const urlObj = new URL(url)
    if (urlObj.protocol === 'chathub:' && urlObj.hostname === 'redirect') {
      const targetUrl = urlObj.searchParams.get('url')
      if (targetUrl) {
        const targetUrlObj = new URL(targetUrl)
        for (const [key, value] of urlObj.searchParams.entries()) {
          if (key !== 'url') {
            targetUrlObj.searchParams.set(key, value)
          }
        }
        const finalUrl = targetUrlObj.toString()
        console.log('Redirecting to:', finalUrl)
        mainWindow?.loadURL(finalUrl)
      }
    }
  } catch (error) {
    console.error('Error handling protocol URL:', error)
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('gg.chathub.app')

  mainWindow = createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
