import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const localDir = process.env.REPORTS_DIR || path.join(process.cwd(), '.data', 'reports');
function drive() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_DRIVE_FOLDER_ID) throw new Error('Private report storage is not configured');
  const auth = new google.auth.GoogleAuth({ credentials: { client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') }, scopes: ['https://www.googleapis.com/auth/drive.file'] });
  return google.drive({ version: 'v3', auth });
}

export async function saveReportPdf(id, bytes) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error('Invalid report ID');
  if (process.env.REPORT_STORAGE === 'local' && process.env.NODE_ENV !== 'production') {
    await mkdir(localDir, { recursive: true }); await writeFile(path.join(localDir, `${id}.pdf`), bytes);
    return `local:${id}`;
  }
  const client = drive();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const permissions = await client.permissions.list({ fileId: folderId, supportsAllDrives: true, fields: 'permissions(type)' }, { timeout: 10000 });
  if (permissions.data.permissions?.some(permission => ['anyone', 'domain'].includes(permission.type))) throw new Error('Report folder must not grant public or domain-wide access');
  const existing = await client.files.list({ q: `'${folderId.replaceAll("'", "\\'")}' in parents and trashed = false and appProperties has { key='reportId' and value='${id}' }`, fields: 'files(id)', pageSize: 1, supportsAllDrives: true, includeItemsFromAllDrives: true }, { timeout: 10000 });
  if (existing.data.files?.[0]?.id) return `drive:${existing.data.files[0].id}`;
  const { data } = await client.files.create({ requestBody: { name: `${id}.pdf`, parents: [folderId], appProperties: { reportId: id } },
    media: { mimeType: 'application/pdf', body: Readable.from(bytes) }, fields: 'id', supportsAllDrives: true }, { timeout: 20000 });
  if (!data.id) throw new Error('PDF upload did not return an ID');
  // No public permission is created. Only the authorized download route reads this object.
  return `drive:${data.id}`;
}

export async function readReportPdf(reference) {
  if (reference.startsWith('local:') && process.env.NODE_ENV !== 'production' && /^[a-f0-9-]{36}$/i.test(reference.slice(6))) return readFile(path.join(localDir, `${reference.slice(6)}.pdf`));
  if (!/^drive:[\w-]+$/.test(reference)) throw new Error('Invalid PDF storage reference');
  const { data } = await drive().files.get({ fileId: reference.slice(6), alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer', timeout: 20000 });
  return Buffer.from(data);
}
