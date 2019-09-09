/**
 * Created by mac on 02/11/18.
 */
// app/models/Claim_Summary_History.js

module.exports = function (Sequelize, Types) {
    var Claim_Summary_History = Sequelize.define('Claim_Summary_History', {
        claim_id: { type: Types.INTEGER },
        assigned_to: { type: Types.STRING },
        status: { type: Types.STRING },
        priority_score: { type: Types.DOUBLE },
        is_active: { type: Types.BOOLEAN, defaultValue: false },
        is_processed: { type: Types.BOOLEAN, defaultValue: false },
        claim_receipt_date: { type: Types.DATE },
        plan_remit_date: { type: Types.DATE },
        assigned_to_changed_date: { type: Types.DATE },
        status_changed_date: { type: Types.DATE },
        note: { type: Types.STRING },
        // note: { type: Types.STRING },
        updatedBy: { type: Types.STRING },

        /* version: { type: Types.INTEGER },
        Service_Start_Date: { type: Types.DATE },
        Process_Flag: { type: Types.BOOLEAN, defaultValue: false },
        Rank: { type: Types.INTEGER },*/
    }, {
            modelName: 'Claim_Summary_History',

            // define the table's name
            tableName: 'Claim_Summary_History',

            // disable the modification of table names; By default, sequelize will automatically
            // transform all passed model names (first parameter of define) into plural.
            // if you don't want that, set the following
            freezeTableName: true,

            // don't add the timestamp attributes (updatedAt, createdAt)
            timestamps: true,

            // don't delete database entries but set the newly added attribute deletedAt
            // to the current date (when deletion was done). paranoid will only work if
            // timestamps are enabled
            paranoid: true,
        });

    return Claim_Summary_History;
};