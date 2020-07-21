
const fs = require('fs');
const es = require('event-stream');
const csv = require('csvtojson');
const models = require('../models')
const config = require('../config');
const { TIMELOGGER } = require('../winston');
const rank_service = require('../manager/rankManager');
const MAX_ROWS_INSERT = 1000;
const READ_BATCH_SIZE = 50000;
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
    'is_processed', 'updatedAt', 'updatedBy', 'plan_billed_patient_acct_number', 'ccx_account_amount',
     'plan_remit_patient_responsibility_amount', 'plan_remit_capitation_amount', 'claim_type'];

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
                        TIMELOGGER.info(`filepath: ${fileLocation}`);
                        let data = [];
                        let file_headers = [];
                        let errOutRowsCount = 0;
                        let totalRowsInAFile = 0;
                        let totalRowsToInsert = 0;
                        let lineNumber = 0
                        let string_data = '';
                        let headerRow = [];
                        let errOutRows = [];
                        let remitOutCount = 0;
                        let fileMaxDate;
                        let databaseMaxDate;
                        let remitReferenceDate;
                        let diff;
                        let lastBatch = false;
                        if (fileUploadInProgress) {
                            TIMELOGGER.info(`File Upload is already in Progress, new request dismissed.`);
                            return;
                        }
                        fileUploadInProgress = true;
                        let customDates = await models.Batch_Process.findOne({ where: { process_status: 'upload' }, raw: true });
                        if (customDates && customDates.id) {
                            // eslint-disable-next-line
                            let updated = await models.Batch_Process.update(
                                { id: customDates.id, process_status: 'complete' },
                                { where: { id: customDates.id } });
                            // console.log(' updated ', updated);
                        }
                        // console.log(' customDates ', customDates);

                        let maxDate = await models.Claim_Summary.findOne({
                            where: { is_active: true },
                            attributes: [
                                [models.sequelize.fn('max', models.sequelize.col('plan_remit_date')), 'date']
                            ],
                            raw: true
                        });
                        if (maxDate && maxDate.date) {
                            if (customDates && customDates.start_time) {
                                databaseMaxDate = new Date(customDates.start_time);
                                maxDate.date = customDates.start_time;
                            } else {
                                databaseMaxDate = new Date(maxDate.date);
                            }
                        }
                        let futureDate = new Date();
                        futureDate.setDate(futureDate.getDate() + 1);
                        if (customDates && customDates.end_time) {
                            futureDate = new Date(customDates.end_time);
                        }
                        // if (fileUploadInProgress) {
                        //     return;
                        // }
                        // console.log('databaseMaxDate ', databaseMaxDate)
                        // console.log('futureDate ', futureDate)
                        // fileUploadInProgress = true;
                        setTimeout(function () {
                            if (fileUploadInProgress) {
                                fileUploadInProgress = false;
                            }
                        }, 1000 * 60 * 60);
                        let count = 0;
                        fs.createReadStream(fileLocation).pipe(es.split())
                            .pipe(es.mapSync(function (line) { if (line) { count++; } }))
                            .on('end', function () {
                                // remove header as data row count
                                totalRowsInAFile = count - 1;

                                // console.log(' totalRowsInAFile ', totalRowsInAFile);
                                // });
                                // return;
                                let rowsToInsert = 0;
                                let rowsInBatch = 0;
                                let readable = fs.createReadStream(fileLocation)
                                    .pipe(es.split())
                                    .pipe(es.mapSync((line) => {
                                        if (lineNumber == 0) {
                                            file_headers = line.split('|');
                                            // console.log(' line ', line)
                                            // console.log(' lineData ', lineData)
                                            // file_headers = lineData.map(function(item){
                                            //     return {[item]: ''};
                                            // });
                                            // console.log('file_headers', file_headers);
                                        }
                                        if (lineNumber != 0) {
                                            string_data += line + '\n';
                                            rowsInBatch++;
                                        }
                                        lineNumber++;

                                        if (lineNumber % READ_BATCH_SIZE == 0 || totalRowsInAFile == (rowsToInsert + rowsInBatch)) {
                                            if ((rowsToInsert + rowsInBatch) == totalRowsInAFile) {
                                                rowsToInsert = JSON.parse(JSON.stringify(lineNumber));
                                                lastBatch = true;
                                            } else {
                                                if (rowsToInsert == 0) {
                                                    rowsToInsert = READ_BATCH_SIZE - 1;
                                                } else {
                                                    rowsToInsert += READ_BATCH_SIZE;
                                                }
                                            }
                                            string_data = string_data.slice(0, string_data.lastIndexOf('\n'));
                                            // console.log('rowsToInsert ******************* ', rowsToInsert);
                                            // console.log('rowsInBatch ******************* ', rowsInBatch);
                                            // console.log(' line IF ', lineNumber);
                                            //     // console.log(' line ', line);
                                            readable.pause();
                                            // }
                                            // console.log(' line ', lineNumber);

                                            // return;
                                            // eslint-disable-next-line
                                            csv({
                                                delimiter: '|',
                                                headers: file_headers,
                                                noheader: true,
                                                // headers: [ 'Plan_Remit_Date', 'Claim_Receipt_Date', 'Claim_ID',
                                                // 'Claim_Line_Item_Control_Number', 'Claim_System', 'Patient_Number',
                                                // 'Health_Plan', 'Carrier_Name', 'Plan_ID', 'Plan_Type', 'Plan_Billed_Amount',
                                                // 'Plan_Remit_Paid_Amount', 'Plan_Billed_Net_Status', 'Plan_Billed_Submission_Version',
                                                // 'Plan_Billed_Modification_Version', 'Parent_Provider_ID', 'Parent_Provider_Name',
                                                // 'Provider_ID', 'Provider_Name', 'Provider_Billed_Amount_UC', 'Provider_Remit_Total_Paid_Amount_Total',
                                                // 'Provider_Billed_Net_Status', 'Provider_Billed_Submission_Version',
                                                //  'Plan_Billed_CARC_1', 'Plan_Billed_CARC_2',
                                                // 'Plan_Remit_CARC_1', 'Plan_Remit_CARC_2', 'Plan_Remit_CARC_3', 'Plan_Remit_CARC_4',
                                                // 'Plan_Remit_CARC_5', 'Plan_Remit_CARC_6',
                                                //  'Plan_Remit_RARC_1', 'Plan_Remit_RARC_2', 'Plan_Remit_RARC_3', 'Plan_Remit_RARC_4',
                                                // 'Plan_Remit_RARC_5', 'Plan_Remit_RARC_6',
                                                // 'Plan_Billed_Date', 'Service_Start_Date', 'Service_End_Date',
                                                // 'Service_Line', 'Service_Code',
                                                //  'Plan_Billed_HCPC', 'AUTHORIZATION_ID', 'Plan_Remit_Payer_Claim_ID',
                                                // 'Claim_Form_Type', 'Patient_First_Name', 'Patient_Last_Name',
                                                // 'Patient_Subscriber_ID' ],
                                                colParser: {
                                                    // eslint-disable-next-line
                                                    "Plan_Billed_Submission_Version": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
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
                                                    "Service_Code": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
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
                                                    "Provider_Billed_Submission_Version": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
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
                                                    "Provider_Remit_Total_Paid_Amount_Total": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            return null;
                                                        } else if (isNaN(item) || item.includes('e')) {
                                                            //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "Provider_Billed_Amount_UC": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            return null;
                                                        } else if (isNaN(item) || item.includes('e')) {
                                                            //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "Provider_ID": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
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
                                                    "Plan_Billed_Modification_Version": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
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
                                                    "Claim_System": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
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
                                                    "Parent_Provider_ID": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
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
                                                    "Plan_Remit_Paid_Amount": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            return null;
                                                        } else if (isNaN(item) || item.includes('e')) {
                                                            //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "Plan_Billed_Amount": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            return null;
                                                        } else if (isNaN(item) || item.includes('e')) {
                                                            //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "Plan_ID": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
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
                                                    "Plan_Billed_Date": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            // TIMELOGGER.error(`Incorrect Value For ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "Service_End_Date": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            // TIMELOGGER.error(`Incorrect Value For ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "Service_Start_Date": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            // TIMELOGGER.error(`Incorrect Value For ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "Claim_Receipt_Date": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            // TIMELOGGER.error(`Incorrect Value For ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "Plan_Remit_Date": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            // TIMELOGGER.error(`Incorrect Value For ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "CCX_ACCOUNT_AMOUNT": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            return null;
                                                        } else if (isNaN(item) || item.includes('e')) {
                                                            //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "PLAN_REMIT_PATIENT_RESPONSIBILITY_AMOUNT": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            return null;
                                                        } else if (isNaN(item) || item.includes('e')) {
                                                            //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "PLAN_REMIT_CAPITATION_AMOUNT": function (item, head, resultRow, row, colIdx) {
                                                        if (item == '') {
                                                            return null;
                                                        } else if (isNaN(item) || item.includes('e')) {
                                                            //    TIMELOGGER.error(`Incorrect Value for ${head} ROW: ${JSON.stringify(resultRow)}`)
                                                            return null;
                                                        } else {
                                                            return item;
                                                        }
                                                        // return new Date(item);
                                                    },
                                                    // eslint-disable-next-line
                                                    "Claim_ID": "string",
                                                    "Claim_Line_Item_Control_Number": "string",
                                                    "Patient_Number": "string",
                                                    "Health_Plan": "string",
                                                    "Carrier_Name": "string",
                                                    "Plan_Type": "string",
                                                    "Plan_Billed_Net_Status": "string",
                                                    "Plan_Provider_Name": "string",
                                                    "Provider_Name": "string",
                                                    "Provider_Billed_Net_Status": "string",
                                                    "Plan_Billed_CARC_1": "string",
                                                    "Plan_Billed_CARC_2": "string",
                                                    "Plan_Remit_CARC_1": "string",
                                                    "Plan_Remit_CARC_2": "string",
                                                    "Plan_Remit_CARC_3": "string",
                                                    "Plan_Remit_CARC_4": "string",
                                                    "Plan_Remit_CARC_5": "string",
                                                    "Plan_Remit_CARC_6": "string",
                                                    "Plan_Remit_RARC_1": "string",
                                                    "Plan_Remit_RARC_2": "string",
                                                    "Plan_Remit_RARC_3": "string",
                                                    "Plan_Remit_RARC_4": "string",
                                                    "Plan_Remit_RARC_5": "string",
                                                    "Plan_Remit_RARC_6": "string",
                                                    "Service_Line": "string",
                                                    "Plan_Billed_HCPC": "string",
                                                    "Claim_Form_Type": "string",
                                                    "AUTHORIZATION_ID": "string",
                                                    "PLAN_REMIT_PAYER_CLAIM_ID": "string",
                                                    "PATIENT_SUBSCRIBER_ID": "string",
                                                    "CLAIM_TYPE": "string"

                                                },
                                                checkType: true
                                            })
                                                // .fromFile(fileLocation)
                                                .fromString(string_data)
                                                .on('error', function (err) {
                                                    fileUploadInProgress = false;
                                                    console.log(err);
                                                    return;
                                                })
                                                .then(async function (result) {
                                                    console.log('result.length ', result.length);
                                                    // let readBatchCount = 1;
                                                    // let totalResult = result.length;
                                                    // let resultInserted = 0;
                                                    for (let i = 0; i < result.length; i++) {
                                                        let item = {};
                                                        Object.keys(result[i]).forEach(function (key) {
                                                            item[key.toLowerCase()] = result[i][key];
                                                            if (i === 0) {
                                                                headerRow.push(key);
                                                            }
                                                        });

                                                        if (Object.keys(item).length < 49) {
                                                            errOutRowsCount++;
                                                            errOutRows.push(result[i]);
                                                            TIMELOGGER.error(` DATA Missing in a row ROW NUMBER: ${i} ROW: ${JSON.stringify(item)}`)
                                                            diff = 0;
                                                        } else if (!item || !item.claim_id || !item.claim_line_item_control_number) {
                                                            errOutRowsCount++;
                                                            errOutRows.push(result[i]);
                                                            TIMELOGGER.error(`ROW or claim_id or claim_line_item_control_number is undefined ROW:${i}`)
                                                            diff = 0;
                                                        } else if (new Date(item.plan_remit_date) > futureDate) {
                                                            errOutRowsCount++;
                                                            errOutRows.push(result[i]);
                                                            // let { claimId, claimLineId} = getMaskedIds(item);
                                                            TIMELOGGER.error(`Future Date Data: plan_Remit_Date: ${item.plan_remit_date}, index: ${i}`)
                                                            diff = 0;
                                                        } else if (item.plan_billed_amount == null) {
                                                            errOutRowsCount++;
                                                            errOutRows.push(result[i]);
                                                            // let { claimId, claimLineId} = getMaskedIds(item);
                                                            TIMELOGGER.error(`Plan_Billed_Amount Null: Row: ${i}, Plan_Billed_Amount: ${item.plan_billed_amount}`)
                                                            diff = 0;
                                                        } else if (item.plan_remit_carc_1 === 'CO24' || item.plan_remit_carc_2 === 'CO24' ||
                                                            item.plan_remit_carc_3 === 'CO24' || item.plan_remit_carc_4 === 'CO24' ||
                                                            item.plan_remit_carc_5 === 'CO24' || item.plan_remit_carc_6 === 'CO24'
                                                        ) {
                                                            // let { claimId, claimLineId} = getMaskedIds(item);
                                                            errOutRowsCount++;
                                                            errOutRows.push(result[i]);
                                                            TIMELOGGER.error(`plan_remit_carc Error: claim_id: Row: ${i}`)
                                                            diff = 0;
                                                        } else if (maxDate && maxDate.date) {
                                                            if (!item.plan_remit_date) {
                                                                errOutRowsCount++;
                                                                errOutRows.push(result[i]);
                                                                TIMELOGGER.error(`Plan_Remit_Date Null ROW: ${i}`);
                                                                diff = 0;
                                                            } else {
                                                                let remitdate = new Date(maxDate.date);
                                                                // extend remit out limit to 15 days
                                                                if (!customDates) {
                                                                    remitdate = remitdate.setDate(remitdate.getDate() - 15);
                                                                    remitReferenceDate = new Date(remitdate);
                                                                }
                                                                diff = new Date(item.plan_remit_date) - remitdate;
                                                                if (!fileMaxDate) {
                                                                    fileMaxDate = new Date(item.plan_remit_date);
                                                                } else {
                                                                    if (new Date(item.plan_remit_date) > fileMaxDate) {
                                                                        fileMaxDate = new Date(item.plan_remit_date);
                                                                    }
                                                                }
                                                                if (diff < 1) {
                                                                    if (diff == 0) {
                                                                        diff = 1;
                                                                    } else {
                                                                        remitOutCount++;
                                                                    }
                                                                }
                                                            }

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
                                                        // if (data.length == 5000) {
                                                        // totalRowsToInsert += 5000;
                                                        // resultInserted += 5000;
                                                        // let value = await insertData(data, readBatchCount);
                                                        // console.log('value ', value, ' ', readBatchCount);
                                                        //   eslint-disable-next-line require-atomic-updates
                                                        // data = [];
                                                        // readBatchCount++;
                                                        // }
                                                    }

                                                    if (data) {
                                                        if (data.length > 0) {
                                                            // TIMELOGGER.info(`Total records to insert ${data.length}`)
                                                            // insert_file_data(data, true);
                                                            // console.log(' Batch Data ', data.length)
                                                            totalRowsToInsert += data.length
                                                            await insertData(data, lastBatch);
                                                            //   eslint-disable-next-line require-atomic-updates
                                                            data = [];
                                                        } else {
                                                            TIMELOGGER.info(`No New Records Found Ranking will not be Called`);
                                                            // batch_process_log('No New Records Found', startTime, SUCCESS);
                                                            // fileUploadInProgress = false;
                                                            // move_file(SUCCESS);
                                                        }
                                                    } else {
                                                        // batch_process_log('No Records Found', startTime, SUCCESS);
                                                        // fileUploadInProgress = false;
                                                        // move_file(SUCCESS);
                                                    }
                                                    // let lastInsertionBatch = resultInserted + data.length;
                                                    if (lastBatch) {
                                                        if (errOutRowsCount > 0) {
                                                            writeErrorOutData(headerRow, errOutRows, fileName);
                                                        }
                                                        // move_file(SUCCESS);
                                                        TIMELOGGER.info(`************* STATUS ************ \n`);
                                                        TIMELOGGER.info(`MAX Plan_Remit_Date DATABASE: ${databaseMaxDate}`);
                                                        TIMELOGGER.info(`MAX Plan_Remit_Date FILE: ${fileMaxDate}`);
                                                        TIMELOGGER.info(`Plan_Remit_Date Reference : ${remitReferenceDate}`);
                                                        TIMELOGGER.info(`Total Rows in a File: ${totalRowsInAFile}`);
                                                        TIMELOGGER.info(`Total error out Rows: ${errOutRowsCount}`);
                                                        TIMELOGGER.info(`Total RemitOut Rows: ${remitOutCount}`);
                                                        TIMELOGGER.info(`Total rows eligible for insertion: ${totalRowsToInsert}\n`);
                                                        TIMELOGGER.info(`************* STATUS ************`);
                                                    }
                                                    string_data = '';
                                                    rowsInBatch = 0;
                                                    readable.resume();
                                                })

                                            // event stream block
                                        }

                                    }))
                                    .on('error', function (err) {
                                        console.log('Error while reading file.', err);
                                    })
                                    .on('end', function () {
                                        console.log('Read entire file.')
                                    });
                            });
                    })
                } catch (err) {
                    fileUploadInProgress = false;
                    TIMELOGGER.error(`FileUpload Js Err: ${err.message}`)
                }
            }
        }
    })
}

