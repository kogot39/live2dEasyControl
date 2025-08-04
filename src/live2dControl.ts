/**
 * live2d控制类
 * 提供直接控制live2d运动、表情的方法
 * 对话框代码参考
 * https://github.com/LSTM-Kirigaya/Live2dRender
 */
import { Define } from './config/loadDefine';
import { Utils } from './base/utils';
import { Model } from './base/model';
import { Touch } from './base/touch';
import { viewManager } from './base/view';

export class Live2dControl {

    private _model: Model; // 模型对象
    private _touch: Touch; // 触控管理类
    private _viewManager: viewManager; // 视图管理对象
    private _messageBox: HTMLElement; // 对话框对象
    // 只允许注册点击和鼠标移动事件
    private pointClickEventListener: (this: Document, ev: PointerEvent) => void;
    private pointMovedEventListener: (this: Document, ev: PointerEvent) => void;
    private hasPointMovedEventListener: boolean;
    private hasPointClickEventListener: boolean;

    /**
     * 初始化
     */
    public init(viewManager: viewManager, model: Model): void {
        this._model = model;
        this._viewManager = viewManager;
        this._touch = new Touch();
        // 注册事件
        this.hasPointMovedEventListener = false;
        this.hasPointClickEventListener = false;

        // 初始化对话框
        this.initMessageBox();
    }

    public release(): void {
        // 移除所有监听事件
        this.removePointClickEvent();
        this.removePointMovedEvent();
    }

    /**
     * 注册鼠标移动事件
     */
    public setPointMovedEvent(): void {
        if (!this.hasPointMovedEventListener) {
            this.hasPointMovedEventListener = true;
            this.pointMovedEventListener = this.onPointerMoved.bind(this);
            document.addEventListener('pointermove', this.pointMovedEventListener, { passive: true });
        }
    }

    /**
     * 移除鼠标移动事件
     */
    public removePointMovedEvent(): void {
        if (this.hasPointMovedEventListener) {
            this.hasPointMovedEventListener = false;
            document.removeEventListener('pointermove', this.pointMovedEventListener);
        }
    }

    /**
     * 注册点击事件
     */
    public setPointClickEvent(): void {
        if (!this.hasPointClickEventListener) {
            this.hasPointClickEventListener = true;
            this.pointClickEventListener = this.onPointerClicked.bind(this);
            this._viewManager.getCanvas().addEventListener('click', this.pointClickEventListener, { passive: true });
        }
    }

    /**
     * 移除点击事件
     */
    public removePointClickEvent(): void {
        if (this.hasPointClickEventListener) {
            this.hasPointClickEventListener = false;
            this._viewManager.getCanvas().removeEventListener('click', this.pointClickEventListener);
        }
    }




    /**
     * 鼠标移动事件处理函数
     * @param e 鼠标移动事件对象
     */
    private onPointerMoved(e: PointerEvent): void {
        const canvas = this._viewManager.getCanvas();
        const localX: number = (e.pageX - canvas.offsetLeft) * window.devicePixelRatio;
        const localY: number = (e.pageY - canvas.offsetTop) * window.devicePixelRatio;

        const viewX: number = this._viewManager.transformViewX(this._touch.getX());
        const viewY: number = this._viewManager.transformViewY(this._touch.getY());

        this._touch.touchesMoved(localX, localY);

        this._model.setDragging(viewX, viewY);

        // 避免捕获过于频繁每次执行有0.01s冷却
        // setTimeout(() => {
        //     this._model.setDragging(viewX, viewY);
        // }, 100);
    }

    /**
     * 点击事件处理函数
     * @param e 点击事件对象
     */
    private onPointerClicked(e: PointerEvent): void {
        const localX: number = (e.pageX - this._viewManager.getCanvas().offsetLeft) * window.devicePixelRatio;
        const localY: number = (e.pageY - this._viewManager.getCanvas().offsetTop) * window.devicePixelRatio;
        this._touch.touchesBegan(localX, localY);

        this._model.setDragging(0.0, 0.0);
        const viewX: number = this._viewManager.transformViewX(localX);
        const viewY: number = this._viewManager.transformViewY(localY);

        if (Define.debugTouchLogEnable) {
            Utils.printMessage(`[APP]touchesEnded x: ${viewX} y: ${viewY}`);
        }
        // 根据点击位置确定执行操作
        if (this._model.hitTest(Define.hitAreaNameHead, viewX, viewY)) {
            if (Define.debugLogEnable) {
                Utils.printMessage(`[APP]hit area: [${Define.hitAreaNameHead}]`);
            }
            this._model.setRandomExpression(); // 随机表情
        } else if (this._model.hitTest(Define.hitAreaNameBody, viewX, viewY)) {
            if (Define.debugLogEnable) {
                Utils.printMessage(`[APP]hit area: [${Define.hitAreaNameBody}]`);
            }
            this._model.startRandomMotion( // 随机动作
                Define.motionGroupTapBody,
                Define.priorityNormal,
            );
        } else {
            // 未设置点击区域 可能没有motion部分
            this._model.setRandomExpression(); // 默认随机表情
        }
    }

