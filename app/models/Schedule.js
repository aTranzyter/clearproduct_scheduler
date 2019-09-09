/**********************************************
 Schedule.js

 @desc - Schedule Time for Ranking Procedure
 @authors - Puneet Tiwari
 @version - 0.0.1
 **********************************************/



"use strict";

module.exports = function (sequelize, Types) {
    var Schedule = sequelize.define('Schedule', {
            second: {type: Types.STRING, defaultValue: '00'},
            minute: {type: Types.STRING, defaultValue: '59' },
            hour: {type: Types.STRING, defaultValue: '*'},
            day_of_month: {type: Types.STRING, defaultValue: '*'},
            month: {type: Types.STRING, defaultValue: '*'},
            day_of_week: {type: Types.STRING, defaultValue: '*'},
        },
        {
            tableName: 'Schedule',
            classMethods: {},
        }
    );

    return Schedule;
};
