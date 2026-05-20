/**
 * 工具栏组件
 * 提供PDF选择、缩放、页面导航、模板管理等功能
 */

import { useStampStore } from '../stores/useStampStore'
import { arrayBufferToBase64, base64ToUint8Array, generateId } from '../utils/file'
import type { StampConfig, PageStamp, StampPosition } from '../types'

export function Toolbar() {
  const pdfFile = useStampStore((s) => s.pdfFile)
  const currentPage = useStampStore((s) => s.currentPage)
  const zoom = useStampStore((s) => s.zoom)
  const setCurrentPage = useStampStore((s) => s.setCurrentPage)
  const setZoom = useStampStore((s) => s.setZoom)
  const setPdfFile = useStampStore((s) => s.setPdfFile)
  const setPdfBuffer = useStampStore((s) => s.setPdfBuffer)
  const reset = useStampStore((s) => s.reset)
  const pageStamps = useStampStore((s) => s.pageStamps)
  const pdfBuffer = useStampStore((s) => s.pdfBuffer)
  const stampConfigs = useStampStore((s) => s.stampConfigs)

  /** 选择PDF文件 */
  const handleSelectPdf = async () => {
    const filePaths = await window.electronAPI.selectPdf()
    if (filePaths && filePaths.length > 0) {
      try {
        const { buffer, pageCount } = await window.electronAPI.readPdf(filePaths[0])
        setPdfBuffer(buffer)
        setPdfFile({
          filePath: filePaths[0],
          fileName: filePaths[0].split(/[/\\]/).pop() || 'document.pdf',
          pageCount,
          fileSize: 0,
        })
      } catch (err) {
        console.error('读取PDF失败:', err)
      }
    }
  }

  /** 导出盖章后的PDF */
  const handleExport = async () => {
    if (!pdfFile) return

    // 收集所有印章
    const allStamps: Array<{ imageBase64: string; position: StampPosition }> = []
    for (const [pageIdx, stamps] of Object.entries(pageStamps)) {
      for (const stamp of stamps) {
        const config = stampConfigs.find((c) => c.id === stamp.stampConfigId)
        if (config) {
          allStamps.push({
            imageBase64: config.imageBase64,
            position: stamp.position,
          })
        }
      }
    }

    if (allStamps.length === 0) {
      alert('请先放置印章')
      return
    }

    try {
      // 传文件路径给主进程，避免ArrayBuffer跨IPC传输detach
      const result = await window.electronAPI.stampPdf({
        filePath: pdfFile!.filePath,
        stamps: allStamps,
      })

      // 保存文件
      const defaultName = pdfFile?.fileName?.replace('.pdf', '_盖章.pdf') || 'output.pdf'
      await window.electronAPI.saveFile(result, defaultName)
    } catch (err) {
      console.error('导出失败:', err)
      alert('导出失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  /** 保存当前配置为模板 */
  const handleSaveTemplate = async () => {
    const template = useStampStore.getState().saveAsTemplate('模板_' + new Date().toLocaleDateString())
    const success = await window.electronAPI.saveTemplate(template)
    if (success) {
      const templates = await window.electronAPI.listTemplates()
      useStampStore.getState().setTemplates(templates)
      alert('模板保存成功')
    }
  }

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
      {/* 左侧: 文件操作 */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSelectPdf}
          className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
        >
          打开PDF
        </button>
        {pdfFile && (
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors"
          >
            导出PDF
          </button>
        )}
      </div>

      {/* 中间: 文件信息 */}
      {pdfFile && (
        <div className="flex items-center gap-4 flex-1 justify-center">
          <span className="text-sm text-gray-600 truncate max-w-48">
            {pdfFile.fileName}
          </span>

          {/* 页面导航 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 0}
              className="px-2 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              ‹
            </button>
            <span className="text-sm min-w-16 text-center">
              {currentPage + 1} / {pdfFile.pageCount}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= pdfFile.pageCount - 1}
              className="px-2 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              ›
            </button>
          </div>

          {/* 缩放控制 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(zoom - 0.1)}
              className="px-2 py-1 text-sm border rounded hover:bg-gray-50"
            >
              −
            </button>
            <span className="text-sm min-w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(zoom + 0.1)}
              className="px-2 py-1 text-sm border rounded hover:bg-gray-50"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* 右侧: 模板和重置 */}
      <div className="flex items-center gap-2">
        {pdfFile && (
          <>
            <button
              onClick={handleSaveTemplate}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 transition-colors"
            >
              保存模板
            </button>
            <button
              onClick={() => {
                reset()
              }}
              className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              重置
            </button>
          </>
        )}
      </div>
    </div>
  )
}
