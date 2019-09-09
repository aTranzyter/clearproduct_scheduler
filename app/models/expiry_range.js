module.exports = function (Sequelize, Types) {
    let Expiry_Range = Sequelize.define('Expiry_Range', {
        start_value: { type: Types.INTEGER },
        end_value: { type: Types.INTEGER }
    }, {
            modelName: 'Expiry_Range',

            // define the table's name
            tableName: 'Expiry_Range',

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

    return Expiry_Range;
};