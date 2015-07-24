var Boom = require('boom');
var Bluebird = require('bluebird');
var Fs = require('fs');
var Jwt = require('jsonwebtoken');
var Path = require('path');
var RandExp = require('randexp');
var Through = require('through2');
var Url = require('url');
var Wreck = require('wreck');
var _ = require('lodash');




/**
 * Creates an object representing a user's webtask.io credentials
 * 
 * @constructor
 * @param {Object} options - Options used to configure the profile
 * @param {String} options.url - The url of the webtask cluster where code will run
 * @param {String} options.container - The name of the container in which code will run
 * @param {String} options.token - The JWT (see: http://jwt.io) issued by webtask.io that grants rights to run code in the indicated container
 */
function Sandbox (options) {
    this.url = options.url;
    this.container = options.container;
    this.token = options.token;
    
    Object.defineProperty(this, '_wreck', {
        value: Wreck.defaults({
            baseUrl: this.url,
            headers: {
                'Authorization': 'Bearer ' + this.token,
            },
            json: true,
        })
    });
}

/**
 * Create a Webtask from the given options
 */
Sandbox.prototype.create = function (fileOrCodeOrUrl, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    
    if (!options) options = {};
    
    var fol = fileOrCodeOrUrl.toLowerCase();
    
    if (fol.indexOf('http://') === 0 || fol.indexOf('https://') === 0) {
        options.code_url = fileOrCodeOrUrl;
    } else if (fol.indexOf('.') === 0 || fol.indexOf('/') === 0) {
        var path = Path.resolve(process.cwd(), fileOrCodeOrUrl);

        try {
            options.code = Fs.readFileSync(path, 'utf8');
        } catch (e) {
            throw new Error('Unable to read the file `'
                + path + '`.');
        }
    } else {
        options.code = fileOrCodeOrUrl;
    }
    
    var self = this;
    var promise = this.createToken(options)
        .then(function (token) {
            return new Webtask(self, token);
        });
    
    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Shortcut to create a Webtask and get its url from the given options
 */
Sandbox.prototype.createUrl = function (options, cb) {
    var promise = this.create(options)
        .get('url');
    
    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Shortcut to create and run a Webtask from the given options
 */
Sandbox.prototype.run = function (fileOrCodeOrUrl, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    
    if (!options) options = {};
    
    var promise = this.create(fileOrCodeOrUrl, options)
        .call('run', options);
    
    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Create a webtask token - A JWT (see: http://jwt.io) with the supplied options
 * 
 * @method createToken
 * @param {Object} options - Claims to make for this token (see: https://webtask.io/docs/api_issue)
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 */
Sandbox.prototype.createToken = function (options, cb) {
    if (!options) options = {};
    
    var self = this;
    var promise = new Bluebird(function (resolve, reject) {
        
        var params = {
            ten: options.container || self.container,
            dd: options.issuanceDepth || 0,
        };
    
        if (options.exp !== undefined && options.nbf !== undefined
            && options.exp <= options.nbf) {
            return reject('The `nbf` parameter cannot be set to a later time than `exp`.');
        }
    
        if (options.code_url)
            params.url = options.code_url;
        if (options.code) 
            params.code = options.code;
        if (options.secret && Object.keys(options.secret).length > 0)
            params.ectx = options.secret;
        if (options.param && Object.keys(options.param).length > 0)
            params.pctx = options.param;
        if (options.nbf !== undefined)
            params.nbf = options.nbf;
        if (options.exp !== undefined)
            params.exp = options.exp;
        if (options.merge)
            params.mb = 1;
        if (options.parse)
            params.pb = 1;
        if (!options.selfRevoke)
            params.dr = 1;
        if (options.name)
            params.jtn = options.name;
        
        try {
            if (options.tokenLimit)
                addLimits(options.tokenLimit, Sandbox.limits.token);
            if (options.containerLimit)
                addLimits(options.containerLimit, Sandbox.limits.container);
        } catch (err) {
            return reject(err);
        }
        
        var promise = request(self._wreck, 'post', '/api/tokens/issue', {}, params)
            .spread(function (res, token) {
                return token.toString('utf8');
            });
        
        return cb
            ? resolve(promise.nodeify(cb))
            : resolve(promise);
    
        function addLimits(limits, spec) {
            for (var l in limits) {
                var limit = parseInt(limits[l], 10);
                
                if (!spec[l]) {
                    throw new Error('Unsupported limit type `' + l
                        + '`. Supported limits are: '
                        + Object.keys(spec).join(', ') + '.');
                }
                
                if (isNaN(limits[l]) || Math.floor(+limits[l]) !== limit
                    || limit < 1) {
                        throw new Error('Unsupported limit value for `' + l
                            + '` limit. All limits must be positive integers.');
                }
                
                params[spec[l]] = limit;
            }
        }
    });
    
    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Create a stream of logs from the webtask container
 * 
 * Note that the logs will include 
 * 
 * @method createLogStream
 * @param {Object} options - Claims to make for this token (see: https://webtask.io/docs/api_issue)
 * @param {String} [options.container] - The container for which you would like to stream logs. Defaults to the current profile's container.
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 */
Sandbox.prototype.createLogStream = function (options, cb) {
    var self = this;
    
    var promise = new Bluebird(function (resolve, reject) {
        var url = '/api/logs/tenant/' + (options.container || self.container);
        var reqOptions = { 
            headers: { 'accept': 'text/event-stream' },
        };
        
        self._wreck.request('get', url, reqOptions, function (err, res) {
            if (err) return reject(err.isBoom ? err : Boom.wrap(err, 502,
                'Error communicating with webtask cluster: ' + err.message));
            
            if (res.statusCode >= 400) {
                // Error response from webtask cluster
                return reject(Boom.create(res.statusCode,
                    'Error returned by webtask cluster: ' + res.statusCode));
            } else if (res.statusCode >= 300) {
                // Unresolved redirect from webtask cluster
                return reject(Boom.create(502,
                    'Unexpected response-type from webtask cluster: '
                    + err.message));
            }
            
            var lastId = '';
            var eventName = '';
            var eventData = '';
            
            // Straight mapping right now.
            var logMapper = Through.obj(function (chunk, enc, callback) {
                // For parsing this, see: http://www.w3.org/TR/2009/WD-eventsource-20091029/#event-stream-interpretation
                var data = chunk.toString('utf8');
                var events = data.split(/\n\n/);
                
                _.forEach(events, function (event) {
                    if (!event) {
                        this.push({
                            id: lastId,
                            type: eventName || 'data',
                            data: eventData.slice(0, -1), // Strip trailing \n
                        });
                        
                        eventName = '';
                        eventData = '';
                        
                        return;
                    }
                        
                    var lines = event.split('\n').filter(Boolean);
                    
                    _.forEach(lines, function (line) {
                        // This marks the end of an event
                        var matches = line.match(/^([^:]*):(.*)$/);
                        
                        if (matches) {
                            var field = matches[1];
                            var value = matches[2];
                            
                            if (!field) return; // event-source comment
                            if (field === 'event') eventName = value;
                            else if (field === 'data') eventData += value + '\n';
                            else if (field === 'id') lastId = value;
                        }
                    }, this);
                }, this);
                
                callback();
            });
            
            var logStream = res
                .pipe(logMapper);
            
            resolve(logStream);
        });
    });
    
    return cb ? promise.nodify(cb) : promise;
};

Sandbox.prototype.createCronJob = function (options, cb) {
    var url = '/api/cron/' + options.container + '/' + options.name;
    var promise = request(this._wreck, 'put', url, {}, {
        token: options.token,
        schedule: options.schedule,
    })
        .get(1); // Return the job
    
    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.prototype.removeCronJob = function (options, cb) {
    var url = '/api/cron/' + options.container + '/' + options.name;
    var promise = request(this._wreck, 'delete', url)
        .get(1); // Return the job
    
    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.prototype.listCronJobs = function (options, cb) {
    var url = '/api/cron/' + options.container;
    var promise = request(this._wreck, 'get', url)
        .get(1); // Return the job array
    
    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.prototype.getCronJob = function (options, cb) {
    var url = '/api/cron/' + options.container + '/' + options.name;
    var promise = request(this._wreck, 'get', url)
        .get(1); // Return the job
    
    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.prototype.getCronJobHistory = function (options, cb) {
    var url = '/api/cron/' + options.container + '/' + options.name + '/history';
    var query = {};
    
    if (options.offset) query.offset = options.offset;
    if (options.limit) query.limit = options.limit;
    
    var promise = request(this._wreck, 'get', url, query)
        .get(1); // Return the job history
    
    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.limits = {
    container: {
        second: 'ls',
        minute: 'lm',
        hour: 'lh',
        day: 'ld',
        week: 'lw',
        month: 'lo'
    },
    token: {
        second: 'lts',
        minute: 'ltm',
        hour: 'lth',
        day: 'ltd',
        week: 'ltw',
        month: 'lto',
    },
};

Sandbox.fromProfile = function (profile, options) {
    if (!profile) profile = 'default';
    if (!options) options = {};

    Sandbox.applyProfileToOptions(profile, options);
    
    return Sandbox.init(options);
};

Sandbox.fromToken = function (token) {
    var options = Sandbox.optionsFromJwt(token);
    
    return Sandbox.init(options);
};

Sandbox.init = function (options) {
    if (typeof options !== 'object') throw new Error('Expecting an options Object, got `' + typeof options + '`.');
    if (!options.container) throw new Error('A Sandbox instance cannot be created without a container.');
    if (typeof options.container !== 'string') throw new Error('Only String containers are supported, got `' + typeof options.container + '`.');
    if (!options.token) throw new Error('A Sandbox instance cannot be created without a token.');
    
    _.defaults(options, {
        url: 'https://webtask.it.auth0.com',
    });
    
    return new Sandbox(options);
};

Sandbox.create = function (fileOrCodeOrUrl, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    
    if (!options) options = {};
    
    var promise = Bluebird.try(Sandbox.fromProfile)
        .call('create', fileOrCodeOrUrl, options);
    
    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.createUrl = function (fileOrCodeOrUrl, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    
    if (!options) options = {};
    
    var promise = Bluebird.try(Sandbox.fromProfile)
        .call('create', fileOrCodeOrUrl, options)
        .get('url');
    
    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.run = function (fileOrCodeOrUrl, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    
    if (!options) options = {};
    
    var promise = Bluebird.try(Sandbox.fromProfile)
        .call('create', fileOrCodeOrUrl, options)
        .call('run', options);
    
    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.applyProfileToOptions = function (profile, options) {
    if (!options.configPath) {
        var homePath = process.env[(process.platform == 'win32')
                ? 'USERPROFILE'
                : 'HOME'
            ];
        options.configPath = Path.join(homePath, '.webtask');
    }
    
    var defaults = {};

    try {
        var config = Fs.readFileSync(options.configPath, 'utf8');
        var profiles = JSON.parse(config);
        
        defaults = profiles[profile];
    } catch (__) {
        throw new Error('Unable to load the profile `' + profile + '` from '
            + 'the config file `' + options.configPath + '`.');
    }
    
    return _.defaults(options, defaults);
};

Sandbox.optionsFromJwt = function (jwt) {
    var claims = Jwt.decode(jwt);
    
    if (!claims) throw new Error('Unable to decode token `' + jwt + '` (https://jwt.io/#id_token=' + jwt + ').');
    
    // What does the
    var ten = claims.ten;
    
    if (!ten) throw new Error('Invalid token, missing `ten` claim `' + jwt + '` (https://jwt.io/#id_token=' + jwt + ').');
    
    if (Array.isArray(ten)) {
        ten = ten[0];
    } else {
        // Check if the `ten` claim is a RegExp
        var matches = ten.match(/\/(.+)\//);
        if (matches) {
            try {
                var regex = new RegExp(matches[1]);
                var gen = new RandExp(regex);
                
                // Monkey-patch RandExp to be deterministic
                gen.randInt = function (l, h) { return l; };
                
                
                ten = gen.gen();
            } catch (err) {
                throw new Error('Unable to derive containtainer name from `ten` claim `' + claims.ten + '`: ' + err.message + '.');
            }
        }
    }
    
    if (typeof ten !== 'string' || !ten) throw new Error('Expecting `ten` claim to be a non-blank string, got `' + typeof ten + '`, with value `' + ten + '`.');
    
    return {
        container: ten,
        token: jwt,
    };
};


/**
 * Creates an object representing a Webtask
 * 
 * @constructor
 */
function Webtask (sandbox, token) {
    this.sandbox = sandbox;
    this.token = token;
    
    /**
     * @property container - The public url that can be used to invoke this webtask
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
            var claims = Jwt.decode(this.token);
            
            if (claims.jtn) url += '/' + claims.jtn;
            
            return url;
        }
    });
    
    Object.defineProperty(this, '_wreck', {
        value: Wreck.defaults({
            baseUrl: this.url,
            headers: {
                'Authorization': 'Bearer ' + this.token,
            },
            json: true,
        })
    });
}

/**
 * Run the webtask and return the result of execution
 * 
 * @param {Object} options - Options used to tweak how the webtask will be invoked
 * @param {Function} [cb] - Optional node-style callback that will be invoked upon completion
 * @returns {Promise}
 */
Webtask.prototype.run = function (options, cb) {
    var config = _.defaultsDeep(options, {
        method: 'get',
        path: '/',
        query: {},
    });
    var promise = request(this._wreck, config.method, config.path, config.query, config.payload);
    
    return cb ? promise.nodeify(cb) : promise;
};


function request (wreck, method, path, query, payload, options) {
    if (!options) options = {};
    
    _.defaultsDeep(options, {
        headers: {},
    });
    
    var url = Url.parse(path, true);
    _.extend(url.query, query);
    delete url.search;
    path = Url.format(url);
    
    if (payload) {
        options.payload = payload;
        
        // Not supporting streams for now
        if (!_.isString(payload) && !Buffer.isBuffer(payload)) {
            options.payload = JSON.stringify(payload);
            options.headers['content-type'] = 'application/json';
        }
    }
    
    if (!wreck) throw new Boom.badImplementation('Missing wreck instance.');
    if (!wreck[method])
        throw new Boom.badImplementation('Invalid request method: ' + method);
    
    return new Bluebird(function (resolve, reject) {
        wreck[method](path, options, function (err, res, body) {
            if (err) return reject(err.isBoom ? err : Boom.wrap(err, 502,
                'Error communicating with webtask cluster: ' + err.message));
            
            if (res.statusCode >= 400) {
                // Error response from webtask cluster
                return reject(Boom.create(res.statusCode,
                    'Error returned by webtask cluster: ' + JSON.stringify(body, null, 2)),
                    Buffer.isBuffer(body) ? body.toString() : body);
            } else if (res.statusCode >= 300) {
                // Unresolved redirect from webtask cluster
                return reject(Boom.create(502,
                    'Unexpected response-type from webtask cluster: '
                    + err.message));
            }

            resolve([res, body]);
        });
    });
}


module.exports = Sandbox;