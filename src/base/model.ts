/**
 * 模型基础类
 * 负责管理模型的加载、初始化、更新、执行动作和渲染等功能。
 */

import { CubismDefaultParameterId } from '@framework/cubismdefaultparameterid';
import { CubismModelSettingJson } from '@framework/cubismmodelsettingjson';
import {
    BreathParameterData,
    CubismBreath
} from '@framework/effect/cubismbreath';
import { CubismEyeBlink } from '@framework/effect/cubismeyeblink';
import { ICubismModelSetting } from '@framework/icubismmodelsetting';
import { CubismIdHandle } from '@framework/id/cubismid';
import { CubismFramework } from '@framework/live2dcubismframework';
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismUserModel } from '@framework/model/cubismusermodel';
import {
    ACubismMotion,
    BeganMotionCallback,
    FinishedMotionCallback
} from '@framework/motion/acubismmotion';
import { CubismMotion } from '@framework/motion/cubismmotion';
import {
    CubismMotionQueueEntryHandle,
    InvalidMotionQueueEntryHandleValue
} from '@framework/motion/cubismmotionqueuemanager';
import { csmMap } from '@framework/type/csmmap';
import { csmRect } from '@framework/type/csmrectf';
import { csmString } from '@framework/type/csmstring';
import { csmVector } from '@framework/type/csmvector';
import {
    CSM_ASSERT,
    CubismLogError,
    CubismLogInfo
} from '@framework/utils/cubismdebug';
import { CubismMoc } from '@framework/model/cubismmoc';

import { Define } from '../config/loadDefine';
import { Utils } from './utils';
import { TextureInfo, viewManager } from './view';

enum LoadStep {
    LoadAssets,
    LoadModel,
    WaitLoadModel,
    LoadExpression,
    WaitLoadExpression,
    LoadPhysics,
    WaitLoadPhysics,
    LoadPose,
    WaitLoadPose,
    SetupEyeBlink,
    SetupBreath,
    LoadUserData,
    WaitLoadUserData,
    SetupEyeBlinkIds,
    SetupLipSyncIds,
    SetupLayout,
    LoadMotion,
    WaitLoadMotion,
    CompleteInitialize,
    CompleteSetupModel,
    LoadTexture,
    WaitLoadTexture,
    CompleteSetup
}

/**
 * live2d模型的实现类
 * 模型生成、功能组件生成、更新处理和渲染
 */
export class Model extends CubismUserModel {

    _viewManager: viewManager;

    _modelSetting: ICubismModelSetting; // 模型设置信息
    _modelHomeDir: string; // 模型设置信息所在目录
    _userTimeSeconds: number; // 增量时间的积算值[秒]

    _eyeBlinkIds: csmVector<CubismIdHandle>; // 为模型设置的瞬时功能参数ID
    _lipSyncIds: csmVector<CubismIdHandle>; // 为模型设置的瞬时功能参数ID

    _motions: csmMap<string, ACubismMotion>; // 读取的运动列表
    _expressions: csmMap<string, ACubismMotion>; // 读取的表情列表

    _hitArea: csmVector<csmRect>;
    _userArea: csmVector<csmRect>;

    _idParamAngleX: CubismIdHandle; // 参数ID: ParamAngleX
    _idParamAngleY: CubismIdHandle; // 参数ID: ParamAngleY
    _idParamAngleZ: CubismIdHandle; // 参数ID: ParamAngleZ
    _idParamEyeBallX: CubismIdHandle; // 参数ID: ParamEyeBallX
    _idParamEyeBallY: CubismIdHandle; // 参数ID: ParamEyeBallY
    _idParamBodyAngleX: CubismIdHandle; // 参数ID: ParamBodyAngleX

    _idParamMouthOpenY: CubismIdHandle; // 参数ID: ParamMouthOpenY
    _MouthOpenValue: number; // 嘴巴打开度
    _MouthOpenWeight: number; // 嘴巴打开度权重

