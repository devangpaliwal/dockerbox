var secrets = require('../secrets.json');

module.exports = {
	deleteAuth : function(owner, req) {
		if(isAdmin(req.session.user && req.session.user.email)) return true;
		if(owner && owner.email && req.session.user && req.session.user.email && (owner.email != req.session.user.email)) {
			return false;
		}
		return true;
	},
	imageName : function(name) {
		// body...
	},
	serverName : function(name) {
		// body...
	}

}

function isAdmin(email) {
	return secrets.admin.indexOf(email) > -1;
}