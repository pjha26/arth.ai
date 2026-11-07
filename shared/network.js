import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import axios from 'axios';

const blocked = new BlockList();
for (const [ip, prefix] of [['0.0.0.0',8], ['10.0.0.0',8], ['100.64.0.0',10], ['127.0.0.0',8], ['169.254.0.0',16], ['172.16.0.0',12], ['192.0.0.0',24], ['192.0.2.0',24], ['192.168.0.0',16], ['192.88.99.0',24], ['198.18.0.0',15], ['198.51.100.0',24], ['203.0.113.0',24], ['224.0.0.0',3]]) blocked.addSubnet(ip, prefix, 'ipv4');
for (const [ip, prefix] of [['2001::',23], ['2001:db8::',32], ['2002::',16], ['3fff::',20]]) blocked.addSubnet(ip, prefix, 'ipv6');
const globalV6 = new BlockList(); globalV6.addSubnet('2000::', 3, 'ipv6');

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  if (family === 6) return globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
  return false;
}

export function publicUrl(input) {
  const url = new URL(input);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('Only public HTTP/HTTPS websites are supported');
  if (host === 'localhost' || !host.includes('.') && !isIP(host) || isIP(host) && !isPublicAddress(host)) throw new Error('Private network destinations are not allowed');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|gclid$|fbclid$|srsltid$)/i.test(key)) url.searchParams.delete(key);
  return url;
}

export async function assertPublicUrl(input, resolver = lookup) {
  const url = publicUrl(input);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await resolver(host, { all: true });
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Website resolves to a private or reserved network');
  return url;
}

// Check DNS at socket creation as well as validation to prevent DNS rebinding.
function safeLookup(host, options, callback) {
  lookup(host, { all: true }).then(addresses => {
    if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Unsafe website address');
    const matches = options.family ? addresses.filter(a => a.family === options.family) : addresses;
    if (!matches.length) throw new Error('No supported public address');
    if (options.all) callback(null, matches); else callback(null, matches[0].address, matches[0].family);
  }).catch(callback);
}

const httpAgent = new http.Agent({ lookup: safeLookup });
const httpsAgent = new https.Agent({ lookup: safeLookup });

export async function fetchPublicPage(input) {
  let url = publicUrl(input);
  for (let redirects = 0; redirects <= 5; redirects++) {
    await assertPublicUrl(url.href);
    const response = await axios.get(url.href, {
      httpAgent, httpsAgent, proxy: false, timeout: 8000, maxRedirects: 0,
      maxContentLength: 2 * 1024 * 1024, maxBodyLength: 2 * 1024 * 1024,
      responseType: 'text', validateStatus: s => s >= 200 && s < 400,
      headers: { 'User-Agent': 'ArthAI/1.0 company research', Accept: 'text/html' },
    });
    if (response.status >= 300) {
      if (!response.headers.location) throw new Error('Invalid website redirect');
      url = publicUrl(new URL(response.headers.location, url).href);
      continue;
    }
    if (!String(response.headers['content-type'] || '').includes('text/html')) throw new Error('Website did not return HTML');
    return { html: String(response.data), url: url.href };
  }
  throw new Error('Too many website redirects');
}
