/**
 * Construct our Site controller
 * @param {object} models
 * @constructor
 */
exports.ServerController = function(models) {

    /**
     * Arguments for our GET methods.
     * @type {{getKill: Array}}
     */
    this.args = {
        getKill: ['id']
    };

    /**
     * Respond to events from an OpenTTD instance.
     * @param {number} id The id of the instance.
     * @param {string} data The response.
     */
    models.servers.addHandler('out', function(id, data) {

        //pick out valid responses to the "companies" command
        var pattern = /Company Name: '([^']+).*?Money: (-?[0-9]+)/;
        var patternResults = (pattern.exec(data));

        //save to a DB if valid. This is array check is the ugliest bit of JS I've ever seen.
        if (Object.prototype.toString.call( patternResults ) === '[object Array]' && patternResults.length > 0) {
            models.Stat.timestep++;
            var stat = new models.Stat();
            stat.companyName = patternResults[1];
            stat.companyMoney = patternResults[2];
            stat.save();
        }
    });

    /**
     * Callback to execute on stderr, which OTTD uses more than you'd think.
     */
    models.servers.addHandler('err', function(id, data) {
        console.log('SERVER ' + id + ', STDERR SAYS ' + data);
        models.io.sockets.emit('err', { server: id, data: data});
    });

    /**
     * Callback to execute on stdout.
     */
    models.servers.addHandler('out', function(id, data) {
        console.log('SERVER ' + id + ', STDOUT SAYS ' + data);
        models.io.sockets.emit('out', { server: id, data: data});
    });

    /**
     * We periodically send "companies"
     * to all running instances to get stats.
     */
    setInterval(function() {
        var instances = models.servers.getInstances();
        for (var instance in instances) {
            if (instances.hasOwnProperty(instance)) {
                models.servers.sendMessage(instance, 'companies');
            }
        }
    }, 1000 * 60);

    /**
     * Show a list of servers
     * @param {object} req The request.
     * @param {object} res The response.
     */
    this.getServers = function(req, res) {
        res.render('servers', { servers: models.servers.getInstances()});
    };

    /**
     * First express http handler
     * @param {object} req The request.
     * @param {object} res The response.
     */
    this.getSpawn = function(req, res) {
        models.servers.spawnServer({name: 'Server 1'});
        res.redirect(this.uri + 'console');
    };

    /**
     * Kill a running server.
     * @param {object} req The request.
     * @param {object} res The response.
     */
    this.getKill = function(req, res) {
        var instances = models.servers.getInstances();
        if (typeof instances[req.params.id] != "undefined") {
            models.servers.killServer(req.params.id, (function() {
                res.redirect(this.uri + 'servers');
            }).bind(this));
        }
    };

    /**
     * View console output of a server.
     * @param {object} req The request.
     * @param {object} res The response.
     */
    this.getConsole = function(req, res) {
        res.render('console', {});
    }
};

var Controller = require('./controller').Controller;
exports.ServerController.prototype = new Controller();