    _state: LoadStep; // 当前状态
    _expressionCount: number; // 表情数据计数
    _textureCount: number; // 纹理计数
    _motionCount: number; // 运动数据计数
    _allMotionCount: number; // 运动总数
    _consistency: boolean; // MOC3整合性检查管理用

    /**
     * 构造函数。
     */
    public constructor(viewManager: viewManager) {
        super();

        this._viewManager = viewManager;

        this._modelSetting = null;
        this._modelHomeDir = Define.resourcesPath + Define.modelDir + '/';
        this._userTimeSeconds = 0.0;

        this._eyeBlinkIds = new csmVector<CubismIdHandle>();
        this._lipSyncIds = new csmVector<CubismIdHandle>();

        this._motions = new csmMap<string, ACubismMotion>();
        this._expressions = new csmMap<string, ACubismMotion>();

        this._hitArea = new csmVector<csmRect>();
        this._userArea = new csmVector<csmRect>();

        this._idParamAngleX = CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamAngleX
        );
        this._idParamAngleY = CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamAngleY
        );
        this._idParamAngleZ = CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamAngleZ
        );
        this._idParamEyeBallX = CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamEyeBallX
        );
        this._idParamEyeBallY = CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamEyeBallY
        );
        this._idParamBodyAngleX = CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamBodyAngleX
        );
        this._idParamMouthOpenY = CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamMouthOpenY
        );


        if (Define.MOCConsistencyValidationEnable) {
            this._mocConsistency = true;
        }

        if (Define.motionConsistencyValidationEnable) {
            this._motionConsistency = true;
        }

        this._state = LoadStep.LoadAssets;
        this._expressionCount = 0;
        this._textureCount = 0;
        this._motionCount = 0;
        this._allMotionCount = 0;
        this._MouthOpenValue = 0.0;
        this._MouthOpenWeight = 0.8; // 默认为0.8
        this._consistency = false;
        // 加载模型
        this.loadAssets();
    }

    public release(): void {
        super.release();
    }

    /**
    * 释放所有运动数据。
    */
    public releaseMotions(): void {
        this._motions.clear();
    }

    /**
     * 释放所有表情数据。
     */
    public releaseExpressions(): void {
        this._expressions.clear();
    }

    public getLoadState(): boolean {
        if (this._state == LoadStep.CompleteSetup) return true;
        return false;
    }

    public getAllMotions(): { group: string, names: string[] }[] | null {

        if (this._state != LoadStep.CompleteSetup || !this._modelSetting) {
            return null; // 模型未加载完成，返回null
        }

        const motionsNames: { group: string, names: string[] }[] = [];

        const groupCount = this._modelSetting.getMotionGroupCount();
        const reg = /.*\//g;
        for (let i: number = 0; i < groupCount; i++) {
            const groupName = this._modelSetting.getMotionGroupName(i);
            const motionCount = this._modelSetting.getMotionCount(groupName);
            const Names: string[] = [];
            for (let j: number = 0; j < motionCount; j++) {
                // 剪切掉'.*/'和'.motion3.json'
                Names.push(this._modelSetting.getMotionFileName(groupName, j).replace('.motion3.json', '').replace(reg, ''));
            }
            motionsNames.push({ group: groupName, names: Names });
        }

        return motionsNames;
    }

    public getAllExpressions(): string[] | null {
        if (this._state != LoadStep.CompleteSetup || !this._modelSetting) {
            return null; // 模型未加载完成，返回null
        }

        const count: number = this._modelSetting.getExpressionCount();
        const expsNames: string[] = [];
        for (let i: number = 0; i < count; i++) {
            expsNames.push(this._modelSetting.getExpressionName(i)); // 获取表情名称
        }

        return expsNames;
    }

    /**
     * 加载样式
     * 模型从model3.json所在的目录和文件路径生成
     * @param dir 目录
     * @param fileName 文件名称
     */
    public loadAssets(): void {
        const fileName: string = Define.modelDir + '.model3.json';

        fetch(`${this._modelHomeDir}${fileName}`)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
                const setting: ICubismModelSetting = new CubismModelSettingJson(
                    arrayBuffer,
                    arrayBuffer.byteLength
                );

                // 更新状态
                this._state = LoadStep.LoadModel;

                // 保存结果
                this.setupModel(setting);
            })
            .catch(error => {
                // 读取model3.json时出错时，绘制不可能，因此不setup并catch错误
                CubismLogError(`Failed to load file ${this._modelHomeDir}.model3.json`);
            });
    }

    /**
     * model3.json模型生成。
     * model3.json的描述中，模型生成、运动、物理运算等组件的生成。
     *
     * @param setting ICubismModelSetting的实例
     */
    private setupModel(setting: ICubismModelSetting): void {
        this._updating = true;
        this._initialized = false;

        this._modelSetting = setting;

        // CubismModel
        if (this._modelSetting.getModelFileName() != '') {
            const modelFileName = this._modelSetting.getModelFileName();

            fetch(`${this._modelHomeDir}${modelFileName}`)
                .then(response => {
                    if (response.ok) {
                        return response.arrayBuffer();
                    } else if (response.status >= 400) {
                        CubismLogError(
                            `Failed to load file ${this._modelHomeDir}${modelFileName}`
                        );
                        return new ArrayBuffer(0);
                    }
                })
                .then(arrayBuffer => {
                    this.loadModel(arrayBuffer, this._mocConsistency);
                    this._state = LoadStep.LoadExpression;

                    // callback
                    loadCubismExpression();
                });
            this._state = LoadStep.WaitLoadModel;
        } else {
            Utils.printMessage('Model data does not exist.');
        }

        // Expression
        const loadCubismExpression = (): void => {
            if (this._modelSetting.getExpressionCount() > 0) {
                const count: number = this._modelSetting.getExpressionCount();

                for (let i = 0; i < count; i++) {
                    const expressionName = this._modelSetting.getExpressionName(i);
                    const expressionFileName =
                        this._modelSetting.getExpressionFileName(i);

                    fetch(`${this._modelHomeDir}${expressionFileName}`)
                        .then(response => {
                            if (response.ok) {
                                return response.arrayBuffer();
                            } else if (response.status >= 400) {
                                CubismLogError(
                                    `Failed to load file ${this._modelHomeDir}${expressionFileName}`
                                );
                                // 读取文件失败时，返回空的ArrayBuffer
                                return new ArrayBuffer(0);
                            }
                        })
                        .then(arrayBuffer => {
                            const motion: ACubismMotion = this.loadExpression(
                                arrayBuffer,
                                arrayBuffer.byteLength,
                                expressionName
                            );

                            if (this._expressions.getValue(expressionName) != null) {
                                ACubismMotion.delete(
                                    this._expressions.getValue(expressionName)
                                );
                                this._expressions.setValue(expressionName, null);
                            }

                            this._expressions.setValue(expressionName, motion);

                            this._expressionCount++;

                            if (this._expressionCount >= count) {
                                this._state = LoadStep.LoadPhysics;

                                // callback
                                loadCubismPhysics();
                            }
                        });
                }
                this._state = LoadStep.WaitLoadExpression;
            } else {
                this._state = LoadStep.LoadPhysics;

                // callback
                loadCubismPhysics();
            }
        };

        // Physics
        const loadCubismPhysics = (): void => {
            if (this._modelSetting.getPhysicsFileName() != '') {
                const physicsFileName = this._modelSetting.getPhysicsFileName();

                fetch(`${this._modelHomeDir}${physicsFileName}`)
                    .then(response => {
                        if (response.ok) {
                            return response.arrayBuffer();
                        } else if (response.status >= 400) {
                            CubismLogError(
                                `Failed to load file ${this._modelHomeDir}${physicsFileName}`
                            );
                            return new ArrayBuffer(0);
                        }
                    })
                    .then(arrayBuffer => {
                        this.loadPhysics(arrayBuffer, arrayBuffer.byteLength);

                        this._state = LoadStep.LoadPose;

                        // callback
                        loadCubismPose();
                    });
                this._state = LoadStep.WaitLoadPhysics;
            } else {
                this._state = LoadStep.LoadPose;

                // callback
                loadCubismPose();
            }
        };

        // Pose
        const loadCubismPose = (): void => {
            if (this._modelSetting.getPoseFileName() != '') {
                const poseFileName = this._modelSetting.getPoseFileName();

                fetch(`${this._modelHomeDir}${poseFileName}`)
                    .then(response => {
                        if (response.ok) {
                            return response.arrayBuffer();
                        } else if (response.status >= 400) {
                            CubismLogError(
                                `Failed to load file ${this._modelHomeDir}${poseFileName}`
                            );
                            return new ArrayBuffer(0);
                        }
                    })
                    .then(arrayBuffer => {
                        this.loadPose(arrayBuffer, arrayBuffer.byteLength);

                        this._state = LoadStep.SetupEyeBlink;

                        // callback
                        setupEyeBlink();
                    });
                this._state = LoadStep.WaitLoadPose;
            } else {
                this._state = LoadStep.SetupEyeBlink;

                // callback
                setupEyeBlink();
            }
        };

        // EyeBlink
        const setupEyeBlink = (): void => {
            if (this._modelSetting.getEyeBlinkParameterCount() > 0) {
                this._eyeBlink = CubismEyeBlink.create(this._modelSetting);
                this._state = LoadStep.SetupBreath;
            }

            // callback
            setupBreath();
        };

        // Breath
        const setupBreath = (): void => {
            this._breath = CubismBreath.create();

            const breathParameters: csmVector<BreathParameterData> = new csmVector();
            breathParameters.pushBack(
                new BreathParameterData(this._idParamAngleX, 0.0, 15.0, 6.5345, 0.5)
            );
            breathParameters.pushBack(
                new BreathParameterData(this._idParamAngleY, 0.0, 8.0, 3.5345, 0.5)
            );
            breathParameters.pushBack(
                new BreathParameterData(this._idParamAngleZ, 0.0, 10.0, 5.5345, 0.5)
            );
            breathParameters.pushBack(
                new BreathParameterData(this._idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5)
            );
            breathParameters.pushBack(
                new BreathParameterData(
                    CubismFramework.getIdManager().getId(
                        CubismDefaultParameterId.ParamBreath
                    ),
                    0.5,
                    0.5,
                    3.2345,
                    1
                )
            );

            this._breath.setParameters(breathParameters);
            this._state = LoadStep.LoadUserData;

            // callback
            loadUserData();
        };

        // UserData
        const loadUserData = (): void => {
            if (this._modelSetting.getUserDataFile() != '') {
                const userDataFile = this._modelSetting.getUserDataFile();

                fetch(`${this._modelHomeDir}${userDataFile}`)
                    .then(response => {
                        if (response.ok) {
                            return response.arrayBuffer();
                        } else if (response.status >= 400) {
                            CubismLogError(
                                `Failed to load file ${this._modelHomeDir}${userDataFile}`
                            );
                            return new ArrayBuffer(0);
                        }
                    })
                    .then(arrayBuffer => {
                        this.loadUserData(arrayBuffer, arrayBuffer.byteLength);

                        this._state = LoadStep.SetupEyeBlinkIds;

                        // callback
                        setupEyeBlinkIds();
                    });

                this._state = LoadStep.WaitLoadUserData;
            } else {
                this._state = LoadStep.SetupEyeBlinkIds;

                // callback
                setupEyeBlinkIds();
            }
        };

        // EyeBlinkIds
        const setupEyeBlinkIds = (): void => {
            const eyeBlinkIdCount: number =
                this._modelSetting.getEyeBlinkParameterCount();

            for (let i = 0; i < eyeBlinkIdCount; ++i) {
                this._eyeBlinkIds.pushBack(
                    this._modelSetting.getEyeBlinkParameterId(i)
                );
            }

            this._state = LoadStep.SetupLipSyncIds;

            // callback
            setupLipSyncIds();
        };

        // LipSyncIds
        const setupLipSyncIds = (): void => {
            const lipSyncIdCount = this._modelSetting.getLipSyncParameterCount();

            for (let i = 0; i < lipSyncIdCount; ++i) {
                this._lipSyncIds.pushBack(this._modelSetting.getLipSyncParameterId(i));
            }
            this._state = LoadStep.SetupLayout;

            // callback
            setupLayout();
        };

        // Layout
        const setupLayout = (): void => {
            const layout: csmMap<string, number> = new csmMap<string, number>();

            if (this._modelSetting == null || this._modelMatrix == null) {
                CubismLogError('Failed to setupLayout().');
                return;
            }

            this._modelSetting.getLayoutMap(layout);
            this._modelMatrix.setupFromLayout(layout);
            this._state = LoadStep.LoadMotion;

            // callback
            loadCubismMotion();
        };

        // Motion
        const loadCubismMotion = (): void => {
            this._state = LoadStep.WaitLoadMotion;
            this._model.saveParameters();
            this._allMotionCount = 0;
            this._motionCount = 0;
            const group: string[] = [];

            const motionGroupCount: number = this._modelSetting.getMotionGroupCount();

            // 计算运动的总数
            for (let i = 0; i < motionGroupCount; i++) {
                group[i] = this._modelSetting.getMotionGroupName(i);
                this._allMotionCount += this._modelSetting.getMotionCount(group[i]);
            }

            // 读取运动
            for (let i = 0; i < motionGroupCount; i++) {
                this.preLoadMotionGroup(group[i]);
            }

            // 没有运动的情况
            if (motionGroupCount == 0) {
                this._state = LoadStep.LoadTexture;

                // 停止所有运动
                this._motionManager.stopAllMotions();

                this._updating = false;
                this._initialized = true;

                this.createRenderer();
                this.setupTextures();
                this.getRenderer().startUp(this._viewManager.getGl());
            }
        };
    }

    /**
     * 加载纹理
     */
    private setupTextures(): void {
        // iPhone为了提高阿尔法质量Typescript premultipliedAlpha设置true
        const usePremultiply = true;

        if (this._state == LoadStep.LoadTexture) {
            // 读取纹理
            const textureCount: number = this._modelSetting.getTextureCount();

            for (
                let modelTextureNumber = 0;
                modelTextureNumber < textureCount;
                modelTextureNumber++
            ) {
                // 纹理名称为空字符串时，跳过加载和绑定处理
                if (this._modelSetting.getTextureFileName(modelTextureNumber) == '') {
                    console.log('getTextureFileName null');
                    continue;
                }

                // WebGL的纹理单元加载纹理
                let texturePath =
                    this._modelSetting.getTextureFileName(modelTextureNumber);
                texturePath = this._modelHomeDir + texturePath;

                // 加载完成时调用的回调函数
                const onLoad = (textureInfo: TextureInfo): void => {
                    this.getRenderer().bindTexture(modelTextureNumber, textureInfo.id);

                    this._textureCount++;

                    if (this._textureCount >= textureCount) {
                        // 加载完成
                        this._state = LoadStep.CompleteSetup;
                    }
                };

                // 加载纹理
                this._viewManager.createTextureFromPngFile(texturePath, usePremultiply, onLoad);
                this.getRenderer().setIsPremultipliedAlpha(usePremultiply);
            }

            this._state = LoadStep.WaitLoadTexture;
        }
    }

    /**
     * 重新构建渲染器
     */
    public reloadRenderer(): void {
        this.deleteRenderer();
        this.createRenderer();
        this.setupTextures();
    }

    /**
     * 更新
     */
    public update(): void {
        if (this._state != LoadStep.CompleteSetup) return;

        const deltaTimeSeconds: number = Utils.getDeltaTime();
        this._userTimeSeconds += deltaTimeSeconds;

        this._dragManager.update(deltaTimeSeconds);
        this._dragX = this._dragManager.getX();
        this._dragY = this._dragManager.getY();

        // 模型参数更新的标志
        let motionUpdated = false;

        //--------------------------------------------------------------------------
        this._model.loadParameters(); // 加载前一次保存的状态
        if (this._motionManager.isFinished()) {
            // 没有正在播放的运动时，进行默认闲置动作
            if (Define.motionNames.default.group)
                this.startMotion(
                    Define.motionNames.default.group,
                    Define.motionNames.default.no,
                    Define.priorityIdle
                );
            // 未设置默认动作则会保持当前动作
        } else {
            motionUpdated = this._motionManager.updateMotion(
                this._model,
                deltaTimeSeconds
            ); // 更新运动
        }
        this._model.saveParameters(); // 保存状态
        //--------------------------------------------------------------------------

        // 眨眼
        if (!motionUpdated) {
            if (this._eyeBlink != null) {
                // 没有正在播放的运动时
                this._eyeBlink.updateParameters(this._model, deltaTimeSeconds); // 眨眼
            }
        }

        if (this._expressionManager != null) {
            this._expressionManager.updateMotion(this._model, deltaTimeSeconds); // 表情更新
        }

        // 默认面部和身体跟随鼠标移动 没有绑定时参数都为0
        // 鼠标移动导致的变化
        // 鼠标移动的面部朝向调整
        this._model.addParameterValueById(this._idParamAngleX, this._dragX * 30); // 加-30到30的值
        this._model.addParameterValueById(this._idParamAngleY, this._dragY * 30);
        this._model.addParameterValueById(
            this._idParamAngleZ,
            this._dragX * this._dragY * -30
        );

        // 鼠标移动导致的身体朝向调整
        this._model.addParameterValueById(
            this._idParamBodyAngleX,
            this._dragX * 10
        ); // 身体的X轴旋转角度

        // 鼠标移动导致的眼睛朝向调整
        this._model.addParameterValueById(this._idParamEyeBallX, this._dragX); // 加-1到1的值
        this._model.addParameterValueById(this._idParamEyeBallY, this._dragY);

        // 呼吸
        if (this._breath != null) {
            this._breath.updateParameters(this._model, deltaTimeSeconds);
        }

        // 物理演算的设置
        if (this._physics != null) {
            this._physics.evaluate(this._model, deltaTimeSeconds);
        }

        if (this._lipsync) { // 确定开启控制嘴唇
            if (!this._lipSyncIds.getSize()) return; // 确定是否可以控制 原模型支持但配置文件内没有则需要手动添加
                this._model.addParameterValueById(this._idParamMouthOpenY, this._MouthOpenValue, this._MouthOpenWeight);
        }

        // pose的设置
        if (this._pose != null) {
            this._pose.updateParameters(this._model, deltaTimeSeconds);
        }

        this._model.update();
    }

    /**
     * 开始播放指定的运动
     * @param group 运动组名
     * @param no 组内编号
     * @param priority 优先级
     * @param onFinishedMotionHandler 运动播放结束时调用的回调函数
     * @return 开始播放的运动的标识号，用于判断是否结束。开始失败时返回[-1]
     */
    public startMotion(
        group: string,
        no: number,
        priority: number,
        onFinishedMotionHandler?: FinishedMotionCallback,
        onBeganMotionHandler?: BeganMotionCallback
    ): CubismMotionQueueEntryHandle {
        if (priority == Define.priorityForce) {
            this._motionManager.setReservePriority(priority);
        } else if (!this._motionManager.reserveMotion(priority)) {
            if (this._debugMode) {
                Utils.printMessage("[APP]can't start motion.");
            }
            return InvalidMotionQueueEntryHandleValue;
        }

        const motionFileName = this._modelSetting.getMotionFileName(group, no);

        const name = `${group}_${no}`;
        let motion: CubismMotion = this._motions.getValue(name) as CubismMotion;
        let autoDelete = false;

        if (motion == null) {
            fetch(`${this._modelHomeDir}${motionFileName}`)
                .then(response => {
                    if (response.ok) {
                        return response.arrayBuffer();
                    } else if (response.status >= 400) {
                        CubismLogError(
                            `Failed to load file ${this._modelHomeDir}${motionFileName}`
                        );
                        return new ArrayBuffer(0);
                    }
                })
                .then(arrayBuffer => {
                    motion = this.loadMotion(
                        arrayBuffer,
                        arrayBuffer.byteLength,
                        null,
                        onFinishedMotionHandler,
                        onBeganMotionHandler,
                        this._modelSetting,
                        group,
                        no,
                        this._motionConsistency
                    );
                });

            if (motion) {
                motion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);
                autoDelete = true; // 播放结束时删除内存
            } else {
                CubismLogError("Can't start motion {0} .", motionFileName);
                // 加载失败的运动的ReservePriority重置为无
                this._motionManager.setReservePriority(Define.priorityNone);
                return InvalidMotionQueueEntryHandleValue;
            }
        } else {
            motion.setBeganMotionHandler(onBeganMotionHandler);
            motion.setFinishedMotionHandler(onFinishedMotionHandler);
        }

        if (this._debugMode) {
            Utils.printMessage(`[APP]start motion: [${group}_${no}]`);
        }
        return this._motionManager.startMotionPriority(
            motion,
            autoDelete,
            priority
        );
    }

    /**
     * 随机选择一个运动并开始播放
     * @param group 运动组名
     * @param priority 优先级
     * @param onFinishedMotionHandler 运动播放结束时调用的回调函数
     * @return 开始播放的运动的标识号，用于判断是否结束。开始失败时返回[-1]
     */
    public startRandomMotion(
        group: string,
        priority: number,
        onFinishedMotionHandler?: FinishedMotionCallback,
        onBeganMotionHandler?: BeganMotionCallback
    ): CubismMotionQueueEntryHandle {
        if (this._modelSetting.getMotionCount(group) == 0) {
            return InvalidMotionQueueEntryHandleValue;
        }

        const no: number = Math.floor(
            Math.random() * this._modelSetting.getMotionCount(group)
        );

        return this.startMotion(
            group,
            no,
            priority,
            onFinishedMotionHandler,
            onBeganMotionHandler
        );
    }

    /**
     * 设置指定的表情运动
     * @param expressionId 表情运动的ID
     */
    public setExpression(expressionId: string): void {
        const motion: ACubismMotion = this._expressions.getValue(expressionId);

        if (this._debugMode) {
            Utils.printMessage(`[APP]expression: [${expressionId}]`);
        }

        if (motion != null) {
            this._expressionManager.startMotion(motion, false);
        } else {
            if (this._debugMode) {
                Utils.printMessage(`[APP]expression[${expressionId}] is null`);
            }
        }
    }

    /**
     * 随机选择一个表情运动并设置
     */
    public setRandomExpression(): void {
        if (this._expressions.getSize() == 0) {
            return;
        }

        const no: number = Math.floor(Math.random() * this._expressions.getSize());

        for (let i = 0; i < this._expressions.getSize(); i++) {
            if (i == no) {
                const name: string = this._expressions._keyValues[i].first;
                this.setExpression(name);
                return;
            }
        }
    }

    /**
     * 接收事件的触发
     */
    public motionEventFired(eventValue: csmString): void {
        CubismLogInfo('{0} is fired on LAppModel!!', eventValue.s);
    }

    /**
     * 命中判定测试 判断点击位置
     * 根据指定ID的顶点列表计算矩形，判定坐标是否在矩形范围内。
     *
     * @param hitArenaName  命中判定测试的目标ID
     * @param x             判定的X坐标
     * @param y             判定的Y坐标
     */
    public hitTest(hitArenaName: string, x: number, y: number): boolean {
        // 透明时则无命中判定。
        if (this._opacity < 1) {
            return false;
        }

        const count: number = this._modelSetting.getHitAreasCount();

        for (let i = 0; i < count; i++) {
            if (this._modelSetting.getHitAreaName(i) == hitArenaName) {
                const drawId: CubismIdHandle = this._modelSetting.getHitAreaId(i);
                return this.isHit(drawId, x, y);
            }
        }

        return false;
    }

    /**
     * 批量加载指定组名的运动数据。
     * 运动数据的名称由ModelSetting内部获取。
     *
     * @param group 运动数据的组名
     */
    public preLoadMotionGroup(group: string): void {
        for (let i = 0; i < this._modelSetting.getMotionCount(group); i++) {
            const motionFileName = this._modelSetting.getMotionFileName(group, i);

            const name = `${group}_${i}`;
            if (this._debugMode) {
                Utils.printMessage(
                    `[APP]load motion: ${motionFileName} => [${name}]`
                );
            }

            fetch(`${this._modelHomeDir}${motionFileName}`)
                .then(response => {
                    if (response.ok) {
                        return response.arrayBuffer();
                    } else if (response.status >= 400) {
                        CubismLogError(
                            `Failed to load file ${this._modelHomeDir}${motionFileName}`
                        );
                        return new ArrayBuffer(0);
                    }
                })
                .then(arrayBuffer => {
                    const tmpMotion: CubismMotion = this.loadMotion(
                        arrayBuffer,
                        arrayBuffer.byteLength,
                        name,
                        null,
                        null,
                        this._modelSetting,
                        group,
                        i,
                        this._motionConsistency
                    );

                    if (tmpMotion != null) {
                        tmpMotion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);

                        if (this._motions.getValue(name) != null) {
                            ACubismMotion.delete(this._motions.getValue(name));
                        }

                        this._motions.setValue(name, tmpMotion);

                        this._motionCount++;
                    } else {
                        // 加载运动数据失败时，减少总运动数
                        this._allMotionCount--;
                    }

                    if (this._motionCount >= this._allMotionCount) {
                        this._state = LoadStep.LoadTexture;

                        // 停止所有运动
                        this._motionManager.stopAllMotions();

                        this._updating = false;
                        this._initialized = true;

                        this.createRenderer();
                        this.setupTextures();
                        this.getRenderer().startUp(
                            this._viewManager.getGl()
                        );
                    }
                });
        }
    }


    /**
     * 控制嘴巴大小
     * 
     * @param vlaue 0-1
     * @param weight 0.8
     */
    public setLipSync(vlaue: number, weight?: number): void {
        this._MouthOpenValue = vlaue;
        if(weight) this._MouthOpenWeight = weight;
    }

    

    /**
     * 绘制模型。
     */
    public doDraw(): void {
        if (this._model == null) return;

        // 传递画布大小
        const canvas = this._viewManager.getCanvas();
        const viewport: number[] = [0, 0, canvas.width, canvas.height];

        const gl = this._viewManager.getGl();

        this.getRenderer().setRenderState(
            gl.getParameter(gl.FRAMEBUFFER_BINDING),
            viewport
        );
        this.getRenderer().drawModel();
    }

    /**
     * 绘制模型。
     */
    public draw(matrix: CubismMatrix44): void {
        if (this._model == null) {
            return;
        }

        // 各读取完成后
        if (this._state == LoadStep.CompleteSetup) {
            matrix.multiplyByMatrix(this._modelMatrix);

            this.getRenderer().setMvpMatrix(matrix);

            this.doDraw();
        }
    }

    public async hasMocConsistencyFromFile() {
        CSM_ASSERT(this._modelSetting.getModelFileName().localeCompare(``));

        // CubismModel
        if (this._modelSetting.getModelFileName() != '') {
            const modelFileName = this._modelSetting.getModelFileName();

            const response = await fetch(`${this._modelHomeDir}${modelFileName}`);
            const arrayBuffer = await response.arrayBuffer();

            this._consistency = CubismMoc.hasMocConsistency(arrayBuffer);

            if (!this._consistency) {
                CubismLogInfo('Inconsistent MOC3.');
            } else {
                CubismLogInfo('Consistent MOC3.');
            }

            return this._consistency;
        } else {
            Utils.printMessage('Model data does not exist.');
        }
    }
}