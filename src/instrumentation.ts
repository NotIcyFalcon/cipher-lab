export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startGradingQueue } = await import('./server/grading-queue');
    startGradingQueue();

    const { startLabBuildQueue } = await import('./server/lab-builds');
    startLabBuildQueue();
  }
}