function insertData(data, isLastBatch) {
    TIMELOGGER.info(`Read Batch records to insert ${data.length}`)
    return new Promise(function (resolve, reject) {
        insert_file_data(data, isLastBatch).then(function () {
            return resolve('success');
        })
            .catch(function () {
                return reject('error');
            })
    })
}
// eslint-disable-next-line
function writeErrorOutData(headerRow, data, fileName) {
    if (!fs.existsSync(config.ERROR_FILE_PATH)) {
        try {
            fs.mkdirSync(config.ERROR_FILE_PATH);
        } catch (err) {
            return TIMELOGGER.error(`ERROR Creating Folder Path for ERROR OUT DATA: ${err.message}`)
        }
    }
    try {
        let file = fileName;
        let filePrefix = file.slice(0, file.lastIndexOf('.'));
        let fileSuffix = file.slice(file.lastIndexOf('.'), file.length);
        let newPath = `${config.ERROR_FILE_PATH}${filePrefix}_ERROR_${fileSuffix}`
        let stringToInsert = '';
        if (headerRow && headerRow.length > 0) {
            headerRow.forEach(function (item) {
                stringToInsert += item + '|'
            });
            // remove extra pipe at end
            stringToInsert.slice(0, -1);
            // add next line
            stringToInsert += '\n';
        } else {
            TIMELOGGER.error(`No Header Row Found To Write Error Out Rows.`);
            return;
        }
        if (data && data.length > 0) {
            data.forEach(function (item) {
                let obj = { ...item };
                headerRow.forEach(function (key) {
                    stringToInsert += obj[key] + '|';
                });
                // remove extra pipe at end
                stringToInsert.slice(0, -1);
                // add next line
                stringToInsert += '\n';
            });
        }
        fs.writeFile(newPath, stringToInsert, function (err) {
            if (err) {
                console.log(' err ', err);
                TIMELOGGER.error(`Error Data writing error: ${err.message}`);
                return;
            }
            console.log(' SAVED. ');
            TIMELOGGER.info(`ERROR DATA WRITE SUCCEEFUL! `);
        });
    } catch (err) {
        TIMELOGGER.error(`writeErrorOutData ERROR: ${err.message}`)
    }
}