    /**
     * 获取所有动作信息
     * @returns 动作信息数组，每个元素包含动作组名和动作名称数组
     */
    public getAllMotionsInfo(): { group: string, names: string[] }[] | null {
        const motionsNames: { group: string, names: string[] }[] | null = this._model.getAllMotions();
        if (!motionsNames) {
            // 未加载完成提示
            Utils.printMessage('[APP]模型未加载完成，无法获取动作信息');
            return null;
        }

        return motionsNames;
    }

    /**
     * 获取所有表情信息
     * @returns 表情名称数组
     */
    public getAllExpressionsInfo(): string[] | null {
        const expsNames: string[] | null = this._model.getAllExpressions();
        if (!expsNames) {
            // 未加载完成提示
            Utils.printMessage('[APP]模型未加载完成，无法获取表情信息');
            return null;
        }

        return expsNames;
    }

    /**
     * 播放动作
     * @param group 动作组名
     * @param no 动作序号
     * @param priority 优先级
     */
    public playMotion(group: string, no: number, priority: number): void {
        this._model.startMotion(group, no, priority);
    }

    /**
     * 播放表情
     * @param name 表情名称
     */
    public playExpression(name: string): void {
        this._model.setExpression(name);
    }

    /**
     * 恢复默认表情
     */
    public reSetDefaultExpression(): void {
        if (Define.expressionNames.default)
            this.playExpression(Define.expressionNames.default);
        else
            Utils.printMessage('[APP]未设置默认表情');
    }

    /**
     * 设置模型朝向 点击的元素和点击位置
     * @param e 点击事件对象
     * @param duration 持续时间
     */
    public setAngle(e: MouseEvent, duration: number = null): void {
        // 与鼠标移动事件不能同时设置
        if (this.hasPointMovedEventListener) {
            Utils.printMessage('[APP]与鼠标移动事件不能同时设置');
            return;
        }
        const element = e.target as HTMLElement;

        const localX: number = (e.pageX - element.offsetLeft) * window.devicePixelRatio;
        const localY: number = (e.pageY - element.offsetTop) * window.devicePixelRatio;

        const viewX: number = this._viewManager.transformViewX(this._touch.getX());
        const viewY: number = this._viewManager.transformViewY(this._touch.getY());

        this._touch.touchesMoved(localX, localY);

        this._model.setDragging(viewX, viewY);

        if (duration) {
            setTimeout(() => {
                this._model.setDragging(0.0, 0.0);
            }, duration);
        }
    }


    /**
     * 初始化对话框
     */
    private initMessageBox(): void {
        this._messageBox = document.createElement('div');

        this._messageBox.id = 'live2dMessageBox-content';

        this._messageBox.style.width = this._viewManager.getCanvas().style.width;
        // this._messageBox.style.height = '20px';

        if (Define.canvasPosition as string === 'left') {
            this._messageBox.style.left = '0';
        }
        else {
            this._messageBox.style.right = '0';
        }

        this._messageBox.style.bottom = this._viewManager.getCanvas().style.height;
        // this._messageBox.innerHTML = `<div id="live2dMessageBox-content"></div>`;
        document.body.appendChild(this._messageBox);

        this.hideMessageBox();
    }

    /**
     * 隐藏对话框
     */
    public hideMessageBox() {
        this._messageBox.classList.remove('live2dMessageBox-content-visible');
        this._messageBox.classList.add('live2dMessageBox-content-hidden');
    }

    /**
     * 展示对话框
     */
    public revealMessageBox() {
        this._messageBox.classList.remove('live2dMessageBox-content-hidden');
        this._messageBox.classList.add('live2dMessageBox-content-visible');
    }

    /**
     * 展示对话框并显示信息
     * @param message 要显示的信息
     * @param duration 信息显示持续时间（毫秒），默认值为 null（不自动隐藏）
     */
    public setMessage(message: string, duration: number = null) {
        const messageBox = this._messageBox;

        this.hideMessageBox();
        messageBox.textContent = message;

        // setTimeout(() => {
        //     const wrapperDiv: HTMLDivElement = document.querySelector('#' + Define.MessageBoxId);
        //     wrapperDiv.style.bottom = (Define.CanvasSize === 'auto' ? 500 : Define.CanvasSize.height) + messageBox.offsetHeight - 25 + 'px';
        // }, 10);

        this.revealMessageBox();
        if (duration) {
            setTimeout(() => {
                this.hideMessageBox();
            }, duration);
        }
    }
}
