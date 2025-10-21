import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(async ({ command, mode }) => {
  const plugins = [vue()]

  // 只在本機開發模式載入 devtools（避免 build 時觸發 localStorage）
  if (command === 'serve') {
    const { default: VueDevTools } = await import('vite-plugin-vue-devtools')
    plugins.push(VueDevTools())
  }

  return {
    plugins,
  }
})
