
const fs = require('fs');
const csv = require('csvtojson');
const models = require('../models')
const config = require('../config');
const { TIMELOGGER } = require('../winston');
const rank_service = require('../manager/rankManager');
const MAX_ROWS_INSERT = 1000;
const SUCCESS = 'success';
const ERROR = 'error';
let fileName = '';
let startTime = '';
let fileUploadInProgress = false;
const UPDATE_COLUMNS = [
    'plan_remit_date', 'claim_receipt_date', 'claim_id', 'claim_line_item_control_number',
    'claim_system', 'health_plan', 'carrier_name', 'plan_id', 'plan_type', 'plan_billed_amount',
    'plan_remit_paid_amount', 'plan_billed_net_status', 'plan_billed_submission_version',
    'plan_billed_modification_version', 'parent_provider_id', 'parent_provider_name', 'provider_id', 'provider_name',
    'provider_billed_amount_uc', 'provider_remit_total_paid_total', 'provider_billed_net_status',
    'provider_billed_submission_version', 'plan_billed_carc_1', 'plan_billed_carc_2', 'plan_remit_carc_1',
    'plan_remit_carc_2', 'plan_remit_carc_3', 'plan_remit_carc_4', 'plan_remit_carc_5', 'plan_remit_carc_6',
    'routg_rsn_dsc', 'plan_billed_date', 'service_start_date', 'service_end_date', 'service_Line', 'plan_billed_hcpc',
    'assigned_to', 'status', 'is_processed', 'updatedBy', 'note', 'priority_score'];

