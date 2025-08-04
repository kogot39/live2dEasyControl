import { defineConfig, UserConfig, ConfigEnv } from 'vite';
import path from 'path';

export default defineConfig((env: ConfigEnv): UserConfig => {
  let common: UserConfig = {
    server: {
      port: 5000,
    },
    root: './',
    base: '/',
    publicDir: './public',
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@framework': path.resolve(__dirname, './Framework/src'),
      }
    },
    esbuild: {
      drop: ['console', 'debugger'],
    },
    build: {
      target: 'modules',
      assetsDir: 'assets',
      outDir: './dist',
      sourcemap: env.mode == 'development' ? true : false,
      lib: {
        entry: path.resolve(__dirname, './autoLoad.ts'),
        name: 'live2dEasyControl',
        fileName: 'live2dEasyControl',
      }
    },
  };
  return common;
});
