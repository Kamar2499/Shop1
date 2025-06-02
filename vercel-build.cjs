const { execSync } = require('child_process');
const { join } = require('path');
require('dotenv').config({ override: true });

console.log('DEBUG POSTGRES_URL_NON_POOLING:', process.env.POSTGRES_URL_NON_POOLING);
console.log('DEBUG DATABASE_URL:', process.env.DATABASE_URL);

async function run() {
  try {
    console.log('Installing dependencies...');
    execSync('npm install', { 
      stdio: 'inherit',
      env: { 
        ...process.env, 
        NODE_ENV: 'production'
      }
    });

    // Debug: Print all environment variables
    console.log('Environment variables:');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('POSTGRES_URL_NON_POOLING:', process.env.POSTGRES_URL_NON_POOLING ? 'Set' : 'Not set');
    console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set');
    console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL ? 'Set' : 'Not set');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');

    // Проверяем наличие переменных окружения
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'JWT_SECRET',
      'POSTGRES_URL_NON_POOLING'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars.join(', '));
      process.exit(1);
    }

    // Устанавливаем переменные окружения для дочерних процессов
    const env = {
      ...process.env,
      NODE_ENV: 'production'
    };

    console.log('Building database scripts...');
    try {
      execSync('npm run build:db', { 
        stdio: 'inherit',
        env
      });
    } catch (error) {
      console.error('Error building database scripts:', error);
      process.exit(1);
    }

    console.log('Running database migrations...');
    try {
      execSync('npm run db:migrate', { 
        stdio: 'inherit',
        env
      });
    } catch (error) {
      console.error('Error running migrations:', error);
      process.exit(1);
    }

    console.log('Seeding database...');
    try {
      execSync('npm run db:seed', { 
        stdio: 'inherit',
        env
      });
    } catch (error) {
      console.error('Error seeding database:', error);
      // Продолжаем выполнение, даже если сидинг не удался
    }

    console.log('Building Next.js application...');
    execSync('npm run build', { 
      stdio: 'inherit',
      env
    });

    console.log('Build completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

run();
