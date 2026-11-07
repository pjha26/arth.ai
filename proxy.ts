// Legacy PDFs were written into public/. Never expose those files through the static server.
export function proxy() {
  return new Response('Use the authorized report download link.', { status: 410 });
}

export const config = { matcher: '/reports/:path*' };
