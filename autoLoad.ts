/**
 * 页面加载完成后的处理
 * 初始化Cubism SDK相关对象
 */
import { CubismFramework, Option, LogLevel } from '@framework/live2dcubismframework';

import { Live2dRender } from './src/live2dRender';
import { Live2dControl } from './src/live2dControl';
import { Utils } from './src/base/utils';
import { viewManager } from './src/base/view';
import { Model } from './src/base/model';
import { loadConfigFromFile,Define,Motions,Expressions } from './src/config/loadDefine';
import './src/messageBox.css';

// 异步加载Code文件
const loadCubismCode = (): Promise<void> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

const live2dRender = new Live2dRender();
const live2dControl = new Live2dControl();

// 要导出函数
const setPointMovedEvent = () => {
  live2dControl.setPointMovedEvent();
};

const removePointMovedEvent = () => {
  live2dControl.removePointMovedEvent();
};

const setPointClickEvent = () => {
  live2dControl.setPointClickEvent();
};

 const removePointClickEvent = () => {
  live2dControl.removePointClickEvent();
};

const getAllMotionsInfo = () => {
  return live2dControl.getAllMotionsInfo();
};

const getAllExpressionsInfo = () => {
  return live2dControl.getAllExpressionsInfo();
};

const playMotion = (group: string, no: number, priority: number) => {
  live2dControl.playMotion(group, no, priority);
};

const playExpression = (name: string) => {
  live2dControl.playExpression(name);
};

const reSetDefaultExpression = () => {
  live2dControl.reSetDefaultExpression();
};

const setAngle = (e: MouseEvent, duration: number = null) => {
  live2dControl.setAngle(e, duration);
};

const setMessage = (message: string, duration: number = null) => {
  live2dControl.setMessage(message, duration);
};

const hideMessageBox = () => {
  live2dControl.hideMessageBox();
};

const stop = () => {
  live2dRender.stop();
};

// const 

// // 初始化Cubism SDK
// const cubismOption = new Option();
// cubismOption.logFunction = Utils.printMessage;
// cubismOption.loggingLevel = LogLevel.LogLevel_Verbose;
// CubismFramework.startUp(cubismOption);
// CubismFramework.initialize();

// 初始化viewManager和model
// const _viewManager = new viewManager();
// const _model = new Model(_viewManager);
// 初始化live2dRender和live2dControl 可操作的对象
// export const live2dRender = new Live2dRender(_viewManager, _model);
// export const live2dControl = new Live2dControl(_viewManager, _model);
// live2dControl.setPointClickEvent(); // 注册点击事件
// live2dControl.setMessage('你好啊，我是小助手');
// const button = document.querySelector('button');
// button.addEventListener('click', (e) => {
//     live2dControl.setAngle(e, 1000);
//     live2dControl.setMessage('有什么可以帮助你的吗？');
// });

// setTimeout(() => {
//     // live2dControl.getAllExpressionsInfo();
//     // live2dControl.getAllMotionsInfo();
//     // live2dControl.playExpression('F03');
//     // live2dControl.playMotion('TapBody',0,Define.PriorityNormal);
// }, 1000);

const load = async (configPath: string | Object): Promise<void> => {
    // 加入Cubism Code
    await loadCubismCode();

    // 等待配置加载完成
    await loadConfigFromFile(configPath);

    // 初始化Cubism SDK
    const cubismOption = new Option();
    cubismOption.logFunction = Utils.printMessage;
    cubismOption.loggingLevel = LogLevel.LogLevel_Verbose;
    CubismFramework.startUp(cubismOption);
    CubismFramework.initialize();

    // 初始化viewManager和model
    const _viewManager = new viewManager();
    const _model = new Model(_viewManager);

    // 初始化live2dRender和live2dControl 可操作的对象
    live2dRender.init(_viewManager, _model);
    live2dControl.init(_viewManager, _model);

    // 加载Live2D模型
    live2dRender.showLive2d();

    // 页面加载完成后开始渲染Live2D模型
    // window.addEventListener(
    //     'load',
    //     (): void => {
    //         live2dRender.showLive2d();
    //     },
    //     { passive: true }
    // );

    // 页面卸载前释放Cubism SDK内部相关对象
    window.addEventListener(
        'beforeunload',
        (): void => {
            live2dRender.release();
            live2dControl.release();
            _viewManager.release();
            _model.release();
            CubismFramework.dispose();
        },
        { passive: true }
    );
}

export { 
  load,
  setPointMovedEvent,
  removePointMovedEvent,
  setPointClickEvent,
  removePointClickEvent,
  getAllMotionsInfo,
  getAllExpressionsInfo,
  playMotion,
  playExpression,
  reSetDefaultExpression,
  setAngle,
  setMessage,
  hideMessageBox,
  stop,
  Define,
  Motions,
  Expressions
};

