// Lib imports
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { Sequelize } = require('sequelize');
const passport = require('passport');
const fileUpload = require('express-fileupload');
const cors = require('cors');

// Local imports
const authService = require('./services/auth');
const config = require('./config/config');
const authMiddleware = require('./middlewares/auth');
const { isFreshInstallation, importFirstTimeData } = require('./services/freshInstallation');
const sequelize = require('./services/db');
const authRouter = require('./routes/auth');
const nonPrivBuyerRouter = require('./routes/nonPrivbuyer');
const signUpRouter = require('./routes/signUp');
const ownerRouter = require('./routes/owner');
const propertyRouter = require('./routes/property');
const imageRouter = require('./routes/images');
const documentRouter = require('./routes/document');
const userRouter = require('./routes/users');
const indexRouter = require('./routes/index');
const buyerRouter = require('./routes/buyer');
const agentRouter = require('./routes/agent');
const notificationRouter = require('./routes/notifications');
const agentAgreementRouter = require('./routes/agentAgreement');

const { findMany } = require('./services/users');
const firstTimeData = require('./config/firstTimeData');

const app = express();

const FULL_CLIENT_PATH = path.join(__dirname, 'build');

sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
    return sequelize.sync();
  })
  .then(() => {
    return isFreshInstallation();
  })
  .then((importFlag) => {
    if (importFlag) {
      console.log('Importing frist time data for fresh installation...');
      return importFirstTimeData();
    }
  })
  .catch((error) => {
    console.error('Unable to connect to the database: ', error);
  });

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(passport.initialize());

authService.configurePassport(passport);

app.use(fileUpload());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// APIs with out auth requirement
app.use('/api/non-priv/buyer', nonPrivBuyerRouter);
app.use('/api/signup', signUpRouter);
app.use('/api/auth', authRouter);

// The auth middleware where token is validated
app.use('/api', authMiddleware);

// BE APIs requiring Auth
app.use('/api', indexRouter);
app.use('/api/image', imageRouter);
app.use('/api/document', documentRouter);
app.use('/api/agent-agreement', agentAgreementRouter);
app.use('/api/buyer', buyerRouter);
app.use('/api/agent', agentRouter);
app.use('/api/user', userRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/property', propertyRouter);
app.use('/api/notification', notificationRouter);

// for development only
app.get('/agents', async (req, res) => {
  let allUsers = await findMany();
  let agentsList = [];
  if (allUsers && allUsers.length > 0) {
    for (let allUser of allUsers) {
      agentsList.push(allUser?.dataValues);
    }
  }
  res.send({ chatUsers: agentsList });
});

// For react build files
app.use(express.static(FULL_CLIENT_PATH));
app.get('*', (req, res) => {
  res.sendFile(path.join(`${FULL_CLIENT_PATH}/index.html`));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
