// define our claim model
// module.exports allows us to pass this to other files when it is called
/*

 */
module.exports = function (Sequlize, Types) {
    var Claim_Lines_History = Sequlize.define('Claim_Lines_History', {
        claim_line_item_control_number: { type: Types.STRING },
        claim_id: { type: Types.STRING },
        claim_system: { type: Types.INTEGER },
        patient_number: { type: Types.INTEGER },
        health_plan: { type: Types.STRING },
        carrier_name: { type: Types.STRING },
        plan_id: { type: Types.INTEGER },
        plan_type: { type: Types.STRING },
        plan_billed_amount: { type: Types.DOUBLE },
        plan_remit_paid_amount: { type: Types.DOUBLE },
        plan_billed_net_status: { type: Types.STRING },
        plan_billed_submission_version: { type: Types.INTEGER },
        plan_billed_modification_version: { type: Types.INTEGER },
        parent_provider_id: { type: Types.INTEGER },
        parent_provider_name: { type: Types.STRING },
        provider_id: { type: Types.INTEGER },
        provider_name: { type: Types.STRING },
        provider_billed_amount_uc: { type: Types.DOUBLE },
        provider_remit_total_paid_total: { type: Types.DOUBLE },
        provider_billed_net_status: { type: Types.STRING },
        provider_billed_submission_version: { type: Types.INTEGER },
        plan_billed_carc_1: { type: Types.STRING },
        plan_billed_carc_2: { type: Types.STRING },
        plan_remit_carc_1: { type: Types.STRING },
        plan_remit_carc_2: { type: Types.STRING },
        plan_remit_carc_3: { type: Types.STRING },
        plan_remit_carc_4: { type: Types.STRING },
        plan_remit_carc_5: { type: Types.STRING },
        plan_remit_carc_6: { type: Types.STRING },
        plan_remit_rarc_1: { type: Types.STRING },
        plan_remit_rarc_2: { type: Types.STRING },
        plan_remit_rarc_3: { type: Types.STRING },
        plan_remit_rarc_4: { type: Types.STRING },
        plan_remit_rarc_5: { type: Types.STRING },
        plan_remit_rarc_6: { type: Types.STRING },
        //routg_rsn_dsc: { type: Types.STRING },
        plan_billed_date: { type: Types.DATE },
        service_start_date: { type: Types.DATE },
        service_end_date: { type: Types.DATE },
        service_line: { type: Types.STRING },
        service_code: { type: Types.INTEGER },
        plan_billed_hcpc: { type: Types.STRING },
        //assigned_to: { type: Types.STRING },
        //status: { type: Types.STRING },
        priority_score: { type: Types.DOUBLE },
        // is_active: { type: Types.BOOLEAN },
        updatedBy: { type: Types.STRING }
    }, {
            modelName: 'Claim_Lines_History',

            // define the table's name
            tableName: 'Claim_Lines_History',

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
            classMethods: {}
        });
    return Claim_Lines_History;
};