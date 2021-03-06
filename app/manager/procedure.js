
const { sequelize } = require('../models');
const { database } = require('../config').SQL;
async function update_color_range() {
    await sequelize.query(`DROP PROCEDURE IF EXISTS ${database}.\`Update_Color_Range\`;`);
    sequelize.query(`
            CREATE  PROCEDURE ${database}.\`Update_Color_Range\`()
            BEGIN

            DECLARE c_done BOOLEAN DEFAULT FALSE;
            DECLARE v_summary_count INTEGER DEFAULT 0;
            DECLARE v_base_percent INTEGER DEFAULT 0;
            DECLARE v_color_hex VARCHAR (255);
            DECLARE v_limit_end INTEGER DEFAULT 0;
            DECLARE v_limit_start INTEGER DEFAULT 0;

            DECLARE base_percent_cursor CURSOR FOR
            SELECT base_percent, color_hex FROM ${database}.Priority_Range WHERE is_active = 1;

            SET SQL_SAFE_UPDATES = 0;

            BEGIN
            UPDATE ${database}.Claim_Summary cs,
                (SELECT 
                    rs.rank1, cls.claim_id
               FROM
                   (select patient_subscriber_id, sum(priority_score) as rank1 from (SELECT 
                    cls.patient_subscriber_id as patient_subscriber_id, cls.priority_score as priority_score, cls.claim_id as claim_id
                FROM
                    ${database}.Claim_Lines  cls
                    JOIN ${database}.Claim_Summary cs ON cs.claim_id = cls.claim_id where cs.status is Null) result
                 GROUP BY patient_subscriber_id) rs
                       JOIN
                   (SELECT 
                       patient_subscriber_id, claim_id
                   FROM
                       ${database}.Claim_Lines) cls ON cls.patient_subscriber_id = rs.patient_subscriber_id
                                ) rs
                SET
                    cs.priority_score = rs.rank1
                WHERE
                    cs.is_active = 1 AND
                    cs.claim_id = rs.claim_id ;
            END;


            BEGIN
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET c_done = TRUE;
            SELECT count(*) FROM ${database}.Claim_Summary cs
            LEFT JOIN ${database}.Status s
            on cs.status = s.status_code
            and cs.is_active =1
            and s.is_active=1
            where (s.mark_processed=0
            or cs.status is null) INTO v_summary_count;

            SET @v_limit_start = 0;
            SET @v_limit_end = 0;

            OPEN base_percent_cursor;
                get_base_percent_value: LOOP

                FETCH base_percent_cursor INTO v_base_percent,v_color_hex;
                IF c_done THEN
					LEAVE get_base_percent_value;
				END IF;
                SET @v_limit_start = @v_limit_start + @v_limit_end ;
                SET @v_limit_end  =  round( (v_summary_count * v_base_percent) / 100);

                SET @sql = CONCAT('UPDATE Claim_Summary csp, (SELECT claim_id FROM ${database}.Claim_Summary cs LEFT JOIN ${database}.Status s on cs.status = s.status_code and cs.is_active =1 and s.is_active=1 where (s.mark_processed=0 or cs.status is null) order by cs.priority_score desc limit ?, ? ) rt SET csp.color_hex = ', "'", v_color_hex, "'", ' where rt.claim_id = csp.claim_id ');


                PREPARE stmt FROM @sql;
                EXECUTE stmt USING @v_limit_start, @v_limit_end;
                DEALLOCATE PREPARE stmt;

                END LOOP get_base_percent_value;
            CLOSE base_percent_cursor;
            END;

            SET SQL_SAFE_UPDATES = 1;
            END;`)
        .then(function () {
            console.log(' generated procedure')
        })
        .catch(function (err) {
            console.log(' err procedure ', err.message)
        })
}
//                 SELECT
//                     claim_id, AVG(priority_score) AS rank1
//                 FROM
//                 ${database}.Claim_Lines
//                 GROUP BY claim_id
module.exports = { update_color_range }
