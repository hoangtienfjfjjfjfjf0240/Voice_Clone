export const config = {
  api: {
    bodyParser: false,
  },
};

const MINIMAX_API_BASE = 'https://api.minimax.io';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function resolvePath(queryPath) {
  const rawPath = Array.isArray(queryPath) ? queryPath.join('/') : queryPath || '';
  const normalizedPath = `/${String(rawPath).replace(/^\/+/, '')}`;
  if (!normalizedPath.startsWith('/v1/')) {
    throw new Error('Invalid MiniMax API path.');
  }
  return normalizedPath;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      base_resp: {
        status_code: 500,
        status_msg: 'Missing MINIMAX_API_KEY on server.',
      },
    });
    return;
  }

  let apiPath;
  try {
    apiPath = resolvePath(req.query.path);
  } catch (error) {
    res.status(400).json({
      base_resp: {
        status_code: 400,
        status_msg: error.message,
      },
    });
    return;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, item));
    } else if (value !== undefined) {
      searchParams.append(key, value);
    }
  }

  const upstreamUrl = `${MINIMAX_API_BASE}${apiPath}${searchParams.size ? `?${searchParams}` : ''}`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };

  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
  if (req.headers.accept) headers.Accept = req.headers.accept;

  try {
    const method = req.method || 'POST';
    const hasBody = method !== 'GET' && method !== 'HEAD';
    const body = hasBody ? await readBody(req) : undefined;
    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers,
      body: body && body.length ? body : undefined,
    });

    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    res.status(upstreamResponse.status);
    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json');
    res.send(responseBody);
  } catch (error) {
    res.status(502).json({
      base_resp: {
        status_code: 502,
        status_msg: error.message || 'MiniMax proxy request failed.',
      },
    });
  }
}