function upload_data() {
    TIMELOGGER.info(`CHECKING FOR NEW FILES..`);
    startTime = new Date();
    if (!fs.existsSync(config.UPLOAD_FILE_PATH)) {
        try {
            fs.mkdirSync(config.UPLOAD_FILE_PATH);
        } catch (err) {
            // console.log('existsSync(config.UPLOAD_FILE_PATH)');
            batch_process_log(err, startTime, ERROR);
            TIMELOGGER.error(`existsSync(config.UPLOAD_FILE_PATH): ${err.message}`);
        }
    }
    fs.readdir(config.UPLOAD_FILE_PATH, function (err, files) {
        if (err) {
            // console.log('Directory read error ', err);
            batch_process_log(err, startTime, ERROR);
            TIMELOGGER.error(`Directory read error: ${err.message}`);
        } else {
            if (!files.length) {
                batch_process_log('No Files Found', startTime, SUCCESS);
            } else {
                try {
                    fs.readdirSync(config.UPLOAD_FILE_PATH).forEach(async function (file) {
                        fileName = file;
                        let fileLocation = config.UPLOAD_FILE_PATH + file;
                        console.log(' filePath ', fileLocation);
                        let data = [];
                        let diff;
                        let maxDate = await models.Claim_Summary.findOne({
                            attributes: [
                                [models.sequelize.fn('max', models.sequelize.col('plan_remit_date')), 'date']
                            ],
                            raw: true
                        });
                        if (fileUploadInProgress) {
                            return;
                        }
                        fileUploadInProgress = true;
                        setTimeout(function() {
                            if (fileUploadInProgress) {
                                fileUploadInProgress = false;
                            }
                        }, 1000 * 60 * 60)
                        csv({
                            delimiter: '|',
                            colParser: {
                                // eslint-disable-next-line
                                "Plan_Billed_Submission_Version": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Service_Code": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Provider_Billed_Submission_Version": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Provider_Remit_Total_Paid_Amount_Total": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Provider_Billed_Amount_UC": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Provider_ID": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Plan_Billed_Modification_Version": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Claim_System": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Plan_Remit_Paid_Amount": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Plan_Billed_Amount": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Plan_ID": function(item, head, resultRow, row , colIdx) {
                                   if (item == '' ) {
                                       return null;
                                   } else if (isNaN(parseInt(item))) {
                                    //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                      return null;
                                   } else {
                                       return item;
                                   }
                                    // return new Date(item);
                                },
                                // eslint-disable-next-line
                                "Plan_Billed_Date": function(item, head, resultRow, row , colIdx) {
                                    if (item == '' ) {
                                        // TIMELOGGER.error(`Incorrect Value For ${head} ROW: ${JSON.stringify(resultRow)}`)
                                        return null;
                                    } else {
                                        return item;
                                    }
                                     // return new Date(item);
                                 },
                                 // eslint-disable-next-line
                                 "Service_End_Date": function(item, head, resultRow, row , colIdx) {
                                    if (item == '' ) {
                                        // TIMELOGGER.error(`Incorrect Value For ${head} ROW: ${JSON.stringify(resultRow)}`)
                                        return null;
                                    } else {
                                        return item;
                                    }
                                     // return new Date(item);
                                 },
                                 // eslint-disable-next-line
                                 "Service_Start_Date": function(item, head, resultRow, row , colIdx) {
                                    if (item == '' ) {
                                        // TIMELOGGER.error(`Incorrect Value For ${head} ROW: ${JSON.stringify(resultRow)}`)
                                        return null;
                                    } else {
                                        return item;
                                    }
                                     // return new Date(item);
                                 },
                                 // eslint-disable-next-line
                                 "Claim_Receipt_Date": function(item, head, resultRow, row , colIdx) {
                                    if (item == '' ) {
                                        // TIMELOGGER.error(`Incorrect Value For ${head} ROW: ${JSON.stringify(resultRow)}`)
                                        return null;
                                    } else {
                                        return item;
                                    }
                                     // return new Date(item);
                                 },
                                 // eslint-disable-next-line
                                 "Plan_Remit_Date": function(item, head, resultRow, row , colIdx) {
                                    if (item == '' ) {
                                        // TIMELOGGER.error(`Incorrect Value For ${head} ROW: ${JSON.stringify(resultRow)}`)
                                        return null;
                                    } else {
                                        return item;
                                    }
                                     // return new Date(item);
                                 },

                            },
                            checkType: true
                        })
                            .fromFile(fileLocation)
                            .on('error',function(err) {
                                fileUploadInProgress = false;
                                console.log(err);
                                return;
                            })
                            .then(function (result) {
                                // console.log(result.length);
                                for (let i = 0; i < result.length; i++) {
                                    let item = {};
                                    Object.keys(result[i]).forEach(function(key) {
                                        item[key.toLowerCase()] = result[i][key];
                                    });
                                    
                                    if (Object.keys(item).length < 43) {
                                        TIMELOGGER.error(` DATA Missing in a row ROW NUMBER: ${i} ROW: ${JSON.stringify(item)}`)
                                    }
                                    if (maxDate && maxDate.date) {
                                        diff = new Date(item.plan_remit_date) - new Date(maxDate.date)
                                    } else {
                                        diff = 1;
                                    }
                                    if (item.claim_id && item.claim_line_item_control_number
                                         && diff > 0 && !(Object.keys(item).length < 43)) {
                                        // console.log('item.plan_remit_date ', item.plan_remit_date);
                                        item.assigned_to = undefined;
                                        item.status = undefined;
                                        item.is_processed = false;
                                        item.note = undefined;
                                        item.priority_score = undefined;
                                        item.updatedBy = 'system';

                                        data.push(item)
                                    }
                                }

                                if (data) {
                                    if (data.length > 0) {
                                        TIMELOGGER.info(`Total records to insert ${data.length}`)
                                        insert_file_data(data);
                                    } else {
                                        batch_process_log('No New Records Found', startTime, SUCCESS);
                                        fileUploadInProgress = false;
                                        move_file(SUCCESS);
                                    }
                                } else {
                                    batch_process_log('No Records Found', startTime, SUCCESS);
                                    fileUploadInProgress = false;
                                    move_file(SUCCESS);
                                }
                            })
                    })
                } catch (err) {
                    fileUploadInProgress = false;
                    TIMELOGGER.error(`FileUpload Js Err: ${err.message}`)
                }
            }
        }
    })
}

