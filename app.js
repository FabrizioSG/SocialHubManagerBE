var createError = require('http-errors');
var express = require('express');
const { Client } = require('pg')
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var usersRouter = require('./routes/users');
var postsRouter = require('./routes/posts');
var schedulesRouter = require('./routes/schedules');
var queuesRouter = require('./routes/queues');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use("/users", usersRouter);
app.use("/posts", postsRouter);
app.use("/schedules", schedulesRouter);
app.use("/queues", queuesRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const client = new Client({
  user: 'postgres',
  host: 'socialhubmanager.cf0l220amgtd.us-east-1.rds.amazonaws.com',
  database: 'postgres',
  password: 'secret2022',
  port: 5432,
})
client.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

module.exports = app;
