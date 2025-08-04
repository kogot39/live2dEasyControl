/**
 * WebGL（Web 图形库）
 * 用于在任何兼容的 Web 浏览器中无需插件即可渲染高性能的交互式 3D 和 2D 图形。
 * 图像渲染基础类 包含最基础的图像纹理渲染和定位相关的功能
 */
import { csmVector, iterator } from '@framework/type/csmvector';
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismViewMatrix } from '@framework/math/cubismviewmatrix';

import { Define } from '../config/loadDefine';

export class viewManager {
    private _gl: WebGLRenderingContext | WebGL2RenderingContext; // WebGL上下文
    private _textures: csmVector<TextureInfo>;
    private _canvas: HTMLCanvasElement;
    private _deviceToScreen: CubismMatrix44; // 设备从屏幕到屏幕的矩阵
    private _viewMatrix: CubismViewMatrix; // 视图矩阵

    public constructor() {
        // 初始化canvas 
        // 创建canvas元素 根据define.ts设置canvas大小
        this._canvas = document.createElement('canvas');
        this._canvas.style.width = Define.canvasWidth;
        this._canvas.style.height = Define.canvasHeight;
        this._canvas.style.position = 'absolute';
        this._canvas.style.bottom = '0';
        if(Define.canvasPosition as string === 'left') {
            this._canvas.style.left = '0';
        }
        else {
            this._canvas.style.right = '0';
        }

        // 添加到页面
        document.body.appendChild(this._canvas);

        this._gl = this._canvas.getContext('webgl2');

        // 初始化失败抛出异常
        if (!this._gl) {
            throw new Error('TextureManager constructor setGl failed');
        }

        // 初始化Canvas大小
        if (Define.canvasSize === 'auto') {
            this.resizeCanvas();
        } else {
            this._canvas.width = Define.canvasSize.width;
            this._canvas.height = Define.canvasSize.height;
        }

        // // 透过设定
        // this._gl.enable(this._gl.BLEND);
        // this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);

        // 初始化纹理存储器
        this._textures = new csmVector<TextureInfo>();

        // 初始化视图矩阵
        this.initViewMatrix();
    }

    // 初始化视图矩阵
    private initViewMatrix(): void {
        this._deviceToScreen = new CubismMatrix44();
        this._viewMatrix = new CubismViewMatrix();

        const { width, height } = this._canvas;

        const ratio: number = width / height;
        const left: number = -ratio;
        const right: number = ratio;
        const bottom: number = Define.viewLogicalLeft;
        const top: number = Define.viewLogicalRight;

        this._viewMatrix.setScreenRect(left, right, bottom, top); // 视图矩阵的设置。 X左端、X右端、Y下端、Y上端
        this._viewMatrix.scale(Define.viewScale, Define.viewScale);

        this._deviceToScreen.loadIdentity();
        if (width > height) {
            const screenW: number = Math.abs(right - left);
            this._deviceToScreen.scaleRelative(screenW / width, -screenW / width);
        } else {
            const screenH: number = Math.abs(top - bottom);
            this._deviceToScreen.scaleRelative(screenH / height, -screenH / height);
        }
        this._deviceToScreen.translateRelative(-width * 0.5, -height * 0.5);

        // 显示范围的设置
        this._viewMatrix.setMaxScale(Define.viewMaxScale); // 限界扩展率
        this._viewMatrix.setMinScale(Define.viewMinScale); // 限界缩放率

        // 显示可以的最大范围
        this._viewMatrix.setMaxScreenRect(
            Define.viewLogicalMaxLeft,
            Define.viewLogicalMaxRight,
            Define.viewLogicalMaxBottom,
            Define.viewLogicalMaxTop
        );
    }

    public release(): void {
        for (
            let ite: iterator<TextureInfo> = this._textures.begin();
            ite.notEqual(this._textures.end());
            ite.preIncrement()
        ) {
            this._gl.deleteTexture(ite.ptr().id);
        }
        this._textures = null;
        this._gl = null;
    }

    public getGl(): WebGLRenderingContext | WebGL2RenderingContext {
        return this._gl;
    }

    public setGl(canvas: HTMLCanvasElement): void {
        this._gl = canvas.getContext('webgl2');
        if (!this._gl) {
            throw new Error('TextureManager setGl failed');
        }
    }

    public getCanvas(): HTMLCanvasElement {
        return this._canvas;
    }

    public resizeCanvas(): void {
        this._canvas.width = this._canvas.clientWidth * window.devicePixelRatio;
        this._canvas.height = this._canvas.clientHeight * window.devicePixelRatio;
        this._gl.viewport(0, 0, this._gl.drawingBufferWidth, this._gl.drawingBufferHeight);
    }

    public getViewMatrix(): CubismViewMatrix {
        return this._viewMatrix;
    }

    public reLoadViewMatrix(): void {
        this._viewMatrix = null;
        this._deviceToScreen = null;

        this.initViewMatrix();
    }

