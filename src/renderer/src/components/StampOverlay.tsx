/**
 * 印章覆盖层组件
 * 使用 react-rnd 实现印章的拖拽和缩放
 */

import { Rnd } from 'react-rnd'
import { useStampStore } from '../stores/useStampStore'
import type { StampConfig, PageStamp } from '../types'

interface StampOverlayProps {
  /** 印章记录 */
  stamp: PageStamp
  /** 印章配置 */
  stampConfig: StampConfig
  /** canvas宽度(px) */
  canvasWidth: number
  /** canvas高度(px) */
  canvasHeight: number
  /** 页码 */
  pageIndex: number
  /** 印章索引 */
  stampIndex: number
}

export function StampOverlay({
  stamp,
  stampConfig,
  canvasWidth,
  canvasHeight,
  pageIndex,
  stampIndex,
}: StampOverlayProps) {
  const updateStampPosition = useStampStore((s) => s.updateStampPosition)
  const removePageStamp = useStampStore((s) => s.removePageStamp)

  // 转换为canvas像素坐标
  const x = stamp.position.x * canvasWidth
  const y = stamp.position.y * canvasHeight
  const width = stamp.position.width * canvasWidth
  const height = stamp.position.height * canvasHeight

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height }}
      minWidth={30}
      minHeight={30}
      bounds="parent"
      dragHandleClassName="stamp-drag-handle"
      onClick={(e) => e.stopPropagation()}
      // 拖拽结束回调
      onDragStop={(_e, d) => {
        updateStampPosition(pageIndex, stampIndex, {
          ...stamp.position,
          x: d.x / canvasWidth,
          y: d.y / canvasHeight,
        })
      }}
      // 缩放结束回调
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        updateStampPosition(pageIndex, stampIndex, {
          ...stamp.position,
          x: position.x / canvasWidth,
          y: position.y / canvasHeight,
          width: parseFloat(ref.style.width) / canvasWidth,
          height: parseFloat(ref.style.height) / canvasHeight,
        })
      }}
      lockAspectRatio
    >
      <div
        className="w-full h-full relative group"
        title={stampConfig.name}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 印章图片 (拖拽区域) */}
        <div className="stamp-drag-handle w-full h-full cursor-move">
          <img
            src={`data:image/png;base64,${stampConfig.imageBase64}`}
            alt={stampConfig.name}
            className="w-full h-full object-contain pointer-events-none"
            style={{
              transform: `rotate(${stamp.position.rotation}deg)`,
              opacity: 0.85,
            }}
            draggable={false}
          />
        </div>

        {/* 操作按钮 - 放在印章内部右上角，始终可点击 */}
        <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 旋转按钮 */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              updateStampPosition(pageIndex, stampIndex, {
                ...stamp.position,
                rotation: (stamp.position.rotation + 15) % 360,
              })
            }}
            className="w-6 h-6 bg-blue-500 text-white rounded text-xs flex items-center justify-center hover:bg-blue-600 shadow cursor-pointer"
            title="旋转15°"
          >
            ↻
          </button>
          {/* 删除按钮 */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              removePageStamp(pageIndex, stampIndex)
            }}
            className="w-6 h-6 bg-red-500 text-white rounded text-xs flex items-center justify-center hover:bg-red-600 shadow cursor-pointer"
            title="删除印章"
          >
            ×
          </button>
        </div>

        {/* 选中边框 */}
        <div className="absolute inset-0 border-2 border-blue-400/50 rounded pointer-events-none group-hover:border-blue-500" />
      </div>
    </Rnd>
  )
}
