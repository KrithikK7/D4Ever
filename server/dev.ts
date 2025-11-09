process.env.NODE_ENV ??= 'development';

async function start() {
  await import('./index');
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
