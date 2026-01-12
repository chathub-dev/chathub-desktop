import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      minify: true
    }
  },
  preload: {},
  renderer: {}
})
