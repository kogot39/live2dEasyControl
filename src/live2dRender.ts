/**
 * live2d渲染类
 * 专门处理live2d的渲染
 */
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';

import { Define } from './config/loadDefine';
import { Utils } from './base/utils';
import { viewManager } from './base/view';
import { Model } from './base/model';

export class Live2dRender {

    private _viewManager: viewManager; // 视图管理对象
    private _programId: WebGLProgram; // 着色器程序对象
    private _model: Model; // 模型对象
    private _isShow: boolean; // 是否显示
    private _needResize: boolean; // 是否需要重新加载视图矩阵
    private _resizeObserver: ResizeObserver; // 监听窗口变化

    /**
     * 初始化
     */
    public async init(viewManager: viewManager, model: Model): Promise<void> {
        this._isShow = false;

        this._viewManager = viewManager;
        // 创建着色器
        this._programId = this.createShader();
        // 初始化模型
        this._model = model;

        // 监听窗口变化
        this._resizeObserver = new ResizeObserver(
            (entries: ResizeObserverEntry[], observer: ResizeObserver) =>
                this.resizeObserverCallback.call(this, entries, observer)
        );
        this._resizeObserver.observe(this._viewManager.getCanvas());

        // 等待模型加载完成
        await this.waiting()
    }

    public release(): void {
        this.stop();
        this._programId = null;
        this._model = null;
        this._viewManager = null;
    }

    private waiting(): Promise<void> {
        return new Promise((resolve) => {
            const check = () => {
                if (this._model.getLoadState()) {
                    resolve();
                } else {
                    setTimeout(check, 10);
                }
            };
            check();
        });
    }

    /**
     * 注册着色器
     * @returns 着色器程序对象
     */
    public createShader(): WebGLProgram {
        const gl = this._viewManager.getGl();

        // 编译顶点着色器
        const vertexShaderId = gl.createShader(gl.VERTEX_SHADER);

        if (vertexShaderId == null) {
            Utils.printMessage('failed to create vertexShader');
            return null;
        }

        const vertexShader: string =
            'precision mediump float;' +
            'attribute vec3 position;' +
            'attribute vec2 uv;' +
            'varying vec2 vuv;' +
            'void main(void)' +
            '{' +
            '   gl_Position = vec4(position, 1.0);' +
            '   vuv = uv;' +
            '}';

        gl.shaderSource(vertexShaderId, vertexShader);
        gl.compileShader(vertexShaderId);

        // 编译片段着色器
        const fragmentShaderId = gl.createShader(gl.FRAGMENT_SHADER);

        if (fragmentShaderId == null) {
            Utils.printMessage('failed to create fragmentShader');
            return null;
        }

        const fragmentShader: string =
            'precision mediump float;' +
            'varying vec2 vuv;' +
            'uniform sampler2D texture;' +
            'void main(void)' +
            '{' +
            '   gl_FragColor = texture2D(texture, vuv);' +
            '}';

        gl.shaderSource(fragmentShaderId, fragmentShader);
        gl.compileShader(fragmentShaderId);

        // 创建程序对象
        const programId = gl.createProgram();
        gl.attachShader(programId, vertexShaderId);
        gl.attachShader(programId, fragmentShaderId);

        gl.deleteShader(vertexShaderId);
        gl.deleteShader(fragmentShaderId);

        // 链接程序
        gl.linkProgram(programId);
        gl.useProgram(programId);

        return programId;
    }

    /**
     * 画面更新
     */
    private update(): void {
        if (this._viewManager.getGl().isContextLost()) {
            Utils.printMessage('Live2dRender update viewManager getGl failed');
            return;
        }

        // 画布尺寸变化处理
        if (this._needResize) {
            this.onResize();
            this._needResize = false;
        }

        const gl = this._viewManager.getGl();

        // 初始化画布
        gl.clearColor(0.0, 0.0, 0.0, 0.0);

        // 深度检查
        gl.enable(gl.DEPTH_TEST);

        // 近距离的物体会遮挡远距离的物体
        gl.depthFunc(gl.LEQUAL);

        // 清除颜色缓冲区和深度缓冲区
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.clearDepth(1.0);

        // 透過設定
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // 描画更新
        this._viewManager.getGl().useProgram(this._programId);


        this._viewManager.getGl().flush();

        this.onUpdate();
    }

    /**
     * 监听窗口变化回调函数
     * @param entries 监听窗口变化事件对象数组
     * @param observer 监听窗口变化事件对象
     */
    private resizeObserverCallback(
        entries: ResizeObserverEntry[],
        observer: ResizeObserver
    ): void {
        if (Define.canvasSize === 'auto') {
            this._needResize = true;
        }
    }

    /**
     * 画面更新回调函数
     */
    public onUpdate(): void {
        if (this._model == null) {
            Utils.printMessage('Live2dRender onUpdate model is null');
            return;
        }
        const { width, height } = this._viewManager.getCanvas();

        const projection: CubismMatrix44 = new CubismMatrix44();
        const view: CubismMatrix44 = new CubismMatrix44();
        for (let i = 0; i < 16; i++) {
            this._viewManager.getViewMatrix().getArray()[i] = view.getArray()[i];
        }
        const model: Model = this._model;

        if (model.getModel()) {
            if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
                // 在将横向较长的模型显示在纵向窗口时，根据模型的横向尺寸来计算缩放比例
                model.getModelMatrix().setWidth(2.0);
                projection.scale(1.0, width / height);
            } else {
                projection.scale(height / width, 1.0);
            }

            // 如果需要，这里可以进行矩阵乘法操作
            if (view != null) {
                projection.multiplyByMatrix(view);
            }
        }

        model.update();
        model.draw(projection); // 参照传递，所以projection会改变。

    }

    /**
     * 监听窗口变化回调函数
     */
    public onResize(): void {

        this._viewManager.resizeCanvas();

        this._viewManager.reLoadViewMatrix();
    }

    /**
     * 停止模型渲染
     */
    public stop(): void {
        this._isShow = false;
    }

    /**
     * 渲染模型
     */
    public showLive2d(): void {
        this._isShow = true;
        const loop = (): void => {
            // 是否显示
            if (!this._isShow) {
                return;
            }
            // 更新帧与帧之间的时间
            Utils.updateTime();

            // 执行update更新画面
            this.update();

            // 循环调用以保持动画
            requestAnimationFrame(loop);
        };
        loop();
    }
}