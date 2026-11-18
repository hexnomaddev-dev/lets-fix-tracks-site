import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const base = process.env.SITE_URL
  ? new URL(process.env.SITE_URL).pathname.replace(/\/?$/, '/')
  : '/';
const dist = new URL('./dist/', import.meta.url);
const missing = await readFile(new URL('404.html', dist));
const port = Number(process.env.PORT ?? 8000);
const types = {
  css: 'text/css; charset=utf-8',
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  ttf: 'font/ttf',
  txt: 'text/plain; charset=utf-8',
  webp: 'image/webp',
  xml: 'application/xml; charset=utf-8',
};

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const path = request.url.split('?')[0];
  const res = (status, type, body) => response
    .writeHead(status, { 'Content-Type': type, 'Content-Length': body.length })
    .end(request.method === 'HEAD' ? undefined : body);

  // Generated paths use only these characters. Reject encoded and dot segments.
  if ((path.startsWith(base) || path === base.slice(0, -1))
      && /^\/[a-zA-Z0-9/_.-]*$/.test(path)
      && !path.includes('//')
      && !path.split('/').some((part) => part === '..' || part === '.')) {
    const relative = path.slice(base.length);
    const directory = relative.endsWith('/') || !relative.includes('.');
    const file = directory ? `${relative && relative.replace(/\/?$/, '/')}index.html` : relative;
    const extension = file.split('.').at(-1);
    if (Object.hasOwn(types, extension)) {
      try {
        const body = await readFile(new URL(`./${file}`, dist));
        if (directory && !path.endsWith('/')) {
          response.writeHead(308, { Location: `${path}/` }).end();
          return;
        }
        res(200, types[extension], body);
        return;
      } catch (error) {
        if (!['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code)) {
          console.error(error);
          response.writeHead(500).end();
          return;
        }
      }
    }
  }
  res(404, types.html, missing);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Preview at http://127.0.0.1:${server.address().port}${base}`);
});
