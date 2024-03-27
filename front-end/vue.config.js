export default {
  devServer: {
    port: 8090, // Using a different port (8090) to fix the ws websocket issue
    proxy: {
      '^/api': {
        target: 'http://localhost:3009',
      },
    },
  },
}
