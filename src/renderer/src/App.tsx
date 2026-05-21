/**
 * 应用主组件
 * 整合所有子模块，提供完整的PDF盖章工作流
 */

import { useEffect } from 'react'
import { useStampStore } from './stores/useStampStore'
import { Toolbar } from './components/Toolbar'
import { PdfPreview } from './components/PdfPreview'
import { StampPanel } from './components/StampPanel'
import { BatchPanel } from './components/BatchPanel'

/**
 * 应用主组件
 * 布局: 顶部工具栏 + 左侧PDF预览 + 右侧印章面板
 */
export default function App() {
  const pdfFile = useStampStore((s) => s.pdfFile)
  const stampConfigs = useStampStore((s) => s.stampConfigs)

  // 初始化时加载模板列表和印章库
  useEffect(() => {
    window.electronAPI.listTemplates().then((templates) => {
      useStampStore.getState().setTemplates(templates)
      const defaultTpl = templates.find((t) => t.isDefault)
      if (defaultTpl) {
        useStampStore.getState().setDefaultTemplateId(defaultTpl.id)
      }
    })
    window.electronAPI.loadStamps().then((stamps) => {
      if (stamps && stamps.length > 0) {
        useStampStore.getState().setStampConfigs(stamps)
      }
    })
  }, [])

  // 印章库变化时自动保存
  useEffect(() => {
    if (stampConfigs.length > 0) {
      window.electronAPI.saveStamps(stampConfigs)
    }
  }, [stampConfigs])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <Toolbar />

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧: PDF预览区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {pdfFile ? (
            <PdfPreview />
          ) : (
            <EmptyState />
          )}
        </div>

        {/* 右侧: 印章面板 */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          <StampPanel />
        </div>
      </div>

      {/* 批量处理面板 (底部) */}
      <BatchPanel />
    </div>
  )
}

/**
 * 空状态组件 - 未加载PDF时显示
 */
function EmptyState() {
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const pdfFile = files.find((f) => f.name.endsWith('.pdf'))
    if (pdfFile) {
      // 通过Electron API获取文件路径 (Electron 33+ 需要使用 webUtils)
      const filePath = window.electronAPI.getPathForFile(pdfFile)
      if (filePath) {
        try {
          const { buffer, pageCount } = await window.electronAPI.readPdf(filePath)
          useStampStore.getState().setPdfBuffer(buffer)
          useStampStore.getState().setPdfFile({
            filePath,
            fileName: pdfFile.name,
            pageCount,
            fileSize: pdfFile.size,
          })
        } catch (err) {
          console.error('读取PDF失败:', err)
        }
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleClick = async () => {
    const filePaths = await window.electronAPI.selectPdf()
    if (filePaths && filePaths.length > 0) {
      try {
        const { buffer, pageCount } = await window.electronAPI.readPdf(filePaths[0])
        useStampStore.getState().setPdfBuffer(buffer)
        useStampStore.getState().setPdfFile({
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

  return (
    <div
      className="flex-1 flex items-center justify-center"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div
        className="text-center p-12 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all max-w-md"
        onClick={handleClick}
      >
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          拖拽PDF文件到此处
        </h2>
        <p className="text-gray-500 mb-4">
          或点击选择PDF文件开始盖章
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
          选择PDF文件
        </div>
      </div>
    </div>
  )
}
