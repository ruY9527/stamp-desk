/**
 * Zustand 全局状态管理
 * 管理PDF文件、印章、页面状态等所有应用状态
 */

import { create } from 'zustand'
import type { PdfFileInfo, StampConfig, PageStamp, StampTemplate, BatchTask, CrossPageStampConfig } from '@/types'

/** 应用状态接口 */
interface StampState {
  // === PDF 相关 ===
  /** 当前PDF文件信息 */
  pdfFile: PdfFileInfo | null
  /** PDF文件的ArrayBuffer */
  pdfBuffer: ArrayBuffer | null
  /** 当前页码 (从0开始) */
  currentPage: number
  /** 缩放比例 */
  zoom: number

  // === 印章相关 ===
  /** 已加载的印章配置列表 */
  stampConfigs: StampConfig[]
  /** 当前选中的印章ID */
  selectedStampId: string | null
  /** 各页面上的印章记录 */
  pageStamps: Record<number, PageStamp[]>
  /** 骑缝章配置 */
  crossPageStamps: CrossPageStampConfig[]

  // === 批量处理 ===
  /** 批量处理任务列表 */
  batchTasks: BatchTask[]

  // === 模板 ===
  /** 已保存的模板列表 */
  templates: StampTemplate[]
  /** 默认模板ID */
  defaultTemplateId: string | null

  // === 操作 ===
  /** 设置PDF文件信息 */
  setPdfFile: (file: PdfFileInfo | null) => void
  /** 设置PDF Buffer */
  setPdfBuffer: (buffer: ArrayBuffer | null) => void
  /** 设置当前页码 */
  setCurrentPage: (page: number) => void
  /** 设置缩放比例 */
  setZoom: (zoom: number) => void
  /** 添加印章配置 */
  addStampConfig: (config: StampConfig) => void
  /** 设置印章配置列表(替换) */
  setStampConfigs: (configs: StampConfig[]) => void
  /** 移除印章配置 */
  removeStampConfig: (id: string) => void
  /** 选中印章 */
  selectStamp: (id: string | null) => void
  /** 在页面上放置印章 */
  placeStamp: (pageIndex: number, stamp: PageStamp) => void
  /** 移除页面上的印章 */
  removePageStamp: (pageIndex: number, stampIndex: number) => void
  /** 更新印章位置 */
  updateStampPosition: (pageIndex: number, stampIndex: number, position: PageStamp['position']) => void
  /** 添加骑缝章配置 */
  addCrossPageStamp: (config: CrossPageStampConfig) => void
  /** 移除骑缝章配置 */
  removeCrossPageStamp: (index: number) => void
  /** 添加批量任务 */
  addBatchTask: (task: BatchTask) => void
  /** 更新批量任务状态 */
  updateBatchTask: (id: string, updates: Partial<BatchTask>) => void
  /** 清空批量任务 */
  clearBatchTasks: () => void
  /** 设置模板列表 */
  setTemplates: (templates: StampTemplate[]) => void
  /** 设置默认模板ID */
  setDefaultTemplateId: (id: string | null) => void
  /** 删除模板 */
  deleteTemplate: (templateId: string) => void
  /** 从模板加载印章 */
  loadFromTemplate: (template: StampTemplate) => void
  /** 保存当前状态为模板 */
  saveAsTemplate: (name: string) => StampTemplate
  /** 重置所有状态 */
  reset: () => void
}

/** 初始状态 */
const initialState = {
  pdfFile: null,
  pdfBuffer: null,
  currentPage: 0,
  zoom: 1,
  stampConfigs: [],
  selectedStampId: null,
  pageStamps: {},
  crossPageStamps: [],
  batchTasks: [],
  templates: [],
  defaultTemplateId: null,
}

/**
 * 创建 Zustand Store
 */
export const useStampStore = create<StampState>((set, get) => ({
  ...initialState,

  setPdfFile: (file) => set({ pdfFile: file, currentPage: 0 }),

  setPdfBuffer: (buffer) => set({ pdfBuffer: buffer }),

  setCurrentPage: (page) => {
    const { pdfFile } = get()
    if (pdfFile && page >= 0 && page < pdfFile.pageCount) {
      set({ currentPage: page })
    }
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3, zoom)) }),

  addStampConfig: (config) =>
    set((state) => ({
      stampConfigs: [...state.stampConfigs, config],
    })),

  setStampConfigs: (configs) => set({ stampConfigs: configs }),

  removeStampConfig: (id) =>
    set((state) => ({
      stampConfigs: state.stampConfigs.filter((c) => c.id !== id),
      selectedStampId: state.selectedStampId === id ? null : state.selectedStampId,
    })),

  selectStamp: (id) => set({ selectedStampId: id }),

  placeStamp: (pageIndex, stamp) =>
    set((state) => ({
      pageStamps: {
        ...state.pageStamps,
        [pageIndex]: [...(state.pageStamps[pageIndex] || []), stamp],
      },
    })),

  removePageStamp: (pageIndex, stampIndex) =>
    set((state) => ({
      pageStamps: {
        ...state.pageStamps,
        [pageIndex]: (state.pageStamps[pageIndex] || []).filter((_, i) => i !== stampIndex),
      },
    })),

  updateStampPosition: (pageIndex, stampIndex, position) =>
    set((state) => {
      const stamps = [...(state.pageStamps[pageIndex] || [])]
      stamps[stampIndex] = { ...stamps[stampIndex], position }
      return {
        pageStamps: {
          ...state.pageStamps,
          [pageIndex]: stamps,
        },
      }
    }),

  addCrossPageStamp: (config) =>
    set((state) => ({
      crossPageStamps: [...state.crossPageStamps, config],
    })),

  removeCrossPageStamp: (index) =>
    set((state) => ({
      crossPageStamps: state.crossPageStamps.filter((_, i) => i !== index),
    })),

  addBatchTask: (task) =>
    set((state) => ({
      batchTasks: [...state.batchTasks, task],
    })),

  updateBatchTask: (id, updates) =>
    set((state) => ({
      batchTasks: state.batchTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  clearBatchTasks: () => set({ batchTasks: [] }),

  setTemplates: (templates) => set({ templates }),

  setDefaultTemplateId: (id) => set({ defaultTemplateId: id }),

  deleteTemplate: (templateId) =>
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== templateId),
      defaultTemplateId: state.defaultTemplateId === templateId ? null : state.defaultTemplateId,
    })),

  loadFromTemplate: (template) => {
    const stampsByPage: Record<number, PageStamp[]> = {}
    for (const stamp of template.stamps) {
      const page = stamp.position.pageIndex
      if (!stampsByPage[page]) stampsByPage[page] = []
      stampsByPage[page].push(stamp)
    }
    set({ pageStamps: stampsByPage })
  },

  saveAsTemplate: (name) => {
    const { pageStamps } = get()
    const allStamps: PageStamp[] = Object.values(pageStamps).flat()
    const template: StampTemplate = {
      id: `tpl_${Date.now()}`,
      name,
      stamps: allStamps,
      createdAt: Date.now(),
    }
    return template
  },

  reset: () => set(initialState),
}))
