/**
 * 触控管理类
 * 获取与鼠标点击相关的坐标和距离
 */
export class Touch {
  constructor() {
    this._startX = 0.0;
    this._startY = 0.0;
    this._lastX = 0.0;
    this._lastY = 0.0;
    this._lastX1 = 0.0;
    this._lastY1 = 0.0;
    this._lastX2 = 0.0;
    this._lastY2 = 0.0;
    this._lastTouchDistance = 0.0;
    this._deltaX = 0.0;
    this._deltaY = 0.0;
    this._scale = 1.0;
    this._touchSingle = false;
    this._flipAvailable = false;
  }

  public getCenterX(): number {
    return this._lastX;
  }

  public getCenterY(): number {
    return this._lastY;
  }

  public getDeltaX(): number {
    return this._deltaX;
  }

  public getDeltaY(): number {
    return this._deltaY;
  }

  public getStartX(): number {
    return this._startX;
  }

  public getStartY(): number {
    return this._startY;
  }

  public getScale(): number {
    return this._scale;
  }

  public getX(): number {
    return this._lastX;
  }

  public getY(): number {
    return this._lastY;
  }

  public getX1(): number {
    return this._lastX1;
  }

  public getY1(): number {
    return this._lastY1;
  }

  public getX2(): number {
    return this._lastX2;
  }

  public getY2(): number {
    return this._lastY2;
  }

  public isSingleTouch(): boolean {
    return this._touchSingle;
  }

  public isFlickAvailable(): boolean {
    return this._flipAvailable;
  }

  public disableFlick(): void {
    this._flipAvailable = false;
  }

  /**
   * 触摸开始事件
   * @param deviceX 触摸开始时的x坐标
   * @param deviceY 触摸开始时的y坐标
   */
  public touchesBegan(deviceX: number, deviceY: number): void {
    this._lastX = deviceX;
    this._lastY = deviceY;
    this._startX = deviceX;
    this._startY = deviceY;
    this._lastTouchDistance = -1.0;
    this._flipAvailable = true;
    this._touchSingle = true;
  }

  /**
   * 触摸移动事件
   * @param deviceX 触摸移动时的x坐标
   * @param deviceY 触摸移动时的y坐标
   */
  public touchesMoved(deviceX: number, deviceY: number): void {
    this._lastX = deviceX;
    this._lastY = deviceY;
    this._lastTouchDistance = -1.0;
    this._touchSingle = true;
  }

  /**
   * 计算触摸距离
   * @return 触摸距离
   */
  public getFlickDistance(): number {
    return this.calculateDistance(
      this._startX,
      this._startY,
      this._lastX,
      this._lastY
    );
  }

  /**
   * 计算两点之间的距离
   *
   * @param x1 第一个点的x坐标
   * @param y1 第一个点的y坐标
   * @param x2 第二个点的x坐标
   * @param y2 第二个点的y坐标
   */
  public calculateDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
  }

  /**
   * 计算移动量
   * 不同方向的移动量为0。相同方向的移动量取绝对值较小的那个。
   *
   * @param v1 第一个移动量
   * @param v2 第二个移动量
   *
   * @return 较小的移动量
   */
  public calculateMovingAmount(v1: number, v2: number): number {
    if (v1 > 0.0 != v2 > 0.0) {
      return 0.0;
    }

    const sign: number = v1 > 0.0 ? 1.0 : -1.0;
    const absoluteValue1 = Math.abs(v1);
    const absoluteValue2 = Math.abs(v2);
    return (
      sign * (absoluteValue1 < absoluteValue2 ? absoluteValue1 : absoluteValue2)
    );
  }

  _startY: number; // 触摸开始时的x坐标
  _startX: number; // 触摸开始时的y坐标
  _lastX: number; // 单触摸时的x坐标
  _lastY: number; // 单触摸时的y坐标
  _lastX1: number; // 双触摸时的第一个x坐标 双触摸（双击？拖动？）
  _lastY1: number; // 双触摸时的第一个y坐标
  _lastX2: number; // 双触摸时的第二个x坐标
  _lastY2: number; // 双触摸时的第二个y坐标
  _lastTouchDistance: number; // 双触摸时的两个指之间的距离
  _deltaX: number; // 前一次的值到当前值的x移动距离。
  _deltaY: number; // 前一次的值到当前值的y移动距离。
  _scale: number; // 这个框架中的缩放比例。在缩放操作中，它的值大于1。
  _touchSingle: boolean; // 单触摸时为true
  _flipAvailable: boolean; // 翻转是否可用
}
