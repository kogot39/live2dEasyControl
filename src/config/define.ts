/**
 * 配置类
 * 设置相关配置
 */


export interface Live2DConfig {
    // 画布大小
    canvasSize: { width: number; height: number } | 'auto'; // 不设置auto画面会糊
    canvasWidth: string;
    canvasHeight: string;

    // 画布位置
    canvasPosition: 'left' | 'right';

    // 视图配置
    viewScale: number;
    viewMaxScale: number;
    viewMinScale: number;

    viewLogicalLeft: number;
    viewLogicalRight: number;
    viewLogicalBottom: number;
    viewLogicalTop: number;

    viewLogicalMaxLeft: number;
    viewLogicalMaxRight: number;
    viewLogicalMaxBottom: number;
    viewLogicalMaxTop: number;

    // 模型配置
    modelDir: string;  // 目录名和 model3.json的名称保持一致
    resourcesPath: string; // 相对路径信息

    // 特点动作组名及点击交互区域 Idle和TapBody（demo原功能可以不需要）与外部定义文件（json）结合
    motionGroupIdle: string; // 空闲动作组
    motionGroupTapBody: string; // 点击身体动作组

    // 交互区域
    hitAreaNameHead: string; // 点击头部
    hitAreaNameBody: string; // 点击身体

    // 动作的优先级常量
    priorityNone: number;
    priorityIdle: number;
    priorityNormal: number;
    priorityForce: number;

    // MOC3的整合性验证选项
    MOCConsistencyValidationEnable: boolean;
    // motion3.json的整合性验证选项
    motionConsistencyValidationEnable: boolean;

    // 调试配置
    debugLogEnable: boolean;
    debugTouchLogEnable: boolean;

    // 表情和动作配置
    expressionNames: Record<string, string>; // 自定义表情名称 (表情名称(自定义名称)：文件名(不包含.exp3.json))
    // expressionNames = {
    //     'default': '', // 固定第一个为闲置时默认表情
    // }
    motionNames: Record<string, { group: string; no: number, priority: number}>; // 自定义动作名称 (动作名称：{group:组名,no:序号,priority:动作优先级}) 
    // motionNames = {
    //     'default': { group: '', no: -1, priority: 0 }, // 固定第一个为闲置时默认动作
    // }
}

export const defaultConfig: Live2DConfig = {
    canvasSize: 'auto',
    canvasWidth: '15vw',
    canvasHeight: '40vh',
    canvasPosition: 'right',
    viewScale: 1.0,
    viewMaxScale: 2.0,
    viewMinScale: 0.5,
    viewLogicalLeft: -1.0,
    viewLogicalRight: 1.0,
    viewLogicalBottom: -1.0,
    viewLogicalTop: 1.0,
    viewLogicalMaxLeft: -2.0,
    viewLogicalMaxRight: 2.0,
    viewLogicalMaxBottom: -2.0,
    viewLogicalMaxTop: 2.0,
    modelDir: '',
    resourcesPath: '',
    motionGroupIdle: 'Idle',
    motionGroupTapBody: 'TapBody',
    hitAreaNameHead: 'Head',
    hitAreaNameBody: 'Body',
    priorityNone: 0,
    priorityIdle: 1,
    priorityNormal: 2,
    priorityForce: 3,
    MOCConsistencyValidationEnable: true,
    motionConsistencyValidationEnable: true,
    debugLogEnable: false,
    debugTouchLogEnable: false,
    expressionNames: {
        'default': '',
    },
    motionNames: {
        'default': { group: '', no: -1 , priority: 0},
    }
}