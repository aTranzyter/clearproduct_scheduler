/**
 * Created by mac on 02/11/18.
 */
// server.js

// modules =================================================
var express = require('express');
var app = express();
var cron = require('node-cron');
// var fs = require('fs');
// var bodyParser = require('body-parser');
// var methodOverride = require('method-override');
var models = require('./app/models');
const config = require('./app/config');
const fileUploadRoute = require('./app/routes/fileUploadRoutes');
const { update_color_range } = require('./app/manager/procedure')
var cronRunning = {};
config.isProd = process.argv.includes('--production');

const INTERVAL = "_interval";
// set our port
var port = process.env.APP_PORT || 8082;

function scheduleCron(taskName, interval) {
    let name = taskName;
    name = cron.schedule(interval, function () {
         getMethod(taskName);
    });
    cronRunning[taskName] = name;
    cronRunning[taskName + INTERVAL] = interval;
    name.start();
}

function getMethod(algo) {
    if (algo === 'masterCron') {
        return processMasterCron();
    } else {
       return fileUploadRoute.upload_data();
    }
}

function processMasterCron() {
    let scheduledCrons = []
    models.Schedule.findAll({
        attributes: ['id', 'second', 'minute', 'hour',
            'day_of_month', 'month', 'day_of_week']
    })
        .then(function (result) {
            let res = [];
            result.forEach((item) => {
                res.push(item.get({ plain: true }))
            });
            let interval = '';
            res.forEach(function (item) {
                for (let a in item) {
                    if (typeof item[a] === 'string') {
                        interval += item[a] + ' '
                    }
                }
                let code = 'abc' + item.id;
                scheduledCrons.push(code);
                if (!cronRunning[code] ||
                    (cronRunning[code] && cronRunning[code + INTERVAL] !== interval)
                ) {
                    // console.log('cronRunning[i] ', cronRunning[i])
                    // console.log('interval ', interval)
                    if (cronRunning[code] && cronRunning[code + INTERVAL] !== interval) {
                        cronRunning[code].destroy();
                    }
                    // console.log(' SCHEDULE CRON *********')
                    scheduleCron(code, interval);
                } else {
                    // console.log(' CONTINUE ')
                }
            })
            // console.log('master cron ', Object.keys(cronRunning));
            cleanUpCrons(scheduledCrons);
        });
}

function cleanUpCrons(scheduledCrons) {
    for (let com in cronRunning) {
        if (!(com.indexOf(INTERVAL) > -1) &&
            scheduledCrons.indexOf(com) === -1 && com !== 'masterCron') {
            cronRunning[com].destroy();
            delete cronRunning[com];
            delete cronRunning[com + INTERVAL];
        }
    }
}

// Sync sequelize
models.sequelize.sync().then(async function () {
    // start app ===============================================
    // startup our app at http://localhost:8082
    app.listen(port);
    update_color_range();
    console.log('server running on port ' + port);
    let schedule = {
        second: '0', minute: '0', hour: '*',
        day_of_month: '*', month: '*', day_of_week: '*'
    }
    let count = await models.Schedule.count();
    if (count === 0) {
        console.log('create schedule');
        await models.Schedule.create({ ...schedule })
    }
    scheduleCron('masterCron', '*/15 * * * * *');
    fileUploadRoute.upload_data();
}).catch(function (err) {
    console.log(' SEQUEL ERR ', err);
});

// expose app
exports = module.exports = app;
