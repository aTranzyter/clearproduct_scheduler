module.exports = function (Sequelize, Types) {
    let Priority_Range = Sequelize.define('Priority_Range', {
        start_value: { type: Types.INTEGER },
        end_value: { type: Types.INTEGER },
        base_percent: {type: Types.INTEGER},
        color_hex: { type: Types.STRING },
        is_active: { type: Types.BOOLEAN, defaultValue: false }
    }, {
            modelName: 'Priority_Range',

            // define the table's name
            tableName: 'Priority_Range',

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

    return Priority_Range;
};