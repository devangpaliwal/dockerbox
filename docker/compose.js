var exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	fs = require('fs'),
	tempFolder = __dirname + '/tempfiles/composefolders/',
	async = require('async'),
	secrets = require(__dirname + '/../secrets.json'),
	registry = secrets.registry,
	registry = registry ? registry+'/' : '',
	host = secrets.swarm_host;

	process.env.DOCKER_HOST = host;

module.exports = {
	start: function(name, serverStructure, stream, cb) {
		//create a folder for the compose yml file
		exec('mkdir -p '+ tempFolder + name, function(err, stdout, stderr) {
			if(err||stdout||stderr) //console.log(err, stdout, stderr);
			if(err) return;

			var ymlString = CreateYml(serverStructure);
		    fs.writeFileSync(tempFolder + name + '/docker-compose.yml', ymlString);
			
			var compose = spawn('docker-compose', ['up', '-d'], {"cwd":tempFolder + name, "env" : process.env});

			compose.stdout.on('data', function(data) { 
				stream.data += (data ? data.toString('utf8') : '');
				//console.log(data ? data.toString('utf8') : ''); 
			});
			compose.stdout.on('end', function(data) {
				stream.data += (data ? data.toString('utf8') : '');
				//console.log(data ? data.toString('utf8') : '');
			});
			compose.on('exit', function(code) {
				stream.data += ('Docker Compose for '+name+'.dockerbox.in completed with Exit Code: ' + code);
				//console.log('Exit with CODE: ' + code);
				if(code === 0) getTargetHosts(name, serverStructure, function() {
					if(cb) cb(code);
				});
				else if(cb) cb(code);
			});
		});
	},
	stop: function(name) {
		var command = 'COMPOSE_FILE=' + tempFolder + name + '/docker-compose.yml docker-compose stop';
		if(host) command = 'DOCKER_HOST=' + host + ' ' + command;
		exec(command, function(err, stdout, stderr) {
			if(err) {
				console.log(err);
				return;
			}
			var command = 'COMPOSE_FILE=' + tempFolder + name + '/docker-compose.yml docker-compose rm --force';
			if(host) command = 'DOCKER_HOST=' + host + ' ' + command;
			exec(command, function(err, stdout, stderr) {
				if(err) {
					console.log(err);
				}
			});
		});
	},
	remove: function(name) {
		var command = 'COMPOSE_FILE=' + tempFolder + name + '/docker-compose.yml docker-compose rm --force';
		if(host) command = 'DOCKER_HOST=' + host + ' ' + command;
		exec(command, function(err, stdout, stderr) {
			if(err) {
				console.log(err);
			}
		});
	}
};


function CreateYml(app) {
	var yml = appTemplate(app);
	app.dependency = app.dependency || [];
	app.dependency.forEach(function(d){
		yml += CreateYml(d);
	});
	return yml;

	function appTemplate(app) {
		app.dependency = app.dependency || [];
		var template = app.name + ':\n' +
		'  image: ' + registry + app.image + '\n' +
		'  ports:\n' +
		'   - \"' + (app.port || 80) + '\"\n' +
		'   - \"57575\"\n' +
		//'   - \"' + app.http_forward_port + ':' + (app.port || 80) + '\"\n' +
		//'   - \"' + app.terminal_forward_port + ':57575\"\n' +
		( app.dependency.length ? '  links:\n' : '');

		app.dependency.forEach(function(d){
			template += '   - ' + d.name + ':' + d.fqdn + '\n';
		});
		return template;
	}
}

function getTargetHosts(qaname, app, done) {
	var command = 'COMPOSE_FILE=' + tempFolder + qaname + '/docker-compose.yml docker-compose port ';
	if(host) command = 'DOCKER_HOST=' + host + ' ' + command;
	var funStack = [];
	assignHosts(app);
	async.parallel(funStack, function(err, cb) {
		done();
	});

	function assignHosts(app) {
		funStack.push(function(cb){getHttpHost('http_forward_host', app, app.port || 80, cb)});
		funStack.push(function(cb){getHttpHost('terminal_forward_host', app, 57575, cb)});
		app.dependency = app.dependency || [];
		app.dependency.forEach(function(d){
			assignHosts(d);
		});
	}

	function getHttpHost(hostname, app, port, cb) {
		exec(command + app.name + ' ' + port, function(err, stdout, stderr) {
			if(err) {
				console.log(err);
				cb && cb(null);
				return;
			}
			if(stdout) app[hostname] = stdout.trim();
			cb && cb(null);
		});
	}
}



