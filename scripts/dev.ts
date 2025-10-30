process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';
await import('../server/index.ts');
