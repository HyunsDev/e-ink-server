module.exports = {
  apps: [
    {
      name: "e-ink-server",
      cwd: __dirname,
      script: "pnpm",
      args: "start",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      time: true,
      restart_delay: 1000,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3000",
      },
    },
  ],
};
