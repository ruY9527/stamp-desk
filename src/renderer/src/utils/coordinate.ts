/**
 * 坐标转换系统
 * 处理屏幕坐标、PDF页面坐标、归一化坐标之间的转换
 *
 * 坐标系说明:
 * - 屏幕坐标: 以PDF预览canvas左上角为原点，单位为px，Y轴向下
 * - PDF坐标: 以PDF页面左下角为原点，单位为pt(1pt = 1/72 inch)，Y轴向上
 * - 归一化坐标: 以PDF页面左上角为原点，值域[0,1]，Y轴向下
 */

/** 点坐标 */
export interface Point {
  x: number
  y: number
}

/** 矩形区域 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 屏幕坐标 -> 归一化坐标
 * @param screenX 屏幕X(px)
 * @param screenY 屏幕Y(px)
 * @param canvasWidth canvas宽度(px)
 * @param canvasHeight canvas高度(px)
 * @returns 归一化坐标 (0-1)
 */
export function screenToNormalized(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number
): Point {
  return {
    x: screenX / canvasWidth,
    y: screenY / canvasHeight,
  }
}

/**
 * 归一化坐标 -> 屏幕坐标
 * @param normX 归一化X (0-1)
 * @param normY 归一化Y (0-1)
 * @param canvasWidth canvas宽度(px)
 * @param canvasHeight canvas高度(px)
 * @returns 屏幕坐标(px)
 */
export function normalizedToScreen(
  normX: number,
  normY: number,
  canvasWidth: number,
  canvasHeight: number
): Point {
  return {
    x: normX * canvasWidth,
    y: normY * canvasHeight,
  }
}

/**
 * 归一化坐标 -> PDF坐标
 * @param normX 归一化X (0-1)
 * @param normY 归一化Y (0-1)
 * @param pageWidth PDF页面宽度(pt)
 * @param pageHeight PDF页面高度(pt)
 * @param stampHeight 印章高度(pt)
 * @returns PDF坐标(pt)
 */
export function normalizedToPdf(
  normX: number,
  normY: number,
  pageWidth: number,
  pageHeight: number,
  stampHeight: number
): Point {
  return {
    x: normX * pageWidth,
    y: pageHeight - normY * pageHeight - stampHeight,
  }
}

/**
 * 计算印章在canvas上的显示位置
 * @param normX 归一化X
 * @param normY 归一化Y
 * @param stampWidth 印章宽度(归一化)
 * @param stampHeight 印章高度(归一化)
 * @param canvasWidth canvas宽度
 * @param canvasHeight canvas高度
 * @returns canvas上的矩形区域
 */
export function getStampCanvasRect(
  normX: number,
  normY: number,
  stampWidth: number,
  stampHeight: number,
  canvasWidth: number,
  canvasHeight: number
): Rect {
  return {
    x: normX * canvasWidth,
    y: normY * canvasHeight,
    width: stampWidth * canvasWidth,
    height: stampHeight * canvasHeight,
  }
}

/**
 * 约束坐标在有效范围内
 * @param value 坐标值
 * @param max 最大值
 * @returns 约束后的值
 */
export function clamp(value: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, value))
}
