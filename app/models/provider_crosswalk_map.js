module.exports = function (Sequelize, Types) {
    let Provider_Crosswalk_Map = Sequelize.define('Provider_Crosswalk_Map', {
        provider_id: { type: Types.INTEGER, primaryKey: true },
        fbl_id: { type: Types.STRING }
    }, {
            modelName: 'Provider_Crosswalk_Map',

            // define the table's name
            tableName: 'Provider_Crosswalk_Map',

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

    return Provider_Crosswalk_Map;
};