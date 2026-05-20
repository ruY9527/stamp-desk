/**
 * Electron 主进程
 * 负责窗口管理、文件操作、PDF处理等后端逻辑
 */

import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { PDFDocument } from 'pdf-lib'

/** 预加载脚本路径 */
const PRELOAD_PATH = path.join(__dirname, '../preload/index.js')

/** 渲染进程入口URL (开发模式) 或文件路径 (生产模式) */
const RENDERER_URL = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../../dist/index.html')}`

/** 主窗口实例 */
let mainWindow: BrowserWindow | null = null

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'StampDesk - PDF自动盖章工具',
    icon: path.join(__dirname, '../../resources/', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // 加载渲染进程
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * 注册所有 IPC 通信处理
 */
function registerIpcHandlers(): void {
  /** 选择PDF文件 */
  ipcMain.handle('select-pdf', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择PDF文件',
      filters: [{ name: 'PDF文件', extensions: ['pdf'] }],
      properties: ['openFile', 'multiSelections'],
    })
    if (result.canceled) return null
    return result.filePaths
  })

  /** 选择印章图片 */
  ipcMain.handle('select-stamp', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择印章图片',
      filters: [
        { name: 'PNG图片', extensions: ['png'] },
        { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'bmp'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  /** 读取文件内容 */
  ipcMain.handle('read-file', async (_event, filePath: string) => {
    const buffer = await fs.readFile(filePath)
    // 完全独立的ArrayBuffer副本，避免detach问题
    const ab = new ArrayBuffer(buffer.byteLength)
    new Uint8Array(ab).set(buffer)
    return ab
  })

  /** 读取PDF文件并返回页数 */
  ipcMain.handle('read-pdf', async (_event, filePath: string) => {
    const buffer = await fs.readFile(filePath)
    const pdfDoc = await PDFDocument.load(buffer)
    const pageCount = pdfDoc.getPageCount()
    // 完全独立的ArrayBuffer副本，避免detach问题
    const ab = new ArrayBuffer(buffer.byteLength)
    new Uint8Array(ab).set(buffer)
    return {
      buffer: ab,
      pageCount,
    }
  })

  /**
   * 将印章写入PDF
   * 使用pdf-lib将印章图片嵌入到PDF指定位置
   * 接收文件路径而非ArrayBuffer，避免IPC传输detach问题
   */
  ipcMain.handle('stamp-pdf', async (_event, params) => {
    const { filePath, stamps } = params as {
      filePath: string
      stamps: Array<{
        imageBase64: string
        position: {
          x: number
          y: number
          width: number
          height: number
          rotation: number
          pageIndex: number
        }
      }>
    }

    const pdfFileBuffer = await fs.readFile(filePath)
    const pdfDoc = await PDFDocument.load(pdfFileBuffer)
    const pages = pdfDoc.getPages()

    for (const stamp of stamps) {
      const { imageBase64, position } = stamp
      const page = pages[position.pageIndex]
      if (!page) continue

      const { width: pageWidth, height: pageHeight } = page.getSize()

      // 将Base64图片嵌入PDF (兼容PNG和JPG格式)
      const imageBytes = Buffer.from(imageBase64, 'base64')
      let pdfImage
      // 检测PNG魔数 (89 50 4E 47)
      const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50 && imageBytes[2] === 0x4E && imageBytes[3] === 0x47
      if (isPng) {
        pdfImage = await pdfDoc.embedPng(imageBytes)
      } else {
        // 非PNG格式，使用pdf-lib的JPG嵌入(支持JPEG/JFIF)
        pdfImage = await pdfDoc.embedJpg(imageBytes)
      }

      // 坐标转换: 归一化坐标 -> PDF坐标
      // position.x/y 是归一化值(0~1)，以PDF页面左上角为原点
      // position.width/height 是归一化值(0~1)，需要乘以页面尺寸得到PDF点数
      // PDF坐标系: 左下角为原点，Y轴向上
      const stampWidth = position.width * pageWidth
      const stampHeight = position.height * pageHeight
      const pdfX = position.x * pageWidth
      const pdfY = pageHeight - position.y * pageHeight - stampHeight

      // 绘制印章
      page.drawImage(pdfImage, {
        x: pdfX,
        y: pdfY,
        width: stampWidth,
        height: stampHeight,
        rotate: { type: 'degrees', angle: position.rotation },
      })
    }

    const pdfBytes = await pdfDoc.save()
    // 转为Buffer以便IPC序列化(Uint8Array无法被structured clone)
    return Buffer.from(pdfBytes)
  })

  /**
   * 处理印章图片
   * 直接返回原始base64，图片处理已在渲染进程通过canvas完成
   */
  ipcMain.handle('process-stamp', async (_event, imageBase64: string, _width: number, _height: number) => {
    return imageBase64
  })

  /** 保存文件 */
  ipcMain.handle('save-file', async (_event, data: Uint8Array, defaultName: string) => {
    if (!mainWindow) return null
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '保存PDF文件',
      defaultPath: defaultName,
      filters: [{ name: 'PDF文件', extensions: ['pdf'] }],
    })
    if (result.canceled || !result.filePath) return null
    await fs.writeFile(result.filePath, Buffer.from(data))
    return result.filePath
  })

  /**
   * 批量处理PDF
   * 逐个处理每个PDF文件并报告进度
   */
  ipcMain.handle('batch-process', async (event, tasks) => {
    const { tasks: taskList } = tasks as {
      tasks: Array<{
        taskId: string
        pdfPath: string
        stamps: Array<{
          imageBase64: string
          position: {
            x: number
            y: number
            width: number
            height: number
            rotation: number
            pageIndex: number
          }
        }>
        outputPath: string
      }>
    }

    const results = []

    for (const task of taskList) {
      try {
        // 报告进度: 开始处理
        event.sender.send('batch-progress', {
          taskId: task.taskId,
          progress: 0,
          status: 'processing',
        })

        // 读取PDF
        const pdfBuffer = await fs.readFile(task.pdfPath)
        const pdfDoc = await PDFDocument.load(pdfBuffer)
        const pages = pdfDoc.getPages()

        // 逐个印章写入
        for (let i = 0; i < task.stamps.length; i++) {
          const stamp = task.stamps[i]
          const page = pages[stamp.position.pageIndex]
          if (!page) continue

          const { width: pageWidth, height: pageHeight } = page.getSize()
          const imageBytes = Buffer.from(stamp.imageBase64, 'base64')
          // 兼容PNG和JPG格式
          const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50 && imageBytes[2] === 0x4E && imageBytes[3] === 0x47
          let pdfImage
          if (isPng) {
            pdfImage = await pdfDoc.embedPng(imageBytes)
          } else {
            pdfImage = await pdfDoc.embedJpg(imageBytes)
          }

          const stampWidth = stamp.position.width * pageWidth
          const stampHeight = stamp.position.height * pageHeight
          const pdfX = stamp.position.x * pageWidth
          const pdfY = pageHeight - stamp.position.y * pageHeight - stampHeight

          page.drawImage(pdfImage, {
            x: pdfX,
            y: pdfY,
            width: stampWidth,
            height: stampHeight,
            rotate: { type: 'degrees', angle: stamp.position.rotation },
          })

          // 报告进度
          const progress = Math.round(((i + 1) / task.stamps.length) * 100)
          event.sender.send('batch-progress', {
            taskId: task.taskId,
            progress,
            status: 'processing',
          })
        }

        // 保存文件
        const pdfBytes = await pdfDoc.save()
        await fs.writeFile(task.outputPath, pdfBytes)

        results.push({
          taskId: task.taskId,
          success: true,
          outputPath: task.outputPath,
        })

        // 报告完成
        event.sender.send('batch-progress', {
          taskId: task.taskId,
          progress: 100,
          status: 'completed',
          outputPath: task.outputPath,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '未知错误'
        results.push({
          taskId: task.taskId,
          success: false,
          error: errorMessage,
        })

        event.sender.send('batch-progress', {
          taskId: task.taskId,
          progress: 0,
          status: 'failed',
          error: errorMessage,
        })
      }
    }

    return results
  })

  /** 在文件管理器中显示文件 */
  ipcMain.handle('show-item-in-folder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  /** 保存模板到本地文件 */
  ipcMain.handle('save-template', async (_event, template) => {
    try {
      const templatesDir = path.join(app.getPath('userData'), 'templates')
      await fs.mkdir(templatesDir, { recursive: true })
      const filePath = path.join(templatesDir, `${template.id}.json`)
      await fs.writeFile(filePath, JSON.stringify(template, null, 2))
      return true
    } catch {
      return false
    }
  })

  /** 加载模板 */
  ipcMain.handle('load-template', async (_event, templateId: string) => {
    try {
      const filePath = path.join(app.getPath('userData'), 'templates', `${templateId}.json`)
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  })

  /** 删除模板 */
  ipcMain.handle('delete-template', async (_event, templateId: string) => {
    try {
      const filePath = path.join(app.getPath('userData'), 'templates', `${templateId}.json`)
      await fs.unlink(filePath)
      return true
    } catch {
      return false
    }
  })

  /** 获取所有模板列表 */
  ipcMain.handle('list-templates', async () => {
    try {
      const templatesDir = path.join(app.getPath('userData'), 'templates')
      await fs.mkdir(templatesDir, { recursive: true })
      const files = await fs.readdir(templatesDir)
      const templates = []
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(templatesDir, file), 'utf-8')
          templates.push(JSON.parse(content))
        }
      }
      return templates
    } catch {
      return []
    }
  })

  /** 保存印章库到本地文件 */
  ipcMain.handle('save-stamps', async (_event, stamps) => {
    try {
      const filePath = path.join(app.getPath('userData'), 'stamps.json')
      await fs.writeFile(filePath, JSON.stringify(stamps, null, 2))
      return true
    } catch {
      return false
    }
  })

  /** 加载印章库 */
  ipcMain.handle('load-stamps', async () => {
    try {
      const filePath = path.join(app.getPath('userData'), 'stamps.json')
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return []
    }
  })
}

/** 应用就绪后创建窗口 */
app.whenReady().then(() => {
  // macOS: 设置Dock图标
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, '../../resources/icon.png')
    const icon = nativeImage.createFromPath(iconPath)
    app.dock.setIcon(icon)
  }

  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

/** 所有窗口关闭时退出应用(macOS除外) */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
