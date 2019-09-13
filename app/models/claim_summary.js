/**
 * Created by mac on 02/11/18.
 */
// app/models/Claim_Summary.js

module.exports = function (Sequelize, Types) {
    var Claim_Summary = Sequelize.define('Claim_Summary', {
        claim_id: { type: Types.STRING, unique: true, primaryKey: true },
        priority_score: { type: Types.DOUBLE },
        is_active: { type: Types.BOOLEAN, defaultValue: true },
        is_processed: { type: Types.BOOLEAN, defaultValue: false },
        processed_date: { type: Types.DATE },
        claim_receipt_date: { type: Types.DATE },
        plan_remit_date: { type: Types.DATE },
        assigned_to_changed_date: { type: Types.DATE },
        status_changed_date: { type: Types.DATE },
        note: { type: Types.STRING },
        color_hex: { type: Types.STRING },
        // assigned_to: { type: Types.STRING, references: { model: 'Assignee', key: 'user_id' } },
        // status: { type: Types.STRING, references: { model: 'Status', key: 'status_code' } },
        // updatedBy: { type: Types.STRING, references: { model: 'Assignee', key: 'user_id' } },

        /* version: { type: Types.INTEGER },
        Service_Start_Date: { type: Types.DATE },
        Process_Flag: { type: Types.BOOLEAN, defaultValue: false },
        Rank: { type: Types.INTEGER },*/
    }, {
            modelName: 'Claim_Summary',

            // define the table's name
            tableName: 'Claim_Summary',

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
            // classMethods: {
            //     associate: function (models) {}
            // }
        });
        Claim_Summary.associate = function(models) {
            models.Claim_Summary.belongsTo(models.Assignee, {
                foreignKey: 'assigned_to',
                targetKey: 'user_id'
            });
            models.Claim_Summary.belongsTo(models.Assignee, {
                foreignKey: 'updatedBy',
                targetKey: 'user_id'
            });
            models.Claim_Summary.belongsTo(models.Status, {
                foreignKey: 'status',
                targetKey: 'status_code'
            });
            models.Claim_Summary.hasMany(models.Claim_Lines, {
                as: 'Claim_Line',
                foreignKey: 'claim_id'
            })
        }
    return Claim_Summary;
};