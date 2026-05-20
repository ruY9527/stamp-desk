/**
 * 印章面板组件
 * 管理印章库、模板、骑缝章配置
 */

import { useState } from 'react'
import { useStampStore } from '../stores/useStampStore'
import { fileToBase64, generateId } from '../utils/file'
import type { StampConfig, CrossPageStampConfig } from '../types'

export function StampPanel() {
  const stampConfigs = useStampStore((s) => s.stampConfigs)
  const selectedStampId = useStampStore((s) => s.selectedStampId)
  const selectStamp = useStampStore((s) => s.selectStamp)
  const addStampConfig = useStampStore((s) => s.addStampConfig)
  const removeStampConfig = useStampStore((s) => s.removeStampConfig)
  const templates = useStampStore((s) => s.templates)
  const loadFromTemplate = useStampStore((s) => s.loadFromTemplate)
  const deleteTemplate = useStampStore((s) => s.deleteTemplate)
  const defaultTemplateId = useStampStore((s) => s.defaultTemplateId)
  const setDefaultTemplateId = useStampStore((s) => s.setDefaultTemplateId)
  const crossPageStamps = useStampStore((s) => s.crossPageStamps)
  const addCrossPageStamp = useStampStore((s) => s.addCrossPageStamp)
  const removeCrossPageStamp = useStampStore((s) => s.removeCrossPageStamp)
  const pdfFile = useStampStore((s) => s.pdfFile)

  const [activeTab, setActiveTab] = useState<'stamps' | 'templates' | 'crosspage'>('stamps')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editingTemplateName, setEditingTemplateName] = useState('')
  const [viewingTemplateId, setViewingTemplateId] = useState<string | null>(null)

  /** 添加印章(从文件选择) */
  const handleAddStamp = async () => {
    const filePath = await window.electronAPI.selectStamp()
    if (!filePath) return

    // 读取文件并转换为base64，保留原始图片不压缩
    const buffer = await window.electronAPI.readFile(filePath)
    const base64 = arrayBufferToBase64(buffer)

    // 获取图片实际尺寸
    const { width, height } = await getImageSize(base64)

    const config: StampConfig = {
      id: generateId(),
      name: filePath.split(/[/\\]/).pop() || '印章',
      imageBase64: base64,
      imagePath: filePath,
      defaultWidth: width,
      defaultHeight: height,
    }

    addStampConfig(config)
  }

  /** 删除模板 */
  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定删除此模板？')) return
    await window.electronAPI.deleteTemplate(templateId)
    deleteTemplate(templateId)
  }

  /** 开始重命名模板 */
  const handleStartRename = (tpl: { id: string; name: string }, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTemplateId(tpl.id)
    setEditingTemplateName(tpl.name)
  }

  /** 切换默认模板 */
  const handleToggleDefault = async (templateId: string) => {
    const newDefaultId = defaultTemplateId === templateId ? null : templateId
    setDefaultTemplateId(newDefaultId)
    // 同步更新模板的 isDefault 字段并持久化
    const currentTemplates = useStampStore.getState().templates
    for (const t of currentTemplates) {
      const updated = { ...t, isDefault: t.id === newDefaultId }
      await window.electronAPI.saveTemplate(updated)
    }
    const fresh = await window.electronAPI.listTemplates()
    useStampStore.getState().setTemplates(fresh)
  }

  /** 保存重命名 */
  const handleSaveRename = async (templateId: string) => {
    if (!editingTemplateName.trim()) {
      setEditingTemplateId(null)
      return
    }
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    const updated = { ...tpl, name: editingTemplateName.trim() }
    await window.electronAPI.saveTemplate(updated)
    const fresh = await window.electronAPI.listTemplates()
    useStampStore.getState().setTemplates(fresh)
    setEditingTemplateId(null)
  }

  /** 添加骑缝章 */
  const handleAddCrossPageStamp = () => {
    if (!selectedStampId || !pdfFile) return
    const config: CrossPageStampConfig = {
      stampConfigId: selectedStampId,
      side: 'right',
      heightPercent: 0.3,
      topPercent: 0.35,
    }
    addCrossPageStamp(config)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'stamps', label: '印章库' },
          { key: 'templates', label: '模板' },
          { key: 'crosspage', label: '骑缝章' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-auto p-3">
        {/* 印章库 */}
        {activeTab === 'stamps' && (
          <div className="space-y-3">
            <button
              onClick={handleAddStamp}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              + 添加印章图片
            </button>

            <div className="grid grid-cols-2 gap-2">
              {stampConfigs.map((config) => (
                <div
                  key={config.id}
                  onClick={() =>
                    selectStamp(selectedStampId === config.id ? null : config.id)
                  }
                  className={`relative p-2 border rounded-lg cursor-pointer transition-all group ${
                    selectedStampId === config.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={`data:image/png;base64,${config.imageBase64}`}
                    alt={config.name}
                    className="w-full aspect-square object-contain"
                    draggable={false}
                  />
                  <p className="text-xs text-gray-600 mt-1 truncate">{config.name}</p>
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // 检查是否有模板引用此印章
                      const referencingTemplates = templates.filter((tpl) =>
                        tpl.stamps.some((s) => s.stampConfigId === config.id)
                      )
                      if (referencingTemplates.length > 0) {
                        const names = referencingTemplates.map((t) => `"${t.name}"`).join('、')
                        alert(`无法删除，该印章被以下模板引用：${names}\n请先删除相关模板`)
                        return
                      }
                      removeStampConfig(config.id)
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {stampConfigs.length > 0 && (
              <p className="text-xs text-gray-400 text-center">
                点击选中印章，然后在PDF上点击放置
              </p>
            )}
          </div>
        )}

        {/* 模板列表 */}
        {activeTab === 'templates' && !viewingTemplateId && (
          <div className="space-y-2">
            {templates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                暂无保存的模板
              </p>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer group"
                  onClick={() => setViewingTemplateId(tpl.id)}
                >
                  {editingTemplateId === tpl.id ? (
                    <input
                      type="text"
                      value={editingTemplateName}
                      onChange={(e) => setEditingTemplateName(e.target.value)}
                      onBlur={() => handleSaveRename(tpl.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(tpl.id)
                        if (e.key === 'Escape') setEditingTemplateId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full text-sm font-medium border border-blue-400 rounded px-1 py-0.5 outline-none"
                    />
                  ) : (
                    <p className="text-sm font-medium">{tpl.name}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400">
                      {tpl.stamps.length} 个印章 ·{' '}
                      {new Date(tpl.createdAt).toLocaleDateString()}
                      {defaultTemplateId === tpl.id && (
                        <span className="ml-1 text-amber-600">★ 默认</span>
                      )}
                    </p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartRename(tpl, e)}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        重命名
                      </button>
                      <button
                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 模板详情 */}
        {activeTab === 'templates' && viewingTemplateId && (() => {
          const tpl = templates.find((t) => t.id === viewingTemplateId)
          if (!tpl) {
            setViewingTemplateId(null)
            return null
          }
          // 按页码分组
          const stampsByPage: Record<number, typeof tpl.stamps> = {}
          for (const stamp of tpl.stamps) {
            const page = stamp.position.pageIndex
            if (!stampsByPage[page]) stampsByPage[page] = []
            stampsByPage[page].push(stamp)
          }
          const sortedPages = Object.keys(stampsByPage).map(Number).sort((a, b) => a - b)

          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingTemplateId(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← 返回
                </button>
                <h3 className="text-sm font-semibold flex-1 truncate">{tpl.name}</h3>
              </div>

              <div className="text-xs text-gray-400">
                {tpl.stamps.length} 个印章 · 创建于 {new Date(tpl.createdAt).toLocaleString()}
              </div>

              {sortedPages.map((pageIdx) => (
                <div key={pageIdx} className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-500">第 {pageIdx + 1} 页</h4>
                  {stampsByPage[pageIdx].map((stamp, i) => {
                    const config = stampConfigs.find((c) => c.id === stamp.stampConfigId)
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 border border-gray-100 rounded bg-gray-50"
                      >
                        {config ? (
                          <img
                            src={`data:image/png;base64,${config.imageBase64}`}
                            alt={config.name}
                            className="w-10 h-10 object-contain flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                            ?
                          </div>
                        )}
                        <div className="text-xs text-gray-600 min-w-0">
                          <p className="truncate">{config?.name || '已删除的印章'}</p>
                          <p className="text-gray-400">
                            位置: ({Math.round(stamp.position.x * 100)}%, {Math.round(stamp.position.y * 100)}%)
                            {stamp.position.rotation !== 0 && ` · 旋转${stamp.position.rotation}°`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}

              <button
                onClick={() => handleToggleDefault(tpl.id)}
                className={`w-full py-2 text-sm rounded-lg transition-colors ${
                  defaultTemplateId === tpl.id
                    ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {defaultTemplateId === tpl.id ? '★ 默认模板 (点击取消)' : '设为默认模板'}
              </button>

              <button
                onClick={() => {
                  loadFromTemplate(tpl)
                  setViewingTemplateId(null)
                }}
                className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
              >
                应用模板
              </button>
            </div>
          )
        })()}

        {/* 骑缝章配置 */}
        {activeTab === 'crosspage' && (
          <div className="space-y-3">
            <button
              onClick={handleAddCrossPageStamp}
              disabled={!selectedStampId}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + 添加骑缝章
            </button>

            {!selectedStampId && stampConfigs.length > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                请先在印章库中选中一个印章
              </p>
            )}

            {crossPageStamps.map((cps, index) => {
              const config = stampConfigs.find((c) => c.id === cps.stampConfigId)
              return (
                <div
                  key={index}
                  className="p-3 border border-gray-200 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {config?.name || '未知印章'}
                    </span>
                    <button
                      onClick={() => removeCrossPageStamp(index)}
                      className="text-red-500 text-xs hover:underline"
                    >
                      删除
                    </button>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      {cps.side === 'left' ? '左侧' : '右侧'}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      高度: {Math.round(cps.heightPercent * 100)}%
                    </span>
                  </div>
                </div>
              )
            })}

            {crossPageStamps.length > 0 && (
              <p className="text-xs text-gray-400">
                骑缝章将在导出PDF时自动应用到所有页面
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** ArrayBuffer转Base64 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/** 获取图片原始尺寸 */
function getImageSize(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = () => resolve({ width: 200, height: 200 })
    img.src = `data:image/png;base64,${base64}`
  })
}

/** 使用canvas调整图片大小(替代sharp) */
function resizeImageWithCanvas(base64: string, targetWidth: number, targetHeight: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, targetWidth, targetHeight)
      // 保持宽高比居中绘制
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height)
      const drawWidth = img.width * scale
      const drawHeight = img.height * scale
      const drawX = (targetWidth - drawWidth) / 2
      const drawY = (targetHeight - drawHeight) / 2
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
      // 导出为PNG base64 (去掉data:image/png;base64,前缀)
      const dataUrl = canvas.toDataURL('image/png')
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = () => resolve(base64)
    img.src = `data:image/png;base64,${base64}`
  })
}
