module.exports = {
  apps: [
    {
      name: "fly-brain-snn",
      cwd: __dirname,
      script: "./.venv/bin/python",
      args: "src/web_server.py --port 8765",
      autorestart: true,
      max_restarts: 30,
      min_uptime: "5s",
      restart_delay: 1000,
      exp_backoff_restart_delay: 200,
      watch: ["src"],
      ignore_watch: ["__pycache__", "data", "tests", ".venv"],
      env: {
        PYTHONUNBUFFERED: "1",
        PORT: "8765"
      }
    }
  ]
};
