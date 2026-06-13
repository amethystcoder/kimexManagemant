import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import authRouter from './routes/auth';
import restockRouter from './routes/restock';
import usersRouter from './routes/users';
import logsRouter from './routes/logs';
import modulesRouter from './routes/modules';
import inventoryRouter from './routes/inventory';
import { requireAuth } from './middleware/auth';
import { pageViewLogger } from './middleware/logger';
import { initializeData } from './setup/initialize';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// Apply all Helmet defaults (no options — avoids @types/helmet v4 type conflicts
// that abort ts-node before any of our changes take effect).
app.use(helmet());

// Overwrite the CSP that helmet() just set.  We place this immediately after
// so that res.setHeader overwrites helmet's header.  upgrade-insecure-requests
// is excluded: this server is plain HTTP and that directive makes the browser
// request every asset over HTTPS, causing ERR_SSL_PROTOCOL_ERROR.
app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'self'",
    "font-src 'self' https: data:",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "img-src 'self' data: https://barcode.tec-it.com",
    "object-src 'none'",
    "script-src 'self'",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
  ].join('; '));
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'kimex-management-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(pageViewLogger);

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/restock', requireAuth, restockRouter);
app.use('/api/inventory', requireAuth, inventoryRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/logs', requireAuth, logsRouter);
app.use('/api/modules', requireAuth, modulesRouter);

/* Static assets (shared across old and new UI) */
app.use('/static', express.static(path.join(__dirname, 'public/static')));

/* New SPA — served at /app (auth handled client-side; API endpoints remain protected) */
app.use('/app', express.static(path.join(__dirname, 'public/app')));

/* Legacy per-page routes */
app.use('/login', express.static(path.join(__dirname, 'public/login')));
app.use('/dashboard', requireAuth, express.static(path.join(__dirname, 'public/dashboard')));
app.use('/restock', requireAuth, express.static(path.join(__dirname, 'public/restock')));
app.use('/logs', requireAuth, express.static(path.join(__dirname, 'public/logs')));
app.use('/users', requireAuth, express.static(path.join(__dirname, 'public/users')));
app.use('/tags', requireAuth, express.static(path.join(__dirname, 'public/tags')));
app.use('/statements', requireAuth, express.static(path.join(__dirname, 'public/statements')));

app.get('/', (_req, res) => {
  res.redirect('/app');
});

const start = async () => {
  await initializeData();
  app.listen(port, () => {
    console.log(`Kimex Management Suite listening on http://localhost:${port}`);
  });
};

start();
