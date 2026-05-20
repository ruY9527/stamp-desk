/**
 * 批量处理面板组件
 * 支持批量导入PDF文件，按模板或当前印章批量盖章
 */

import { useState, useEffect } from 'react'
import { useStampStore } from '../stores/useStampStore'
import { generateId } from '../utils/file'
import type { BatchTask, StampPosition, PageStamp } from '../types'

export function BatchPanel() {
  const batchTasks = useStampStore((s) => s.batchTasks)
  const addBatchTask = useStampStore((s) => s.addBatchTask)
  const updateBatchTask = useStampStore((s) => s.updateBatchTask)
  const clearBatchTasks = useStampStore((s) => s.clearBatchTasks)
  const pageStamps = useStampStore((s) => s.pageStamps)
  const stampConfigs = useStampStore((s) => s.stampConfigs)
  const templates = useStampStore((s) => s.templates)
  const defaultTemplateId = useStampStore((s) => s.defaultTemplateId)

  const [expanded, setExpanded] = useState(false)
  const [processing, setProcessing] = useState(false)

  // 监听批量处理进度
  useEffect(() => {
    const unsubscribe = window.electronAPI.onBatchProgress((progress) => {
      updateBatchTask(progress.taskId, {
        progress: progress.progress,
        status: progress.status as BatchTask['status'],
        outputPath: progress.outputPath,
        error: progress.error,
      })
    })
    return unsubscribe
  }, [updateBatchTask])

  /** 获取应该自动关联的模板ID */
  const getAutoTemplateId = (): string | undefined => {
    if (defaultTemplateId) return defaultTemplateId
    if (templates.length === 1) return templates[0].id
    return undefined
  }

  /** 将 PageStamp[] 转换为导出用的印章参数 */
  const resolveStamps = (stamps: PageStamp[]): Array<{ imageBase64: string; position: StampPosition }> => {
    const result: Array<{ imageBase64: string; position: StampPosition }> = []
    for (const stamp of stamps) {
      const config = stampConfigs.find((c) => c.id === stamp.stampConfigId)
      if (config) {
        result.push({ imageBase64: config.imageBase64, position: stamp.position })
      }
    }
    return result
  }

  /** 获取当前页面的印章 */
  const getCurrentPageStamps = (): Array<{ imageBase64: string; position: StampPosition }> => {
    const allStamps: PageStamp[] = Object.values(pageStamps).flat()
    return resolveStamps(allStamps)
  }

  /** 添加批量任务(选择多个PDF) */
  const handleAddTasks = async () => {
    const filePaths = await window.electronAPI.selectPdf()
    if (!filePaths) return

    const autoTemplateId = getAutoTemplateId()

    for (const filePath of filePaths) {
      try {
        const { pageCount } = await window.electronAPI.readPdf(filePath)
        addBatchTask({
          id: generateId(),
          pdfFile: {
            filePath,
            fileName: filePath.split(/[/\\]/).pop() || 'document.pdf',
            pageCount,
            fileSize: 0,
          },
          status: 'pending',
          progress: 0,
          templateId: autoTemplateId,
        })
      } catch (err) {
        console.error('读取PDF失败:', filePath, err)
      }
    }
    setExpanded(true)
  }

  /** 修改任务关联的模板 */
  const handleChangeTemplate = (taskId: string, templateId: string) => {
    updateBatchTask(taskId, { templateId: templateId || undefined })
  }

  /** 开始批量处理 */
  const handleStartBatch = async () => {
    const pendingTasks = batchTasks.filter((t) => t.status === 'pending')
    if (pendingTasks.length === 0) return

    // 检查每个任务是否有印章来源
    const tasksWithStamps: Array<{
      taskId: string
      pdfPath: string
      stamps: Array<{ imageBase64: string; position: StampPosition }>
      outputPath: string
    }> = []

    for (const task of pendingTasks) {
      let stamps: Array<{ imageBase64: string; position: StampPosition }> = []

      if (task.templateId) {
        // 从模板获取印章
        const tpl = templates.find((t) => t.id === task.templateId)
        if (tpl) {
          stamps = resolveStamps(tpl.stamps)
        }
      }

      // 模板无印章时回退到当前页面印章
      if (stamps.length === 0) {
        stamps = getCurrentPageStamps()
      }

      if (stamps.length === 0) {
        alert(`文件 "${task.pdfFile.fileName}" 没有可用的印章：请关联模板或在当前PDF上放置印章`)
        return
      }

      tasksWithStamps.push({
        taskId: task.id,
        pdfPath: task.pdfFile.filePath,
        stamps,
        outputPath: task.pdfFile.filePath.replace('.pdf', '_盖章.pdf'),
      })
    }

    setProcessing(true)
    try {
      await window.electronAPI.batchProcess(tasksWithStamps)
    } catch (err) {
      console.error('批量处理失败:', err)
    } finally {
      setProcessing(false)
    }
  }

  const pendingCount = batchTasks.filter((t) => t.status === 'pending').length
  const completedCount = batchTasks.filter((t) => t.status === 'completed').length

  return (
    <div className="bg-white border-t border-gray-200">
      {/* 折叠头 */}
      <div
        className="h-10 px-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">批量处理</span>
          {batchTasks.length > 0 && (
            <span className="text-xs text-gray-400">
              {completedCount}/{batchTasks.length} 完成
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAddTasks()
            }}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
          >
            添加文件
          </button>
          {batchTasks.length > 0 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartBatch()
                }}
                disabled={processing || pendingCount === 0}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {processing ? '处理中...' : '开始处理'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearBatchTasks()
                }}
                className="px-2 py-1 text-xs text-red-500 hover:underline"
              >
                清空
              </button>
            </>
          )}
          <span className="text-xs text-gray-400">{expanded ? '▼' : '▲'}</span>
        </div>
      </div>

      {/* 展开的任务列表 */}
      {expanded && batchTasks.length > 0 && (
        <div className="max-h-60 overflow-auto border-t border-gray-100">
          {batchTasks.map((task) => (
            <div
              key={task.id}
              className="px-4 py-2 flex items-center gap-3 border-b border-gray-50 last:border-0"
            >
              {/* 状态图标 */}
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                {task.status === 'pending' && (
                  <div className="w-3 h-3 border border-gray-300 rounded-full" />
                )}
                {task.status === 'processing' && (
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
                {task.status === 'completed' && (
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                )}
                {task.status === 'failed' && (
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                )}
              </div>

              {/* 文件名 */}
              <span className="text-sm flex-1 truncate min-w-0">{task.pdfFile.fileName}</span>

              {/* 模板选择 */}
              {task.status === 'pending' && (
                <select
                  value={task.templateId || ''}
                  onChange={(e) => handleChangeTemplate(task.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded px-1 py-0.5 max-w-32 truncate flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">当前印章</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                      {defaultTemplateId === tpl.id ? ' ★' : ''}
                    </option>
                  ))}
                </select>
              )}

              {/* 进度/结果 */}
              {task.status === 'completed' && task.outputPath ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    window.electronAPI.showItemInFolder(task.outputPath!)
                  }}
                  className="text-xs text-green-600 hover:underline flex-shrink-0 max-w-48 truncate"
                  title={task.outputPath}
                >
                  完成 · 打开文件
                </button>
              ) : task.status === 'failed' ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    alert(task.error || '未知错误')
                  }}
                  className="text-xs text-red-500 hover:underline flex-shrink-0"
                  title={task.error}
                >
                  失败 · 查看错误
                </button>
              ) : (
                <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">
                  {task.progress}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {expanded && batchTasks.length === 0 && (
        <div className="px-4 py-6 text-center text-sm text-gray-400">
          暂无批量任务，点击"添加文件"导入PDF
        </div>
      )}
    </div>
  )
}
