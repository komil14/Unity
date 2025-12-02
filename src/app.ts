import cors from 'cors';
import express from 'express';
import path from 'path';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import ConnectMongoDB from 'connect-mongodb-session';

const MongoDBStore = ConnectMongoDB(session);

/** 1-ENTRANCE **/
const app = express();

// A. Allow React to talk to this API (CORS)
// We will restrict this to your specific domain in production
app.use(cors({ origin: true, credentials: true }));

// B. Logging (See requests in terminal)
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// C. Parsing (Read JSON and Cookies)
app.use(express.urlencoded({ extended: true })); // Read HTML Forms
app.use(express.json());                         // Read JSON bodies
app.use(cookieParser());                         // Read Cookies

/** 2-SESSIONS (For Super Admin BSSR) **/
const store = new MongoDBStore({
    uri: process.env.MONGO_URL as string,
    collection: 'sessions' // Where to store sessions in DB
});

store.on('error', function(error) {
    console.log(error);
});

app.use(
    session({
        secret: process.env.SESSION_SECRET as string,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7, // 1 Week
            httpOnly: true // Security: JavaScript cannot read this cookie
        },
        store: store,
        resave: true,
        saveUninitialized: true
    })
);

/** 3-VIEWS (For Super Admin BSSR) **/
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve Static Files (CSS, Images for Admin Panel)
app.use(express.static(path.join(__dirname, 'public')));

/** 4-ROUTERS **/
// We will add this in the next step
// app.use('/admin', routerAdmin); // BSSR
// app.use('/', router);           // SPA API

export default app;