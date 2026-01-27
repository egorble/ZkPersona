// PM2 ecosystem configuration for production
// Використовується для постійної роботи backend на VPS
// PM2 ecosystem.config.js використовує CommonJS (навіть якщо проект ES modules)

module.exports = {
  apps: [{
    name: 'zkpersona-backend',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
