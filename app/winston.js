const winston = require('winston');
const config = require('./config');
const fs = require('fs');

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;
require('winston-daily-rotate-file');
const myFormat = printf(info => {
    // return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
    return `${info.timestamp} ${info.level}: ${info.message}`;
});

// console.log('log file path is ',config.LOG_FILE_PATH);

var transport = new (winston.transports.DailyRotateFile)({
    filename: 'application-%DATE%.log',
    dirname:config.LOG_FILE_PATH,
    // datePattern: 'YYYY-MM-DD', // default to Every day.
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '14d'
});

var transportError = new (winston.transports.DailyRotateFile)({
    filename: 'application-error-%DATE%.log',
    dirname:config.LOG_FILE_PATH,
    // datePattern: 'YYYY-MM-DD', // default to Every day.
    zippedArchive: false,
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d'
});

transport.on('rotate', function(oldFilename, newFilename) {
    // do something fun
    //console.log('oldFileName ', oldFilename, ' NewFileName ', newFilename);
});

/*
    Custom winston configuration
 */
if (!fs.existsSync(config.LOG_FILE_PATH)) {
    try {
        fs.mkdirSync(config.LOG_FILE_PATH)
    } catch (err) {
        console.log(err);
    }
}
const logger = createLogger({
    format: combine(
        // label({ label: 'CUSTOM LOG' }),
        timestamp(),
        myFormat
    ),
    transports: [
        //new transports.File({ filename: "../log/File.log" }),
        transportError,
        transport
    ]
});

/*
    Basic winston configuration
 */
// const console = new winston.transports.Console();
// const files = new winston.transports.File({ filename: config.LOG_FILE_PATH });
// winston.add(console);
// winston.add(files);
// exports.WINSTON = winston;

exports.TIMELOGGER = logger;