    /**
     * 加载图像
     *
     * @param fileName 要加载的图像文件路径
     * @param usePremultiply 是否启用Premultiply处理
     * @return 图像信息，加载失败时返回null
     */
    public createTextureFromPngFile(
        fileName: string,
        usePremultiply: boolean,
        callback: (textureInfo: TextureInfo) => void
    ): void {
        // search loaded texture already
        for (
            let ite: iterator<TextureInfo> = this._textures.begin();
            ite.notEqual(this._textures.end());
            ite.preIncrement()
        ) {
            if (
                ite.ptr().fileName == fileName &&
                ite.ptr().usePremultply == usePremultiply
            ) {
                ite.ptr().img = new Image();
                ite
                    .ptr()
                    .img.addEventListener('load', (): void => callback(ite.ptr()), {
                        passive: true
                    });
                ite.ptr().img.src = fileName;
                return;
            }
        }

        // 数据的加载触发
        const img = new Image();
        img.addEventListener(
            'load',
            (): void => {
                // 纹理对象的创建
                const tex: WebGLTexture = this._gl.createTexture();

                // 选择纹理
                this._gl.bindTexture(this._gl.TEXTURE_2D, tex);

                // 纹理参数设置
                this._gl.texParameteri(
                    this._gl.TEXTURE_2D,
                    this._gl.TEXTURE_MIN_FILTER,
                    this._gl.LINEAR_MIPMAP_LINEAR
                );
                this._gl.texParameteri(
                    this._gl.TEXTURE_2D,
                    this._gl.TEXTURE_MAG_FILTER,
                    this._gl.LINEAR
                );

                // Premultiply处理
                if (usePremultiply) {
                    this._gl
                        .pixelStorei(
                            this._gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
                            1
                        );
                }

                // 纹理数据写入
                this._gl.texImage2D(
                    this._gl.TEXTURE_2D,
                    0,
                    this._gl.RGBA,
                    this._gl.RGBA,
                    this._gl.UNSIGNED_BYTE,
                    img
                );

                // 生成Mipmap
                this._gl.generateMipmap(this._gl.TEXTURE_2D);

                // 选择纹理
                this._gl.bindTexture(this._gl.TEXTURE_2D, null);

                const textureInfo: TextureInfo = new TextureInfo();
                if (textureInfo != null) {
                    textureInfo.fileName = fileName;
                    textureInfo.width = img.width;
                    textureInfo.height = img.height;
                    textureInfo.id = tex;
                    textureInfo.img = img;
                    textureInfo.usePremultply = usePremultiply;
                    if (this._textures != null) {
                        this._textures.pushBack(textureInfo);
                    }
                }

                callback(textureInfo);
            },
            { passive: true }
        );
        img.src = fileName;
    }

    /**
     * 清空图像
     * 释放数组中所有图像。
     */
    public releaseTextures(): void {
        for (let i = 0; i < this._textures.getSize(); i++) {
            this._gl.deleteTexture(this._textures.at(i).id);
            this._textures.set(i, null);
        }

        this._textures.clear();
    }

    /**
     * 清空图像
     * 释放指定图像。
     * @param texture 释放的图像
     */
    public releaseTextureByTexture(texture: WebGLTexture): void {
        for (let i = 0; i < this._textures.getSize(); i++) {
            if (this._textures.at(i).id != texture) {
                continue;
            }

            this._gl.deleteTexture(this._textures.at(i).id);
            this._textures.set(i, null);
            this._textures.remove(i);
            break;
        }
    }

    /**
     * 清空图像
     * 释放指定图像。
     * @param fileName 释放的图像文件路径名
     */
    public releaseTextureByFilePath(fileName: string): void {
        for (let i = 0; i < this._textures.getSize(); i++) {
            if (this._textures.at(i).fileName == fileName) {
                this._gl.deleteTexture(this._textures.at(i).id);
                this._textures.set(i, null);
                this._textures.remove(i);
                break;
            }
        }
    }

    /**
    * ·X坐标转换为视图坐标
    *
    * @param deviceX 设备X坐标
    */
    public transformViewX(deviceX: number): number {
        const screenX: number = this._deviceToScreen.transformX(deviceX); 
        return this._viewMatrix.invertTransformX(screenX); 
    }

    /**
     * ·Y坐标转换为视图坐标
     *
     * @param deviceY 设备Y坐标
     */
    public transformViewY(deviceY: number): number {
        const screenY: number = this._deviceToScreen.transformY(deviceY); 
        return this._viewMatrix.invertTransformY(screenY);
    }

    /**
     * 将X坐标转换为屏幕坐标。
     * @param deviceX 设备X坐标
     */
    public transformScreenX(deviceX: number): number {
        return this._deviceToScreen.transformX(deviceX);
    }

    /**
     * 将Y坐标转换为屏幕坐标。
     *
     * @param deviceY 设备Y坐标
     */
    public transformScreenY(deviceY: number): number {
        return this._deviceToScreen.transformY(deviceY);
    }
}

/**
 * 图像信息结构体
 */
export class TextureInfo {
    img: HTMLImageElement; // 图像
    id: WebGLTexture = null; // 纹理
    width = 0; // 宽度
    height = 0; // 高度
    usePremultply: boolean; // Premultiply处理
    fileName: string; // 文件路径名
}