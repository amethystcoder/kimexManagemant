import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import path from 'path';
import authRouter from './routes/auth';
import restockRouter from './routes/restock';
import usersRouter from './routes/users';
import logsRouter from './routes/logs';
import modulesRouter from './routes/modules';
import { requireAuth } from './middleware/auth';
import { pageViewLogger } from './middleware/logger';
import { initializeData } from './setup/initialize';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

app.use(pageViewLogger);

app.use('/api/auth', authRouter);
app.use('/api/restock', requireAuth, restockRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/logs', requireAuth, logsRouter);
app.use('/api/modules', requireAuth, modulesRouter);
app.use('/static', express.static(path.join(__dirname, 'public/static')));

app.use('/login', express.static(path.join(__dirname, 'public/login')));
app.use('/dashboard', requireAuth, express.static(path.join(__dirname, 'public/dashboard')));
app.use('/restock', requireAuth, express.static(path.join(__dirname, 'public/restock')));
app.use('/logs', requireAuth, express.static(path.join(__dirname, 'public/logs')));
app.use('/users', requireAuth, express.static(path.join(__dirname, 'public/users')));
app.use('/tags', requireAuth, express.static(path.join(__dirname, 'public/tags')));
app.use('/statements', requireAuth, express.static(path.join(__dirname, 'public/statements')));

app.get('/', (req, res) => {
  if (req.session && (req.session as any).user) {
    return res.redirect('/dashboard/dashboard.html');
  }
  return res.redirect('/login/login.html');
});

app.listen(port, async () => {
  await initializeData();
  console.log(`Kimex Management Suite listening on http://localhost:${port}`);
});