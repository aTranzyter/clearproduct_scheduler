module.exports = function (Sequelize, Types) {
    let Status = Sequelize.define('Status', {
        status_code: { type: Types.STRING, unique: true, primaryKey: true },
        status_name: { type: Types.STRING },
        is_active: { type: Types.BOOLEAN, defaultValue: false },
        mark_processed: { type: Types.BOOLEAN, defaultValue: false },
        mark_unprocessed: { type: Types.BOOLEAN, defaultValue: false },
        mark_inprogress: { type: Types.BOOLEAN, defaultValue: false }
    }, {
            modelName: 'Status',

            // define the table's name
            tableName: 'Status',

            // disable the modification of table names; By default, sequelize will automatically
            // transform all passed model names (first parameter of define) into plural.
            // if you don't want that, set the following
            freezeTableName: true,

            // don't add the timestamp attributes (updatedAt, createdAt)
            timestamps: true,
            classMethods: {
                associate: function(models) {
                    models.Status.belongsTo(models.Assignee, {
                        foreignKey: 'updatedBy',
                        targetKey: 'user_id'
                    })
                }
            }
        });
    return Status;
}