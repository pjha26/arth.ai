export function assertStaging(env = process.env) {
  if (env.ARTHAI_STAGING !== '1') throw new Error('Load the isolated .env.staging configuration first');
  for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
    const url = new URL(env[name]);
    if (url.hostname !== '127.0.0.1' || url.port !== '55439' || !/^\/arthai_(staging|migrationcheck_\d+)$/.test(url.pathname)) throw new Error(`${name} must target the isolated local staging database`);
  }
  const redis = new URL(env.UPSTASH_REDIS_URL);
  if (redis.hostname !== '127.0.0.1' || redis.port !== '56379') throw new Error('Redis must target isolated local staging');
}
