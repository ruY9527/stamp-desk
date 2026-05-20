/**
 * 全局类型定义
 * 定义应用中使用的所有 TypeScript 类型
 */

/** 印章位置信息 */
export interface StampPosition {
  /** 距离PDF页面左侧的百分比 (0-1) */
  x: number
  /** 距离PDF页面顶部的百分比 (0-1) */
  y: number
  /** 印章宽度(px) */
  width: number
  /** 印章高度(px) */
  height: number
  /** 旋转角度(度) */
  rotation: number
  /** 目标页码 (从0开始) */
  pageIndex: number
}

/** 印章配置 */
export interface StampConfig {
  /** 唯一标识 */
  id: string
  /** 印章名称 */
  name: string
  /** 印章图片的Base64编码 */
  imageBase64: string
  /** 印章图片路径 */
  imagePath?: string
  /** 默认宽度 */
  defaultWidth: number
  /** 默认高度 */
  defaultHeight: number
}

/** PDF文件信息 */
export interface PdfFileInfo {
  /** 文件路径 */
  filePath: string
  /** 文件名 */
  fileName: string
  /** 页数 */
  pageCount: number
  /** 文件大小(bytes) */
  fileSize: number
}

/** 页面印章记录 */
export interface PageStamp {
  /** 印章配置ID */
  stampConfigId: string
  /** 位置信息 */
  position: StampPosition
}

/** 模板配置 */
export interface StampTemplate {
  /** 模板ID */
  id: string
  /** 模板名称 */
  name: string
  /** 印章列表 */
  stamps: PageStamp[]
  /** 创建时间 */
  createdAt: number
  /** 是否为默认模板 */
  isDefault?: boolean
}

/** 骑缝章配置 */
export interface CrossPageStampConfig {
  /** 印章配置ID */
  stampConfigId: string
  /** 位置: left | right */
  side: 'left' | 'right'
  /** 印章高度百分比 (0-1) */
  heightPercent: number
  /** 距离顶部百分比 (0-1) */
  topPercent: number
}

/** 批量处理任务状态 */
export type BatchTaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

/** 批量处理任务 */
export interface BatchTask {
  /** 任务ID */
  id: string
  /** PDF文件信息 */
  pdfFile: PdfFileInfo
  /** 任务状态 */
  status: BatchTaskStatus
  /** 进度百分比 (0-100) */
  progress: number
  /** 关联的模板ID */
  templateId?: string
  /** 错误信息 */
  error?: string
  /** 输出路径 */
  outputPath?: string
}

/** IPC 通道枚举 */
export enum IpcChannels {
  /** 选择PDF文件 */
  SELECT_PDF = 'select-pdf',
  /** 选择印章图片 */
  SELECT_STAMP = 'select-stamp',
  /** 读取文件为Buffer */
  READ_FILE = 'read-file',
  /** 读取PDF文件 */
  READ_PDF = 'read-pdf',
  /** 写入印章到PDF */
  STAMP_PDF = 'stamp-pdf',
  /** 处理印章图片 */
  PROCESS_STAMP = 'process-stamp',
  /** 保存文件 */
  SAVE_FILE = 'save-file',
  /** 批量处理 */
  BATCH_PROCESS = 'batch-process',
  /** 保存模板 */
  SAVE_TEMPLATE = 'save-template',
  /** 加载模板 */
  LOAD_TEMPLATE = 'load-template',
  /** 获取模板列表 */
  LIST_TEMPLATES = 'list-templates',
}

/** Electron API 类型 (通过 contextBridge 暴露) */
export interface ElectronAPI {
  /** 选择PDF文件，返回文件路径 */
  selectPdf: () => Promise<string | null>
  /** 选择印章图片，返回文件路径 */
  selectStamp: () => Promise<string | null>
  /** 读取文件内容为ArrayBuffer */
  readFile: (filePath: string) => Promise<ArrayBuffer>
  /** 读取PDF文件并返回页数信息 */
  readPdf: (filePath: string) => Promise<{ buffer: ArrayBuffer; pageCount: number }>
  /** 将印章写入PDF */
  stampPdf: (params: StampPdfParams) => Promise<Uint8Array>
  /** 处理印章图片(调整大小、压缩等) */
  processStamp: (imageBase64: string, width: number, height: number) => Promise<string>
  /** 保存文件到指定路径 */
  saveFile: (data: Uint8Array, defaultName: string) => Promise<string | null>
  /** 批量处理PDF */
  batchProcess: (tasks: BatchTaskParams[]) => Promise<BatchResult[]>
  /** 在文件管理器中显示文件 */
  showItemInFolder: (filePath: string) => Promise<void>
  /** 保存模板 */
  saveTemplate: (template: StampTemplate) => Promise<boolean>
  /** 加载模板 */
  loadTemplate: (templateId: string) => Promise<StampTemplate | null>
  /** 删除模板 */
  deleteTemplate: (templateId: string) => Promise<boolean>
  /** 获取模板列表 */
  listTemplates: () => Promise<StampTemplate[]>
  /** 监听批量处理进度 */
  onBatchProgress: (callback: (progress: BatchProgress) => void) => () => void
}

/** 写入印章的参数 */
export interface StampPdfParams {
  /** PDF文件路径 */
  filePath: string
  /** 印章位置列表 */
  stamps: Array<{
    /** 印章图片Base64 */
    imageBase64: string
    /** 位置信息 */
    position: StampPosition
  }>
}

/** 批量处理任务参数 */
export interface BatchTaskParams {
  /** PDF文件路径 */
  pdfPath: string
  /** 印章配置列表 */
  stamps: Array<{
    imageBase64: string
    position: StampPosition
  }>
  /** 输出路径 */
  outputPath: string
}

/** 批量处理结果 */
export interface BatchResult {
  /** 任务ID */
  taskId: string
  /** 是否成功 */
  success: boolean
  /** 输出路径 */
  outputPath?: string
  /** 错误信息 */
  error?: string
}

/** 批量处理进度 */
export interface BatchProgress {
  /** 任务ID */
  taskId: string
  /** 进度百分比 (0-100) */
  progress: number
  /** 状态 */
  status: BatchTaskStatus
  /** 输出路径 */
  outputPath?: string
  /** 错误信息 */
  error?: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
