const crosspost = require('../modules/Crosspost.js');

module.exports = async (_original, updated) => {
	if (!updated.flags.bitfield) crosspost(updated, true);
};