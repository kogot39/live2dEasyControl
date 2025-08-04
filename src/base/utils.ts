/**
 * 工具类 
 * 读取文件、帧时间管理、日志输出
 */
export class Utils {
  /**
   * 读取文件并将其作为字节数据返回
   *
   * @param filePath 读取目标文件的路径
   * @return
   * {
   *      buffer,   读取的字节数据
   *      size        文件大小
   * }
   */
  public static loadFileAsBytes(
    filePath: string,
    callback: (arrayBuffer: ArrayBuffer, size: number) => void
  ): void {
    fetch(filePath)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => callback(arrayBuffer, arrayBuffer.byteLength));
  }

  /**
   * 时间管理（帧时间、增量时间计算）
   * @return 时间差[ms]
   */
  public static getDeltaTime(): number {
    return this.deltaTime;
  }

  public static updateTime(): void {
    this.currentFrame = Date.now();
    this.deltaTime = (this.currentFrame - this.lastFrame) / 1000;
    this.lastFrame = this.currentFrame;
  }

  /**
   * 日志输出功能
   * @param message 字符串
   */
  public static printMessage(message: string): void {
    // 后面可以替换为其他日志输出方式
    console.log(message);
  }

  static lastUpdate = Date.now();

  static currentFrame = 0.0;
  static lastFrame = 0.0;
  static deltaTime = 0.0;
}