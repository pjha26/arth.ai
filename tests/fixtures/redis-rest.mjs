import { createServer } from 'node:http';
import IORedis from 'ioredis';
import { assertStaging } from './staging-safety.mjs';

assertStaging();
const redis = new IORedis(process.env.UPSTASH_REDIS_URL, { maxRetriesPerRequest: 1 });
const encode = value => typeof value === 'string' ? Buffer.from(value).toString('base64') : Array.isArray(value) ? value.map(encode) : value;
const server = createServer(async (request, response) => {
  if (request.headers.authorization !== `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`) { response.writeHead(401).end(); return; }
  try {
    let body = '';
    for await (const chunk of request) { body += chunk; if (body.length > 262144) throw new Error('Request too large'); }
    const command = JSON.parse(body);
    const run = async args => {
      try {
        const result = await redis.call(...args);
        return { result: request.headers['upstash-encoding'] === 'base64' ? encode(result) : result };
      } catch (error) { return { error: error.message }; }
    };
    const result = request.url.startsWith('/pipeline') ? await Promise.all(command.map(run)) : await run(command);
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
  } catch { response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid staging Redis command' })); }
});
server.listen(58079, '127.0.0.1', () => console.log('Isolated Redis REST fixture ready on localhost:58079'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(); redis.disconnect(); });