function insert_file_data(data) {
    // eslint-disable-next-line
    let result;
    try {
        models.sequelize.transaction(async function (t) {
            if (data.length > MAX_ROWS_INSERT) {
                let count = 0;
                let dataToUpdate = [...data];
                // console.log('data.length ', data.length);
                TIMELOGGER.info(`Insert In Chunks`);
                while ((count * MAX_ROWS_INSERT) < data.length) {
                    // console.log(' count ', count);
                    TIMELOGGER.info(`Batch No ${count}`);
                    try {
                        let dataToInsert = dataToUpdate.splice(0, MAX_ROWS_INSERT);
                        let summary_data = unquieData(dataToInsert, 'claim_id');
                        await models.Claim_Summary.bulkCreate(summary_data, { transaction: t, updateOnDuplicate: UPDATE_COLUMNS })
                        await models.Claim_Lines.bulkCreate(dataToInsert, { transaction: t, updateOnDuplicate: UPDATE_COLUMNS })
                        TIMELOGGER.info(`total completed ${count * MAX_ROWS_INSERT}`);
                        count++;
                    } catch (err) {
                        batch_process_log(err, startTime, ERROR);
                        fileUploadInProgress = false;
                        move_file(ERROR);
                        TIMELOGGER.error(`Batch Insert ERR: ${err.message}`);
                        return;
                    }
                }
            } else {
                TIMELOGGER.info(`Insert All at once`);
                try {
                    let summary_data = unquieData(data, 'claim_id');
                    result = await models.Claim_Summary.bulkCreate(summary_data, { transaction: t, updateOnDuplicate: UPDATE_COLUMNS })
                    await models.Claim_Lines.bulkCreate(data, { transaction: t, updateOnDuplicate: UPDATE_COLUMNS })
                } catch (err) {
                    batch_process_log(err, startTime, ERROR);
                    fileUploadInProgress = false;
                    move_file(ERROR);
                    TIMELOGGER.error(`Insert All at once ERR: ${err.message}`);
                    return;
                    // return res.status(500).send(err.message);
                }
            }
            TIMELOGGER.info(`Data Insert Success.. Starting Ranking..`);
            fileUploadInProgress = false;
            batch_process_log('Inserted Successfully', startTime, SUCCESS);
            move_file(SUCCESS);
            rank_service.updateClaimLineRanking();
            // res.status(200).send(result);
        });

    } catch (err) {
        batch_process_log(err, startTime, ERROR);
        fileUploadInProgress = false;
        move_file(ERROR);
        TIMELOGGER.error(`FileUploadDao.js/insert_file_data ERR: ${err.message}`)
        // res.status(500).send(err.msg)
    }
}

function unquieData(array, property) {
    let resultArray = [];
    let resultObj = {};
    for (let i = 0; i < array.length; i++) {
        if (array[i][property] && !resultObj[array[i][property]]) {
            resultObj[array[i][property]] = true;
            resultArray.push(array[i]);
        }
    }
    return resultArray;
}

function move_file(status) {
    let file = fileName;
    let oldpath = config.UPLOAD_FILE_PATH + fileName;
    let newpath = config.UPLOAD_BKUP_FILE_PATH;
    let filePrefix = file.slice(0, file.lastIndexOf('.'));
    let fileSuffix = file.slice(file.lastIndexOf('.'), file.length);

    if (status === ERROR) {
        newpath += filePrefix + "_" + new Date().getTime() + "_err" + fileSuffix;
    } else if (status === SUCCESS) {
        let timestamp = new Date().getTime();
        newpath += filePrefix + "_" + timestamp + fileSuffix;
    }
    if (!fs.existsSync(config.UPLOAD_BKUP_FILE_PATH)) {
        try {
            fs.mkdirSync(config.UPLOAD_BKUP_FILE_PATH);
        } catch (err) {
            // console.log('move_file mkdirSync err ');
            TIMELOGGER.error(`move_file mkdirSync err: ${err}`);
        }
    }
    // console.log("old path",oldpath)
    // console.log("new path",newpath)
    copy(oldpath, newpath);
    // fs.rename(oldpath, newpath, function (err) {
    //     copy(oldpath,newpath);
    //     if (err.code === 'EXDEV') {
    //             copy(oldpath,newpath);
    //         }
    //     if (err) {
    //         // res.send(http_util.ERROR.DEFAULT_500)
    //         copy(oldpath,newpath);
    //     }
    //     if (status === ERROR) {
    //         copy(oldpath,newpath);
    //         // send_err_message(newpath, companyCode);
    //     }
    //     // res.send(http_util.SUCCESS.DEFAULT_200);
    // });
}
function copy(oldPath, newPath) {
    var readStream = fs.createReadStream(oldPath);
    var writeStream = fs.createWriteStream(newPath);

    readStream.on('error', function (err) {
        if (err)
            TIMELOGGER.error(`File Upload read stream error: ${err.message}`)

    });
    writeStream.on('error', function (err) {

        if (err)
            TIMELOGGER.error(`File Upload write stream error: ${err.message}`)

    });

    readStream.on('close', function () {
        fs.unlink(oldPath, function (err) {
            if (err)
                TIMELOGGER.error(`File Upload write stream error: ${err.message}`)

            TIMELOGGER.info(`File deleted after upload`)
        });
    });

    readStream.pipe(writeStream);
}


function batch_process_log(error, startTime, statusMessage) {
    var message = null;
    if (statusMessage === ERROR) {
        message = error.message;
    } else {
        message = error;
    }
    models.Batch_Process.create({
        start_time: startTime,
        end_time: models.sequelize.literal('NOW()'),
        process_status: statusMessage,
        log_message: message
    })
        .then(function () {
            TIMELOGGER.info(`batch_process_log done successfully`);
        })
        .catch(function (err) {
            TIMELOGGER.error(`batch_process_log err: ${err}`);
        });
}

module.exports = { upload_data, insert_file_data, batch_process_log }
