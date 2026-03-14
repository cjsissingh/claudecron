export const apps = [
  {
    name: 'claudecron',
    script: 'dist/server/index.js',
    watch: false,
    autorestart: true,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  },
];
