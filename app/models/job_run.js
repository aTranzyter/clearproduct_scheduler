module.exports = function (Sequelize, Types) {
    let Job_Run = Sequelize.define('Job_Run', {
        script_id: { type: Types.STRING, references: { model: 'Jobs', key: 'script_id' } },
        run_start: { type: Types.DATE },
        run_end: { type: Types.DATE },
        status: { type: Types.STRING },
        error_description: { type: Types.STRING }
    }, {
            modelName: 'Job_Run',

            // define the table's name
            tableName: 'Job_Run',

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

    return Job_Run;
};