/**
 * Returns whether SQL queries should be logged during tests.
 * This is controlled by the LOG_QUERIES environment variable.
 */
export function shouldLogQueries(): boolean {
  return process.env.LOG_QUERIES === 'true';
}
