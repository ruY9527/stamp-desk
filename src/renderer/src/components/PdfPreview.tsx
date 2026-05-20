/**
 * PDF预览组件
 * 使用 pdf.js 渲染PDF页面，支持缩放和印章拖拽放置
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useStampStore } from '../stores/useStampStore'
import { StampOverlay } from './StampOverlay'

// 设置pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export function PdfPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfBuffer = useStampStore((s) => s.pdfBuffer)
  const currentPage = useStampStore((s) => s.currentPage)
  const zoom = useStampStore((s) => s.zoom)
  const selectedStampId = useStampStore((s) => s.selectedStampId)
  const stampConfigs = useStampStore((s) => s.stampConfigs)
  const placeStamp = useStampStore((s) => s.placeStamp)
  const pageStamps = useStampStore((s) => s.pageStamps)

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [rendering, setRendering] = useState(false)

  // 加载PDF文档
  useEffect(() => {
    if (!pdfBuffer) return
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer })
    loadingTask.promise.then(setPdfDoc)
    return () => {
      loadingTask.destroy()
    }
  }, [pdfBuffer])

  // 渲染当前页面
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return

    let cancelled = false

    const renderPage = async () => {
      setRendering(true)
      const page = await pdfDoc.getPage(currentPage + 1) // pdf.js 页码从1开始
      const viewport = page.getViewport({ scale: zoom * 1.5 }) // 基础分辨率1.5x

      const canvas = canvasRef.current!
      const context = canvas.getContext('2d')!
      canvas.height = viewport.height
      canvas.width = viewport.width

      setCanvasSize({ width: viewport.width, height: viewport.height })

      await page.render({
        canvasContext: context,
        viewport,
      }).promise

      if (!cancelled) {
        setRendering(false)
      }
    }

    renderPage()

    return () => {
      cancelled = true
    }
  }, [pdfDoc, currentPage, zoom])

  /** 点击PDF页面放置印章 */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedStampId || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // 转换为归一化坐标
      const normX = x / canvasSize.width
      const normY = y / canvasSize.height

      const config = stampConfigs.find((c) => c.id === selectedStampId)
      if (!config) return

      // 印章归一化尺寸 (默认占页面宽度的15%)
      const stampNormWidth = 0.15
      const stampNormHeight = (config.defaultHeight / config.defaultWidth) * stampNormWidth

      const position = {
        x: normX - stampNormWidth / 2,
        y: normY - stampNormHeight / 2,
        width: stampNormWidth,
        height: stampNormHeight,
        rotation: 0,
        pageIndex: currentPage,
      }

      placeStamp(currentPage, {
        stampConfigId: selectedStampId,
        position,
      })
    },
    [selectedStampId, canvasSize, stampConfigs, currentPage, placeStamp]
  )

  const currentPageStamps = pageStamps[currentPage] || []

  return (
    <div className="flex-1 overflow-auto bg-gray-100 p-4" ref={containerRef}>
      <div className="flex justify-center">
        <div
          className="relative inline-block shadow-lg stamp-drop-zone"
          onClick={handleCanvasClick}
        >
          <canvas ref={canvasRef} className="block bg-white" />

          {/* 渲染中指示器 */}
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
              <div className="text-sm text-gray-500">渲染中...</div>
            </div>
          )}

          {/* 印章覆盖层 */}
          {canvasSize.width > 0 &&
            currentPageStamps.map((stamp, index) => {
              const config = stampConfigs.find((c) => c.id === stamp.stampConfigId)
              if (!config) return null
              return (
                <StampOverlay
                  key={`${currentPage}-${index}`}
                  stamp={stamp}
                  stampConfig={config}
                  canvasWidth={canvasSize.width}
                  canvasHeight={canvasSize.height}
                  pageIndex={currentPage}
                  stampIndex={index}
                />
              )
            })}

          {/* 印章放置预览光标提示 */}
          {selectedStampId && (
            <div className="absolute top-2 left-2 bg-blue-500/80 text-white text-xs px-2 py-1 rounded">
              点击放置印章
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
