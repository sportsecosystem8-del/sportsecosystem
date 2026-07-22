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
    origin: (() => {
      if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
      if (isProduction) {
        console.warn('[cors] CLIENT_URL is unset in production — allowing all origins. Set CLIENT_URL to your frontend URL.');
        return true;
      }
      return true;
    })(),
    credentials: true,
  })
);
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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

app.use(errorHandler);

module.exports = app;
