var Bluebird = require('bluebird');
var Jwt = require('jsonwebtoken');
var Superagent = require('superagent');
var Url = require('url');

var defaults = require('lodash.defaults');
var defaultsDeep = require('lodash.defaultsdeep');
var forEach = require('lodash.foreach');
var getFrom = require('lodash.get');

/**
 * Creates an object representing a Webtask
 *
 * @constructor
 */
function Webtask (sandbox, token) {
    /**
     * @property claims - The claims embedded in the Webtask's token
     */
    this.claims = Jwt.decode(token);
    
    /**
     * @property sandbox - The {@see Sandbox} instance used to create this Webtask instance
     */
    this.sandbox = sandbox;
    
    /**
     * @property token - The token associated with this webtask
     */
    this.token = token;

    /**
     * @property container - The container name in which the webtask will run
     */
    Object.defineProperty(this, 'container', {
        enumerable: true,
        get: function () {
            return this.sandbox.container;
        }
    });

    /**
     * @property url - The public url that can be used to invoke this webtask
     */
    Object.defineProperty(this, 'url', {
        enumerable: true,
        get: function () {
            var url = this.sandbox.url + '/api/run/' + this.sandbox.container;

            if (this.claims.jtn) url += '/' + this.claims.jtn;
            else url += '?key=' + this.token;

            return url;
        }
    });
}

/**
 * Create a stream of logs from the webtask container
 *
 * Note that the logs will include messages from our infrastructure.
 *
 * @param {Object} options - Streaming options overrides
 * @param {String} [options.container] - The container for which you would like to stream logs. Defaults to the current profile's container.
 * @returns {Stream} A stream that will emit 'data' events with container logs
 */
Webtask.prototype.createLogStream = function (options) {
    return this.sandbox.createLogStream(options);
};

/**
 * Run the webtask and return the result of execution
 *
 * @param {Object} options - Options used to tweak how the webtask will be invoked
 * @param {Function} [cb] - Optional node-style callback that will be invoked upon completion
 * @returns {Promise} - A Promise that will be resolved with the response from the server.
 */
Webtask.prototype.run = function (options, cb) {
    var methodMap = {
        'delete': 'del',
    };
    var urlData = Url.parse(this.url, true);
    var config = defaultsDeep(options, {
        method: 'get',
        path: '',
        query: {},
    });
    var method = getFrom(methodMap, config.method, config.method);

    urlData.pathname += config.path;
    urlData.query = defaults(urlData.query, config.query);

    var request = Superagent
        [method](Url.format(urlData))
        .query(config.query);

    if (config.body) request = request.send(config.body);

    forEach(config.headers, function (value, header) {
        request = request.set(header, value);
    });

    var promise = Bluebird.resolve(request)
        .catch(function (err) {
            if (err.response) return err.response;

            throw err;
        })
        .then(function (res) {
            res.statusCode = res.status;

            return res;
        });

    return cb ? promise.nodeify(cb, {spread: true}) : promise;
};

/**
 * Schedule the webtask to run periodically
 * 
 * @param {String} schedule - Cron-string-formatted schedule
 * @param {Function} [cb] - Optional node-style callback that will be invoked upon completion
 * @returns {Promise} - A Promise that will be resolved with a {@see CronJob} instance.
 */
Webtask.prototype.createCronJob = function (schedule, cb) {
    if (!this.claims.jtn) throw new Error('Cron jobs can only be created from named webtasks.');
    
    var promise = this.sandbox.createCronJob({
        name: this.claims.jtn,
        token: this.token,
        schedule: schedule,
    });
    
    return cb ? promise.nodeify(cb, {spread: true}) : promise;
};

module.exports = Webtask;