// eslint-disable-next-line
function getMaskedIds(item) {
    try {
        let claimIdTemp = (item.claim_id).toString();
        let claimLineTemp = (item.claim_line_item_control_number).toString();
        let subtractFactor = 4
        let claimIdLength = claimIdTemp.length;
        let claimLineLength = claimLineTemp.length;
        let claimId = claimIdTemp.slice(0, claimIdLength - subtractFactor)
            .replace(/[\d\w]/g, '*') + claimIdTemp.substr(claimIdLength - subtractFactor);
        let claimLineId = claimLineTemp.slice(0, claimLineLength - subtractFactor)
            .replace(/[\d\w]/g, '*') + claimLineTemp.substr(claimLineLength - subtractFactor);
        return { claimId, claimLineId };
    } catch (err) {
        TIMELOGGER.error(`ERROR IN getMaskedIds ERROR: ${err.message}`)
        return { claimId: '', claimLineId: '' };
    }
}


function insert_file_data(data, isFinalLoad) {
    // eslint-disable-next-line
    let result;
    // console.log('isFinalLoad ', isFinalLoad, ' ', data.length);
    return new Promise(function (resolve, reject) {
        try {
            models.sequelize.transaction(async function (t) {
                if (data.length > MAX_ROWS_INSERT) {
                    let count = 0;
                    let dataToUpdate = [...data];
                    // console.log('data.length ', data.length);
                    TIMELOGGER.info(`Insert In Chunks`);
                    while ((count * MAX_ROWS_INSERT) < data.length) {
                        // console.log(' count ', count);
                        TIMELOGGER.info(`Batch No ${count + 1}`);
                        try {
                            let dataToInsert = dataToUpdate.splice(0, MAX_ROWS_INSERT);
                            let summary_data = unquieData(dataToInsert, 'claim_id');
                            await models.Claim_Summary.bulkCreate(summary_data, { transaction: t, updateOnDuplicate: UPDATE_COLUMNS })
                            await models.Claim_Lines.bulkCreate(dataToInsert, { transaction: t, updateOnDuplicate: UPDATE_COLUMNS })
                            TIMELOGGER.info(`total completed ${(count + 1) * MAX_ROWS_INSERT}`);
                            count++;
                            if (dataToUpdate.length == 0 && !isFinalLoad) {
                                resolve('SUCCESS');
                            }
                        } catch (err) {
                            batch_process_log(err, startTime, ERROR);
                            fileUploadInProgress = false;
                            reject('ERROR');
                            if (isFinalLoad) {
                                move_file(ERROR);
                            }
                            TIMELOGGER.error(`Batch Insert ERR: ${JSON.stringify(err)}`);
                            return;
                        }
                    }
                } else {
                    TIMELOGGER.info(`Insert All at once`);
                    try {
                        console.log('insert all at once');
                        let summary_data = unquieData(data, 'claim_id');
                        result = await models.Claim_Summary.bulkCreate(summary_data, { transaction: t, updateOnDuplicate: UPDATE_COLUMNS })
                        await models.Claim_Lines.bulkCreate(data, { transaction: t, updateOnDuplicate: UPDATE_COLUMNS })
                        move_file(SUCCESS);
                        // return resolve('success');
                    } catch (err) {
                        if (isFinalLoad) {
                            batch_process_log(err, startTime, ERROR);
                            fileUploadInProgress = false;
                            move_file(ERROR);
                        }
                        TIMELOGGER.error(`Insert All at once ERR: ${JSON.stringify(err)}`);
                        return reject('error')
                        // return res.status(500).send(err.message);
                    }
                }
                if (isFinalLoad) {
                    TIMELOGGER.info(`Data Insert Success.. Starting Ranking..`);
                    fileUploadInProgress = false;
                    batch_process_log('Inserted Successfully', startTime, SUCCESS);
                    move_file(SUCCESS);
                    rank_service.updateClaimLineRanking();
                    return resolve('success');
                }
                // res.status(200).send(result);
            });

        } catch (err) {
            batch_process_log(err, startTime, ERROR);
            if (isFinalLoad) {
                fileUploadInProgress = false;
                move_file(ERROR);
                TIMELOGGER.error(`FileUploadDao.js/insert_file_data ERR: ${err.message}`)
            }
            // res.status(500).send(err.msg)
        }
    })
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
            TIMELOGGER.info(`batch_process_log done successfully STATUS: ${statusMessage} MESSAGE: ${message}`);
        })
        .catch(function (err) {
            TIMELOGGER.error(`batch_process_log err: ${err}`);
        });
}

module.exports = { upload_data, insert_file_data, batch_process_log }
