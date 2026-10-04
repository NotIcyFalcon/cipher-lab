export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startHomeworkQueue } = await import('./server/homework-jobs');
    startHomeworkQueue();

    const { startLabBuildQueue } = await import('./server/lab-builds');
    startLabBuildQueue();
  }
}
