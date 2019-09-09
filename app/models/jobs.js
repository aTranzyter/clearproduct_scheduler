module.exports = function (Sequelize, Types) {
    let Jobs = Sequelize.define('Jobs', {
        script_id: { type: Types.STRING, primaryKey: true },
        script_name: { type: Types.STRING },
    }, {
            modelName: 'Jobs',

            // define the table's name
            tableName: 'Jobs',

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

    return Jobs;
};