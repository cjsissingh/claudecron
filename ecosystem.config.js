module.exports = {
  apps: [
    {
      name: 'claudecron',
      script: 'server/index.js',
      watch: false,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
