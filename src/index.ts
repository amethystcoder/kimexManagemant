import express from 'express';
import bodyParser from 'body-parser';
const expressSession = require('express-session');
import authRouter from './routes/auth';
import restockRouter from './routes/restock';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))

app.set('trust proxy', 1) // trust first proxy
app.use(expressSession({
  secret: 'amethystguitarist',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

app.use('/api/auth', authRouter);
app.use('/api/restock', restockRouter);

app.use(express.static('public'));

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});