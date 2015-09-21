var Bluebird = require('bluebird');
var Jwt = require('jsonwebtoken');
var RandExp = require('randexp');
var Superagent = require('superagent');
var SuperagentDefaults = require('superagent-defaults');
var SuperagentPrefix = require('superagent-prefix');
var Through = require('through2');
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
}

/**
 * Create a Webtask from the given options
 *
 * @method create
 * @param {String} [codeOrUrl] - The code for the webtask or a url starting with http:// or https://
 * @param {Object} [options] - Options for creating the webtask
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 */
Sandbox.prototype.create = function (codeOrUrl, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }

    if (!options) options = {};

    var fol = codeOrUrl.toLowerCase();

    if (fol.indexOf('http://') === 0 || fol.indexOf('https://') === 0) {
        options.code_url = codeOrUrl;
    } else {
        options.code = codeOrUrl;
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
 *
 * @method createUrl
 * @param {Object} options - Options for creating the webtask
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 */
Sandbox.prototype.createUrl = function (options, cb) {
    var promise = this.create(options)
        .get('url');

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Shortcut to create and run a Webtask from the given options
 *
 * @method run
 * @param {String} [codeOrUrl] - The code for the webtask or a url starting with http:// or https://
 * @param {Object} [options] - Options for creating the webtask
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 */
Sandbox.prototype.run = function (codeOrUrl, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }

    if (!options) options = {};

    var promise = this.create(codeOrUrl, options)
        .call('run', options);

    return cb ? promise.nodeify(cb, {spread: true}) : promise;
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

        var request = Superagent
            .post(self.url + '/api/tokens/issue')
            .set('Authorization', 'Bearer ' + self.token)
            .send(params);

        return resolve(issueRequest(request)
                .get('text'));

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
        var request = Superagent
            .get(self.url + '/api/logs/tenant/' + (options.container || self.container))
            .set('Authorization', 'Bearer ' + self.token)
            .accept('text/event-stream');

        request.once('error', function (err) {
            if (err.response) return reject(createResponseError(err.response));
            else return reject(new Error('Error streaming logs: ' + err.message));
        });

        var lastId = '';
        var eventName = '';
        var eventData = '';
        var eventBuffer = '';

        // Accumulate data until the end of a block (two newlines)
        var logMapper = Through(function (chunk, enc, callback) {
            var data = chunk.toString('utf8');
            var events = data.split('\n\n');

            _.forEach(events, function (event) {
                if (!event) {
                    this.push(eventBuffer);
                    eventBuffer = '';
                } else {
                    eventBuffer += event;
                }
            }, this);

            callback();
        });

        // Parse blocks and emit json objects
        var logParser = Through.obj(function (chunk, enc, callback) {
            // For parsing this, see: http://www.w3.org/TR/2009/WD-eventsource-20091029/#event-stream-interpretation
            var event = chunk.toString('utf8');
            var lines = event.split('\n');

            _.forEach(lines, function (line) {
                var matches = line.match(/^([^:]*):(.*)$/);

                if (matches) {
                    var field = matches[1];
                    var value = matches[2];

                    if (!field) return; // event-source comment
                    if (field === 'event') eventName = value;
                    else if (field === 'data') eventData += value;
                    else if (field === 'id') lastId = value;
                } else {
                    // console.log('unexpected data', line);
                }
            }, this);

            var eventObj = {
                id: lastId,
                type: eventName || 'data',
                data: eventData,
            };

            lastId = '';
            eventName = '';
            eventData = '';

            this.push(eventObj);

            callback();
        });

        var logStream = request
            .pipe(logMapper)
            .pipe(logParser);

        resolve(logStream);
    });

    return cb ? promise.nodify(cb) : promise;
};

Sandbox.prototype.createCronJob = function (options, cb) {
    var request = Superagent
        .put(this.url + '/api/cron/' + options.container + '/' + options.name)
        .set('Authorization', 'Bearer ' + this.token)
        .send({
            token: options.token,
            schedule: options.schedule,
        })
        .accept('json');

    var promise = issueRequest(request)
            .get('body');

    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.prototype.removeCronJob = function (options, cb) {
    var request = Superagent
        .del(this.url + '/api/cron/' + options.container + '/' + options.name)
        .set('Authorization', 'Bearer ' + this.token)
        .accept('json');

    var promise = issueRequest(request)
            .get('body');

    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.prototype.listCronJobs = function (options, cb) {
    var request = Superagent
        .get(this.url + '/api/cron/' + options.container)
        .set('Authorization', 'Bearer ' + this.token)
        .accept('json');

    var promise = issueRequest(request)
            .get('body');

    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.prototype.getCronJob = function (options, cb) {
    var request = Superagent
        .get(this.url + '/api/cron/' + options.container + '/' + options.name)
        .set('Authorization', 'Bearer ' + this.token)
        .accept('json');

    var promise = issueRequest(request)
            .get('body');

    return cb ? promise.nodeify(cb) : promise;
};

Sandbox.prototype.getCronJobHistory = function (options, cb) {
    var request = Superagent
        .get(this.url + '/api/cron/' + options.container + '/' + options.name + '/history')
        .set('Authorization', 'Bearer ' + this.token)
        .accept('json');

    if (options.offset) request.query({offset: options.offset});
    if (options.limit) request.query({limit: options.limit});

    var promise = issueRequest(request)
        .get('body');

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
    var claims = Jwt.decode(token);

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

            if (claims.jtn) url += '/' + claims.jtn;

            return url;
        }
    });

    this.authenticate = function (request) {
        return claims.jtn
            ? request
            : request.set('Authorization', 'Bearer ' + this.token);
    };
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

    var request = Superagent
        [config.method](this.url + config.path)
        .query(config.query);

    if (config.payload) request = request.send(config.payload);

    var promise = issueRequest(this.authenticate(request));

    return cb ? promise.nodeify(cb, {spread: true}) : promise;
};


function issueRequest (request) {
    return Bluebird.resolve(request)
        .catch(function (err) {
            throw new Error('Error communicating with the webtask cluster: '
                + err.message);
        })
        .then(function (res) {
            if (res.error) throw createResponseError(res);

            // Api compatibility
            res.statusCode = res.status;

            return res;
        });
}

function createResponseError (res) {
    if (res.clientError) return new Error('Unexpected response-type from '
        + 'webtask cluster: ' + res.body && res.body.message
            ? res.body.message
            : res.text);
    if (res.serverError) return new Error('Error returned by webtask '
        + 'cluster: ' + res.body && res.body.message
            ? res.body.message
            : res.text);
}

module.exports = Sandbox;