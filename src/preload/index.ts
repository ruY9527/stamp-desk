/**
 * Electron Preload 脚本
 * 使用 contextBridge 安全地将 Node.js API 暴露给渲染进程
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron'

/**
 * 暴露给渲染进程的 API
 * 所有 IPC 通信都通过此桥接进行，确保安全性
 */
const electronAPI = {
  /** 获取拖拽文件的路径 (Electron 33+ 替代 File.path) */
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  /** 选择PDF文件 */
  selectPdf: () => ipcRenderer.invoke('select-pdf'),

  /** 选择印章图片 */
  selectStamp: () => ipcRenderer.invoke('select-stamp'),

  /** 读取文件内容为ArrayBuffer */
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),

  /** 读取PDF文件并获取页数 */
  readPdf: (filePath: string) => ipcRenderer.invoke('read-pdf', filePath),

  /** 将印章写入PDF (传文件路径，避免ArrayBuffer IPC detach) */
  stampPdf: (params: {
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
  }) => ipcRenderer.invoke('stamp-pdf', params),

  /** 处理印章图片(调整大小等) */
  processStamp: (imageBase64: string, width: number, height: number) =>
    ipcRenderer.invoke('process-stamp', imageBase64, width, height),

  /** 保存文件 */
  saveFile: (data: Uint8Array, defaultName: string) =>
    ipcRenderer.invoke('save-file', data, defaultName),

  /** 批量处理PDF */
  batchProcess: (tasks: Array<{
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
  }>) => ipcRenderer.invoke('batch-process', { tasks }),

  /** 保存模板 */
  saveTemplate: (template: object) => ipcRenderer.invoke('save-template', template),

  /** 加载模板 */
  loadTemplate: (templateId: string) => ipcRenderer.invoke('load-template', templateId),

  /** 删除模板 */
  deleteTemplate: (templateId: string) => ipcRenderer.invoke('delete-template', templateId),

  /** 获取模板列表 */
  listTemplates: () => ipcRenderer.invoke('list-templates'),

  /** 在文件管理器中显示文件 */
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('show-item-in-folder', filePath),

  /** 保存印章库 */
  saveStamps: (stamps: object[]) => ipcRenderer.invoke('save-stamps', stamps),

  /** 加载印章库 */
  loadStamps: () => ipcRenderer.invoke('load-stamps'),

  /** 监听批量处理进度 */
  onBatchProgress: (callback: (progress: { taskId: string; progress: number; status: string; outputPath?: string; error?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: { taskId: string; progress: number; status: string; outputPath?: string; error?: string }) => {
      callback(progress)
    }
    ipcRenderer.on('batch-progress', handler)
    return () => {
      ipcRenderer.removeListener('batch-progress', handler)
    }
  },
}

/** 通过 contextBridge 将 API 暴露到 window.electronAPI */
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
