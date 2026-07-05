/**
 * PM2 cluster config for production — run from repo root:
 *   npx pm2 start ecosystem.config.js
 *   npx pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'sports-api',
      cwd: './backend',
      script: 'server.js',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      listen_timeout: 10_000,
      kill_timeout: 10_000,
    },
  ],
};
