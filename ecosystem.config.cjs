module.exports = {
  apps: [
    {
      name: "e-ink-server",
      script: "./dist/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
