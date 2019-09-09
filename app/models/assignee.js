
const crypto = require('crypto');

module.exports = function (Sequelize, Types) {
    let Assignee = Sequelize.define('Assignee', {
        user_id: { type: Types.STRING, unique: true, primaryKey: true },
        name: { type: Types.STRING },
        password: { type: Types.STRING },
        password_hash: { type: Types.STRING },
        password_salt: { type: Types.STRING },
        is_admin: { type: Types.BOOLEAN, defaultValue: false },
        is_active: { type: Types.BOOLEAN, defaultValue: true },
        updatedBy: { type: Types.STRING }
    }, {
            tableName: 'Assignee',
            modelName: 'Assignee',
            // freezeTableName: true,
            timestamps: true,
            paranoid: true,
            classMethods: {
                // eslint-disable-next-line
                associate: function(models){}
            },
            hooks: {
                // eslint-disable-next-line
                beforeCreate: function (assignee, options) {
                    let password = assignee.password;
                    let salt = Assignee.genRandomString(16);
                    let hash = Assignee.sha512(password, salt);
                    assignee.password = null;
                    assignee.password_hash = hash.passwordHash;
                    assignee.password_salt = salt;
                }
            }
        });
    /**
    * generates random string of characters i.e salt
    * @function
    * @param {number} length - Length of the random string.
    */
    Assignee.genRandomString = function (length) {
        return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex') /** convert to hexadecimal format */
            .slice(0, length);   /** return required number of characters */
    }
    /**
     * hash password with sha512.
     * @function
     * @param {string} password - List of required fields.
     * @param {string} salt - Data to be validated.
    */
    Assignee.sha512 = function (password, salt) {
        var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
        hash.update(password);
        var value = hash.digest('hex');
        return {
            salt: salt,
            passwordHash: value
        };
    };

    return Assignee;
}
