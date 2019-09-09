const http = require('http');
const models = require('../models');
const { RANK_SERVICE_HOST, RANK_SERVICE_PORT, RANK_SERVICE_PATH } = require('../config');
const { TIMELOGGER } = require('../winston');

function updateClaimLineRanking() {
    TIMELOGGER.info(`Claim_Lines Ranking Started`);
    let url = 'http://' + RANK_SERVICE_HOST + ':' + RANK_SERVICE_PORT + RANK_SERVICE_PATH;
    TIMELOGGER.info(`Ranking Service URL: ${url}`);
    http.get(url, function (resp) {
        let data = '';
        resp.on('data', function (chunk) {
            data += chunk;
        })
        resp.on('end', function () {
            TIMELOGGER.info(`updateClaimLineRanking ${data}`)
            updateClaimSummaryRanking();
        });
    }).on('error', function(err) {
        TIMELOGGER.error(`updateClaimLineRanking ${err.message}`)
    });
}

async function updateClaimSummaryRanking() {
    TIMELOGGER.info(`Claim_Summary Ranking started.`);
    try {
        await models.sequelize.query(`
    UPDATE Claim_Summary cs,
    (SELECT
        claim_id, FORMAT(AVG(priority_score), 2) AS rank1
    FROM
        Claim_Lines
    GROUP BY claim_id ) rs
    SET
        cs.priority_score = rs.rank1
    WHERE
        cs.claim_id = rs.claim_id`, { raw: true, type: models.sequelize.QueryTypes.UPDATE });
        TIMELOGGER.info('UPDATE SUMMRY RANK SUSSESS ');
    } catch (err) {
        TIMELOGGER.error(`Claim_Summary Rank ERR: ${err.message}`)
    }
}

module.exports = { updateClaimLineRanking }