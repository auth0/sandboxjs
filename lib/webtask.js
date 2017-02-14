var Bluebird = require('bluebird');
var Decode = require('jwt-decode');
var Path = require('path');
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
function Webtask (sandbox, token, options) {
    if (!options) options = {};
    
    /**
     * @property claims - The claims embedded in the Webtask's token
     */
    this.claims = Decode(token);
    
    /**
     * @property sandbox - The {@see Sandbox} instance used to create this Webtask instance
     */
    this.sandbox = sandbox;
    
    /**
     * @property token - The token associated with this webtask
     */
    this.token = token;

    /**
     * @property meta - The metadata associated with this webtask
     */
    this.meta = options.meta || {};

    /**
     * @property container - The container name in which the webtask will run
     */
    Object.defineProperty(this, 'container', {
        enumerable: true,
        get: function () {
            return options.container || this.sandbox.container;
        }
    });

    /**
     * @property url - The public url that can be used to invoke this webtask
     */
    Object.defineProperty(this, 'url', {
        enumerable: true,
        get: function () {
            var url = options.webtask_url;
            if (!url) {
                if (this.claims.host) {
                   var surl = Url.parse(this.sandbox.url);
                   url = surl.protocol + '//' + this.claims.host + (surl.port ? (':' + surl.port) : '') + '/' + this.sandbox.container;
                }
                else {
                   url = this.sandbox.url + '/api/run/' + this.sandbox.container;
                }

                if (this.claims.jtn) url += '/' + this.claims.jtn;
                else url += '?key=' + this.token;
            }

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
    var config = defaultsDeep(options || {}, {
        method: 'get',
        path: '',
        query: {},
    });
    var method = getFrom(methodMap, config.method, config.method);
    var query = defaults(urlData.query, config.query);

    urlData.pathname = Path.join(urlData.pathname, config.path);
    urlData.query = {};
    urlData.search = null;

    var url = Url.format(urlData);
    var request = Superagent[method](url)
        .query(query);

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
 * @param {Object} options - Options for creating the webtask
 * @param {Object} options.schedule - Cron-string-formatted schedule
 * @param {Object} [options.name] - The name for the cron job
 * @param {Function} [cb] - Optional node-style callback that will be invoked upon completion
 * @returns {Promise} - A Promise that will be resolved with a {@see CronJob} instance.
 */
Webtask.prototype.createCronJob = function (options, cb) {
    var parsedUrl = Url.parse(this.claims.url);
    var filename = parsedUrl.pathname
        ?   Path.basename(parsedUrl.pathname)
        :   '';
    
    options = defaultsDeep(options, {
        name: this.claims.jtn || filename,
        state: 'active',
        meta: this.meta,
    });
    
    if (!options.name) throw new Error('Cron jobs must have a name.');
    
    var promise = this.sandbox.createCronJob({
        name: options.name,
        token: this.token,
        schedule: options.schedule,
        state: options.state,
        meta: options.meta
    });
    
    return cb ? promise.nodeify(cb, {spread: true}) : promise;
};


/**
 * Inspect an existing webtask to optionally get code and/or secrets
 * 
 * @param {Object} options - Options for inspecting the webtask.
 * @param {Boolean} [options.decrypt] - Decrypt the webtask's secrets.
 * @param {Boolean} [options.fetch_code] - Fetch the code associated with the webtask.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with the result of inspecting the token.
 */
Webtask.prototype.inspect = function (options, cb) {
    options.token = this.token;
    
    var promise = this.sandbox.inspectToken(options);

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Remove the named webtask
 * 
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with the result of inspecting the token.
 */
Webtask.prototype.remove = function (cb) {
    var promise;
    
    if (!this.claims.jtn) {
        var err = new Error('Unnamed webtasks cannot be removed');
        err.statusCode = 400;
        
        promise = Bluebird.reject(err);

        return cb ? promise.nodeify(cb) : promise;
    } else {
        promise = this.sandbox.removeWebtask({
            name: this.claims.jtn,
        });
    }

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Revoke the webtask's token
 * 
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with the result of revoking the token.
 */
Webtask.prototype.revoke = function (cb) {
    var promise = this.sandbox.revokeToken(this.token);

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Update a webtask
 * 
 * @param {Object} [options] - Options for updating a webtask (@see: Sandbox.updateWebtask)
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with the result of revoking the token.
 */
Webtask.prototype.update = function (options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    
    if (!options) {
        options = {};
    }
    
    options.name = this.claims.jtn;
    
    var promise = this.sandbox.updateWebtask(options);

    return cb ? promise.nodeify(cb) : promise;
};


Webtask.prototype.toJSON = function () {
    var data = {
        container: this.container,
        token: this.token,
        url: this.url,
    };
    
    if (this.claims.jtn) data.name = this.claims.jtn;
    
    return data;
};

/**
 * Update the storage associated to the a webtask
 * 
 * @param {Object} options - Options
 * @param {String} [options.container] - Set the webtask container. Defaults to the profile's container.
 * @param {String} options.name - The name of the webtask.
 * @param {Object} storage - storage
 * @param {Object} storage.data - The data to be stored
 * @param {String} storage.etag - Pass in an optional string to be used for optimistic concurrency control to prevent simultaneous updates of the same data.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @return {Promise} A Promise that will be fulfilled with an array of Webtasks
 */
Webtask.prototype.updateStorage = function (storage, options, cb) {
    var promise = this.sandbox.updateStorage(storage, options);

    return cb ? promise.nodeify(cb) : promise;
}

/**
 * Read the storage associated to the a webtask
 * 
 * @param {Object} options - Options
 * @param {String} [options.container] - Set the webtask container. Defaults to the profile's container.
 * @param {String} options.name - The name of the webtask.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @return {Promise} A Promise that will be fulfilled with an array of Webtasks
 */
Webtask.prototype.getStorage = function (options, cb) {
    var promise = this.sandbox.getStorage(options);

    return cb ? promise.nodeify(cb) : promise;
}

module.exports = Webtask;
