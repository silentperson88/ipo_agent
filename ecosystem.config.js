module.exports = {
  apps: [
    {
      name: 'ipo-dashboard',
      script: 'dashboard/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5050
      }
    },
    {
      name: 'ipo-scheduler',
      script: 'services/scheduler.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
