const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

if (process.env.TRUST_PROXY === 'true' || isProduction) {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const clientUrl = process.env.CLIENT_URL;
      if (!clientUrl) return callback(null, true);
      const allowed = clientUrl
        .split(',')
        .map((s) => s.trim().replace(/\/+$/, ''))
        .filter(Boolean);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowed.includes('*') || allowed.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') || filePath.endsWith('.gif') || filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/auto');
      }
    },
  })
);
app.use('/api', apiLimiter, routes);

/** Serve Vite production build (same-origin SPA) when NODE_ENV=production */
if (isProduction) {
  const fs = require('fs');
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(
      express.static(distPath, {
        index: false,
        maxAge: '1y',
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(indexHtml, (err) => {
        if (err) next(err);
      });
    });
  } else {
    console.warn(
      '[spa] frontend/dist missing — API-only mode. Run `npm run build` from repo root (or deploy SPA separately on Vercel).'
    );
  }
}

// Fallback root route when SPA is not mounted
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Sports Ecosystem API is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      public: '/api/public',
    },
  });
});

app.use(errorHandler);

module.exports = app;
