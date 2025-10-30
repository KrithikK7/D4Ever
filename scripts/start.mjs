process.env.NODE_ENV ??= 'production';

await import(new URL('../dist/index.js', import.meta.url));
