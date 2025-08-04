import { defaultConfig } from './define'

export let Define = defaultConfig;
export let Motions = {};
export let Expressions = {};

export const loadConfigFromFile = async (configPath?: string | Object): Promise<void> => {
  try {
    let userConfig;
    if (typeof configPath === 'string') {
      const response = await fetch(configPath);
      userConfig = await response.json();
    } else {
      userConfig = configPath;
    }
    const mergedConfig = { ...defaultConfig, ...userConfig };
    Define = mergedConfig;
    Motions = Define.motionNames;
    Expressions = Define.expressionNames;
  } catch (error) {
    console.warn('Failed to load config file, using default config:', error);
    Define = defaultConfig;
  }
}