module.exports = {
  apps: [
    {
      name: 'acsqd-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3008,
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0',
        ML_API_URL: 'http://localhost:8000',
        CORS_ORIGIN: 'http://localhost:3000'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3008,
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0',
        ML_API_URL: 'http://10.42.68.175:8000',
        CORS_ORIGIN: 'http://10.42.68.175:3000'
      },
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs'],
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'acsqd-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        REACT_APP_API_URL: 'http://localhost:3008'
      },
      env_production: {
        NODE_ENV: 'production',
        REACT_APP_API_URL: 'http://10.42.68.175:3008'
      },
      watch: ['src'],
      ignore_watch: ['node_modules', 'build'],
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'acsqd-ollama',
      cwd: '.',
      script: 'ollama',
      args: 'serve',
      instances: 1,
      exec_mode: 'fork',
      env: {
        OLLAMA_HOST: '0.0.0.0:11434'
      },
      env_production: {
        OLLAMA_HOST: '0.0.0.0:11434'
      },
      watch: false,
      log_file: './logs/ollama.log',
      out_file: './logs/ollama-out.log',
      error_file: './logs/ollama-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'acsqd-ml-models',
      cwd: './ml_models',
      script: 'sh',
      args: '-c "source venv/bin/activate && python main.py"',
      instances: 1,
      exec_mode: 'fork',
      depends_on: ['acsqd-ollama'],
      env: {
        PYTHONPATH: './ml_models',
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0',
        OLLAMA_HOST: 'http://localhost:11434'
      },
      env_production: {
        PYTHONPATH: './ml_models',
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0',
        OLLAMA_HOST: 'http://10.42.68.175:11434'
      },
      watch: ['*.py'],
      ignore_watch: ['venv', '__pycache__'],
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'mongo-client-server',
      cwd: './mongo-client/server',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        MONGO_URL: 'mongodb+srv://deepak:h0ASt7mfso5KlOHl@cluster0.clgc6xj.mongodb.net/quality_dashboard?retryWrites=true&w=majority&appName=Cluster0'
      },
      watch: ['*.js'],
      ignore_watch: ['node_modules', 'logs'],
      log_file: './logs/mongo-client-server.log',
      out_file: './logs/mongo-client-server-out.log',
      error_file: './logs/mongo-client-server-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'mongo-client-frontend',
      cwd: './mongo-client/client',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3010,
        REACT_APP_API_URL: 'http://localhost:5001/api'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3010,
        REACT_APP_API_URL: 'http://10.42.68.175:5001/api'
      },
      watch: ['src'],
      ignore_watch: ['node_modules', 'build'],
      log_file: './logs/mongo-client-frontend.log',
      out_file: './logs/mongo-client-frontend-out.log',
      error_file: './logs/mongo-client-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
