/** @param {Request} request @param {number} maxBytes */
export async function readBoundedJson(request, maxBytes) {
  const reader = request.body?.getReader();
  if (!reader) return { value: null };
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        return { response: Response.json({ message: 'Request body is too large.' }, { status: 413 }) };
      }
      chunks.push(value);
    }
    return { value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes))) };
  } catch {
    return { value: null };
  } finally {
    reader.releaseLock();
  }
}
