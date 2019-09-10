
const { sequelize } = require('../models');
async function update_color_range() {
    await sequelize.query(`DROP PROCEDURE IF EXISTS clearcentrix.\`Update_Color_Range\`;`);
    sequelize.query(`
            CREATE DEFINER=\`root\`@\`localhost\` PROCEDURE clearcentrix.\`Update_Color_Range\`()
            BEGIN

            DECLARE c_done BOOLEAN DEFAULT FALSE;
            DECLARE v_summary_count INTEGER DEFAULT 0;
            DECLARE v_base_percent INTEGER DEFAULT 0;
            DECLARE v_color_hex VARCHAR (255);
            DECLARE v_limit_end INTEGER DEFAULT 0;
            DECLARE v_limit_start INTEGER DEFAULT 0;

            DECLARE base_percent_cursor CURSOR FOR
            SELECT base_percent, color_hex FROM clearcentrix.Priority_Range;
            
            SET SQL_SAFE_UPDATES = 0;	
            
            BEGIN
            UPDATE clearcentrix.Claim_Summary cs,
                (SELECT
                    claim_id, AVG(priority_score) AS rank1
                FROM
                    clearcentrix.Claim_Lines
                GROUP BY claim_id ) rs
                SET
                    cs.priority_score = rs.rank1
                WHERE
                    cs.claim_id = rs.claim_id ;
            END;
            
            
            BEGIN
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET c_done = TRUE;
            SELECT COUNT(*) FROM clearcentrix.Claim_Summary INTO v_summary_count;
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
                
                SET @sql = CONCAT('UPDATE Claim_Summary cs, (SELECT claim_id FROM Claim_Summary order by priority_score desc limit ?, ? ) rt SET cs.color_hex = ', "'", v_color_hex, "'", ' where rt.claim_id = cs.claim_id ');
            
                
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

module.exports = { update_color_range }