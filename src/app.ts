import express from 'express';
import path from 'path';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import ConnectMongoDBSession from 'connect-mongodb-session';
import routerAdmin from './router-admin';
import router from './router';

const MongoDBStore = ConnectMongoDBSession(session);

const app = express();

// 1. MIDDLEWARE (MUST BE AT THE TOP)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // <--- FIXES req.body for Forms
app.use(express.json());                         // <--- FIXES req.body for JSON
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(cookieParser());

// 2. SESSIONS
const store = new MongoDBStore({
    uri: process.env.MONGO_URL as string,
    collection: 'sessions'
});

store.on('error', (error) => {
    console.error('MongoDB session store error:', error);
});

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'This is a secret',
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
            httpOnly: true,
            secure: false
        },
        store: store,
        resave: false,
        saveUninitialized: false
    })
);

// 3. VIEWS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 4. ROUTERS
app.use('/admin', routerAdmin);
app.use('/api', router);

export default app;