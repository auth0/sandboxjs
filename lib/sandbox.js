var Bluebird = require('bluebird');
var CronJob = require('./cronJob');
var Decode = require('jwt-decode');
var LogStream = require('webtask-log-stream');
var RandExp = require('randexp');
var Request = require('./issueRequest');
var Superagent = require('superagent');
var Webtask = require('./webtask');

var assign = require('lodash.assign');
var defaults = require('lodash.defaults');


/**
Sandbox node.js code.
@module sandboxjs
@typicalname Sandbox
*/
module.exports = Sandbox;
module.exports.PARSE_NEVER = 0;
module.exports.PARSE_ALWAYS = 1;
module.exports.PARSE_ON_ARITY = 2;



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
 * @param {String} [codeOrUrl] - The code for the webtask or a url starting with http:// or https://
 * @param {Object} [options] - Options for creating the webtask
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 */
Sandbox.prototype.create = function (codeOrUrl, options, cb) {
    if (typeof codeOrUrl !== 'string') {
        cb = options;
        options = codeOrUrl;
        codeOrUrl = options.code || options.code_url;
    }

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
    var token_options = defaults({}, options, { include_webtask_url: true });
    var promise = this.createToken(token_options)
        .then(function (result) {
            return token_options.include_webtask_url
                ? new Webtask(self, result.token, { meta: options.meta, webtask_url: result.webtask_url })
                : new Webtask(self, result, { meta: options.meta });
        });

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Create a Webtask from the given claims
 *
 * @param {Object} claims - Options for creating the webtask
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 */
Sandbox.prototype.createRaw = function (claims, cb) {
    var self = this;

    var promise = this.createTokenRaw(claims)
        .then(function (token) {
            return new Webtask(self, token, { meta: claims.meta });
        });

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Shortcut to create a Webtask and get its url from the given options
 *
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

        if (options.host)
            params.host = options.host;
        if (options.code_url)
            params.url = options.code_url;
        if (options.code)
            params.code = options.code;
        if (options.secrets && Object.keys(options.secrets).length > 0)
            params.ectx = options.secrets;
        if (options.secret && Object.keys(options.secret).length > 0)
            params.ectx = options.secret;
        if (options.params && Object.keys(options.params).length > 0)
            params.pctx = options.params;
        if (options.param && Object.keys(options.param).length > 0)
            params.pctx = options.param;
        if (options.meta && Object.keys(options.meta).length > 0)
            params.meta = options.meta;
        if (options.nbf !== undefined)
            params.nbf = options.nbf;
        if (options.exp !== undefined)
            params.exp = options.exp;
        if (options.merge || options.mergeBody)
            params.mb = 1;
        if ((options.parse || options.parseBody) !== undefined)
            // This can be a numeric value from the PARSE_* enumeration
            // or a boolean that will be normalized to 0 or 1.
            params.pb = +(options.parse || options.parseBody);
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

        return resolve(self.createTokenRaw(params, { include_webtask_url: options.include_webtask_url }));

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
 * Create a webtask token - A JWT (see: http://jwt.io) with the supplied claims
 *
 * @param {Object} claims - Claims to make for this token (see: https://webtask.io/docs/api_issue)
 * @param {Object} [options] - Optional options. Currently only options.include_webtask_url is supported.
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 */
Sandbox.prototype.createTokenRaw = function (claims, options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = undefined;
    }
    var request = Superagent
        .post(this.url + '/api/tokens/issue')
        .set('Authorization', 'Bearer ' + this.token)
        .send(claims);

    var promise = Request(request)
            .then(function (res) {
                return (options && options.include_webtask_url)
                    ? { token: res.text, webtask_url: res.header['location'] }
                    : res.text;
            });

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Create a stream of logs from the webtask container
 *
 * Note that the logs will include messages from our infrastructure.
 *
 * @param {Object} options - Streaming options overrides
 * @param {String} [options.container] - The container for which you would like to stream logs. Defaults to the current profile's container.
 * @returns {Stream} A stream that will emit 'data' events with container logs
 */
Sandbox.prototype.createLogStream = function (options) {
    if (!options) options = {};

    var url = this.url + '/api/logs/tenant/'
        + (options.container || this.container)
        + '?key=' + encodeURIComponent(this.token);

    return LogStream(url);
};

Sandbox.prototype._createCronJob = function (job) {
    return new CronJob(this, job);
};

/**
 * Read a named webtask
 *
 * @param {Object} options - Options
 * @param {String} [options.container] - Set the webtask container. Defaults to the profile's container.
 * @param {String} options.name - The name of the webtask.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @return {Promise} A Promise that will be fulfilled with an array of Webtasks
 */
Sandbox.prototype.getWebtask = function (options, cb) {
    if (!options) options = {};

    var promise;

    if (!options.name) {
        var err = new Error('Missing required option: `options.name`');
        err.statusCode = 400;

        promise = Bluebird.reject(err);
    } else {
        var url = this.url + '/api/webtask/'
            + (options.container || this.container) + '/' + options.name;
        var request = Superagent
            .get(url)
            .set('Authorization', 'Bearer ' + this.token)
            .accept('json');
        var self = this;

        promise = Request(request)
            .get('body')
            .then(function (data) {
                return new Webtask(self, data.token, { meta: data.meta, webtask_url: data.webtask_url });
            });
    }

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Remove a named webtask from the webtask container
 *
 * @param {Object} options - Options
 * @param {String} [options.container] - Set the webtask container. Defaults to the profile's container.
 * @param {String} options.name - The name of the cron job.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @return {Promise} A Promise that will be fulfilled with an array of Webtasks
 */
Sandbox.prototype.removeWebtask = function (options, cb) {
    if (!options) options = {};

    var promise;

    if (!options.name) {
        var err = new Error('Missing required option: `options.name`');
        err.statusCode = 400;

        promise = Bluebird.reject(err);
    } else {
        var url = this.url + '/api/webtask/'
            + (options.container || this.container) + '/' + options.name;
        var request = Superagent
            .del(url)
            .set('Authorization', 'Bearer ' + this.token);

        promise = Request(request)
            .return(true);
    }

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Update an existing webtask's code, secrets or other claims
 *
 * Note that this method should be used with caution as there is the potential
 * for a race condition where another agent updates the webtask between the time
 * that the webtask details and claims are resolved and when the webtask
 * update is issued.
 *
 * @param {Object} options - Options
 * @param {String} options.name - Name of the webtask to update
 * @param {String} [options.code] - Updated code for the webtask
 * @param {String} [options.url] - Updated code URL for the webtask
 * @param {String} [options.secrets] - If `false`, remove existing secrets, if an object update secrets, otherwise preserve
 * @param {String} [options.params] - If `false`, remove existing params, if an object update params, otherwise preserve
 * @param {String} [options.host] - If `false`, remove existing host, if a string update host, otherwise preserve
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @return {Promise} A Promise that will be fulfilled with an instance of Webtask representing the updated webtask
 */
Sandbox.prototype.updateWebtask = function (options, cb) {
    if (!options) options = {};

    var self = this;
    var err;
    var promise;

    if (typeof options.name !== 'string') {
        err = new Error('The `name` option is required and must be a string');
        err.statusCode = 400;

        promise = Bluebird.reject(err);
    }

    if (options.code && typeof options.code !== 'string') {
        err = new Error('The `code` option must be a string');
        err.statusCode = 400;

        promise = Bluebird.reject(err);
    }

    if (options.url && typeof options.url !== 'string') {
        err = new Error('The `url` option must be a string');
        err.statusCode = 400;

        promise = Bluebird.reject(err);
    }

    if (options.code && options.url) {
        err = new Error('Either the `code` or `url` option can be specified, but not both');
        err.statusCode = 400;

        promise = Bluebird.reject(err);
    }

    if (!err) {
        promise = this.getWebtask({ name: options.name })
            .then(onWebtask);

    }

    return cb ? promise.nodeify(cb) : promise;


    function onWebtask(webtask) {
        return webtask.inspect({ decrypt: options.secrets !== false, fetch_code: options.code !== false, meta: options.meta !== false })
            .then(onInspection);


        function onInspection(claims) {
            var newClaims = {
                ten: claims.ten,
                jtn: claims.jtn,
            };

            ['nbf', 'exp', 'dd', 'dr', 'ls', 'lm', 'lh', 'ld', 'lw', 'lo', 'lts', 'ltm', 'lth', 'ltd', 'ltw', 'lto']
                .forEach(function (claim) {
                    if (claims[claim]) {
                        newClaims[claim] = claims[claim];
                    }
                });

            if (options.host !== false && (options.host || claims.host)) {
                newClaims.host = options.host || claims.host;
            }
            if (typeof options.parseBody !== 'undefined' || typeof options.parse !== 'undefined' || claims.pb) {
                newClaims.pb = +(options.parseBody || options.parse || claims.pb);
            }
            if (typeof options.mergeBody !== 'undefined' || typeof options.merge !== 'undefined' || claims.mb) {
                newClaims.mb = +(options.mergeBody || options.merge || claims.mb);
            }
            if (options.secrets !== false && (options.secrets || claims.ectx)) {
                newClaims.ectx = options.secrets || claims.ectx;
            }
            if (options.params !== false && (options.params || claims.pctx)) {
                newClaims.pctx = options.params || claims.pctx;
            }
            if (options.meta !== false && (options.meta || claims.meta)) {
                newClaims.meta = options.meta || claims.meta;
            }
            if (options.url) {
                newClaims.url = options.url;
            }
            if (options.code) {
                newClaims.code = options.code;
            }

            return self.createRaw(newClaims, { include_webtask_url: options.include_webtask_url });
        }
    }
};

/**
 * List named webtasks from the webtask container
 *
 * @param {Object} options - Options
 * @param {String} [options.container] - Set the webtask container. Defaults to the profile's container.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @return {Promise} A Promise that will be fulfilled with an array of Webtasks
 */
Sandbox.prototype.listWebtasks = function (options, cb) {
    if (!options) options = {};

    var url = this.url + '/api/webtask/'
        + (options.container || this.container);
    var request = Superagent
        .get(url)
        .set('Authorization', 'Bearer ' + this.token)
        .accept('json');

    if (options.offset) request.query({ offset: options.offset });
    if (options.limit) request.query({ limit: options.limit });
    if (options.meta) {
        for (var m in options.meta) {
            request.query({ meta: m + ':' + options.meta[m] });
        }
    }

    var self = this;
    var promise = Request(request)
        .get('body')
        .map(function (webtask) {
            return new Webtask(self, webtask.token, { meta: webtask.meta, webtask_url: webtask.webtask_url });
        });

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Create a cron job from an already-existing webtask token
 *
 * @param {Object} options - Options for creating a cron job
 * @param {String} [options.container] - The container in which the job will run. Defaults to the current profile's container.
 * @param {String} options.name - The name of the cron job.
 * @param {String} options.token - The webtask token that will be used to run the job.
 * @param {String} options.schedule - The cron schedule that will be used to determine when the job will be run.
 * @param {String} options.meta - The cron metadata (set of string key value pairs).
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with a {@see CronJob} instance.
 */
Sandbox.prototype.createCronJob = function (options, cb) {
    options = defaults(options, { container: this.container });

    var payload = {
        token: options.token,
        schedule: options.schedule,
    };

    if (options.state) {
        payload.state = options.state;
    }
    if (options.meta) {
        payload.meta = options.meta;
    }

    var request = Superagent
        .put(this.url + '/api/cron/' + options.container + '/' + options.name)
        .set('Authorization', 'Bearer ' + this.token)
        .send(payload)
        .accept('json');

    var promise = Request(request)
            .get('body')
            .then(this._createCronJob.bind(this));

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Remove an existing cron job
 *
 * @param {Object} options - Options for removing the cron job
 * @param {String} [options.container] - The container in which the job will run. Defaults to the current profile's container.
 * @param {String} options.name - The name of the cron job.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with the response from removing the job.
 */
Sandbox.prototype.removeCronJob = function (options, cb) {
    options = defaults(options, { container: this.container });

    var request = Superagent
        .del(this.url + '/api/cron/' + options.container + '/' + options.name)
        .set('Authorization', 'Bearer ' + this.token)
        .accept('json');

    var promise = Request(request)
            .get('body');

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Set an existing cron job's state
 *
 * @param {Object} options - Options for updating the cron job's state
 * @param {String} [options.container] - The container in which the job will run. Defaults to the current profile's container.
 * @param {String} options.name - The name of the cron job.
 * @param {String} options.state - The new state of the cron job.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with the response from removing the job.
 */
Sandbox.prototype.setCronJobState = function (options, cb) {
    options = defaults(options, { container: this.container });

    var request = Superagent
        .put(this.url + '/api/cron/' + options.container + '/' + options.name + '/state')
        .set('Authorization', 'Bearer ' + this.token)
        .send({
            state: options.state,
        })
        .accept('json');

    var promise = Request(request)
            .get('body');

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * List cron jobs associated with this profile
 *
 * @param {Object} [options] - Options for listing cron jobs.
 * @param {String} [options.container] - The container in which the job will run. Defaults to the current profile's container.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with an Array of {@see CronJob} instances.
 */
Sandbox.prototype.listCronJobs = function (options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = null;
    }

    if (!options) options = {};

    options = defaults(options, { container: this.container });

    var request = Superagent
        .get(this.url + '/api/cron/' + options.container)
        .set('Authorization', 'Bearer ' + this.token)
        .accept('json');

    if (options.offset) request.query({ offset: options.offset });
    if (options.limit) request.query({ limit: options.limit });
    if (options.meta) {
        for (var m in options.meta) {
            request.query({ meta: m + ':' + options.meta[m] });
        }
    }

    var promise = Request(request)
        .get('body')
        .map(this._createCronJob.bind(this));

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Get a CronJob instance associated with an existing cron job
 *
 * @param {Object} options - Options for retrieving the cron job.
 * @param {String} [options.container] - The container in which the job will run. Defaults to the current profile's container.
 * @param {String} options.name - The name of the cron job.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with a {@see CronJob} instance.
 */
Sandbox.prototype.getCronJob = function (options, cb) {
    options = defaults(options, { container: this.container });

    var request = Superagent
        .get(this.url + '/api/cron/' + options.container + '/' + options.name)
        .set('Authorization', 'Bearer ' + this.token)
        .accept('json');

    var promise = Request(request)
            .get('body')
            .then(this._createCronJob.bind(this));

    return cb ? promise.nodeify(cb) : promise;
};


/**
 * Get the historical results of executions of an existing cron job.
 *
 * @param {Object} options - Options for retrieving the cron job.
 * @param {String} [options.container] - The container in which the job will run. Defaults to the current profile's container.
 * @param {String} options.name - The name of the cron job.
 * @param {String} [options.offset] - The offset to use when paging through results.
 * @param {String} [options.limit] - The limit to use when paging through results.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with an Array of cron job results.
 */
Sandbox.prototype.getCronJobHistory = function (options, cb) {
    options = defaults(options, { container: this.container });

    var request = Superagent
        .get(this.url + '/api/cron/' + options.container + '/' + options.name + '/history')
        .set('Authorization', 'Bearer ' + this.token)
        .accept('json');

    if (options.offset) request.query({offset: options.offset});
    if (options.limit) request.query({limit: options.limit});

    var promise = Request(request)
        .get('body')
        .map(function (result) {
            var auth0HeaderRx = /^x-auth0/;

            result.scheduled_at = new Date(result.scheduled_at);
            result.started_at = new Date(result.started_at);
            result.completed_at = new Date(result.completed_at);

            for (var header in result.headers) {
                if (auth0HeaderRx.test(header)) {
                    try {
                        result.headers[header] = JSON.parse(result.headers[header]);
                    } catch (__) {}
                }
            }

            return result;
        });

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Inspect an existing webtask token to resolve code and/or secrets
 *
 * @param {Object} options - Options for inspecting the webtask.
 * @param {Boolean} options.token - The token that you would like to inspect.
 * @param {Boolean} [options.decrypt] - Decrypt the webtask's secrets.
 * @param {Boolean} [options.fetch_code] - Fetch the code associated with the webtask.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with the resolved webtask data.
 */
Sandbox.prototype.inspectToken = function (options, cb) {
    options = defaults(options, { container: this.container });

    var request = Superagent
        .get(this.url + '/api/tokens/inspect')
        .query({ token: options.token })
        .set('Authorization', 'Bearer ' + this.token)
        .accept('json');

    if (options.decrypt) request.query({ decrypt: options.decrypt });
    if (options.fetch_code) request.query({ fetch_code: options.fetch_code });
    if (options.meta) request.query({ meta: options.meta });

    var promise = Request(request)
        .get('body');

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Inspect an existing named webtask to resolve code and/or secrets
 *
 * @param {Object} options - Options for inspecting the webtask.
 * @param {Boolean} options.name - The named webtask that you would like to inspect.
 * @param {Boolean} [options.decrypt] - Decrypt the webtask's secrets.
 * @param {Boolean} [options.fetch_code] - Fetch the code associated with the webtask.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with the resolved webtask data.
 */
Sandbox.prototype.inspectWebtask = function (options, cb) {
    options = defaults(options, { container: this.container });

    var promise = this.getWebtask({ name: options.name })
        .call('inspect', { decrypt: options.decrypt, fetch_code: options.fetch_code, meta: options.meta });

    return cb ? promise.nodeify(cb) : promise;
};


/**
 * Revoke a webtask token
 *
 * @param {String} token - The token that should be revoked
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 * @see https://webtask.io/docs/api_revoke
 */
Sandbox.prototype.revokeToken = function (token, cb) {
    var request = Superagent
        .post(this.url + '/api/tokens/revoke')
        .set('Authorization', 'Bearer ' + this.token)
        .query({ token: token });

    var promise = Request(request);

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * List versions of a given node module that are available on the platform
 *
 * @param {Object} options - Options
 * @param {String} options.name - Name of the node module
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 */
Sandbox.prototype.listNodeModuleVersions = function (options, cb) {
    var request = Superagent
        .get(this.url + `/api/env/node/modules/${encodeURIComponent(options.name)}`);

    var promise = Request(request)
        .get('body');

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Ensure that a set of modules are available on the platform
 *
 * @param {Object} options - Options
 * @param {Array} options.modules - Array of { name, version } pairs
 * @param {Boolean} options.reset - Trigger a rebuild of the modules (Requires administrative token)
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with an array of { name, version, state } objects
*/
Sandbox.prototype.ensureNodeModules = function (options, cb) {
    var request = Superagent
        .post(this.url + '/api/env/node/modules')
        .send({ modules: options.modules })
        .set('Authorization', 'Bearer ' + this.token);

    if (options.reset) {
        request.query({ reset: 1 });
    }

    var promise = Request(request)
        .get('body');

    return cb ? promise.nodeify(cb) : promise;
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
Sandbox.prototype.updateStorage = function (storage, options, cb) {
    var promise;

    if (!options || !options.name) {
        var err = new Error('Missing required option: `options.name`');
        err.statusCode = 400;

        promise = Bluebird.reject(err);
    }
    else {
        var obj = {
            data: JSON.stringify(storage.data)
        }

        if (storage.etag) {
            obj.etag = storage.etag.toString();
        }

        var request = Superagent
            .put(this.url + '/api/webtask/' + (options.container || this.container) + '/' + options.name + '/data')
            .send(obj)
            .set('Authorization', 'Bearer ' + this.token)
            .accept('json');

        promise = Request(request)
            .get('body');
    }

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Read the storage associated to the a webtask
 *
 * @param {Object} options - Options
 * @param {String} [options.container] - Set the webtask container. Defaults to the profile's container.
 * @param {String} options.name - The name of the webtask.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @return {Promise} A Promise that will be fulfilled with an array of Webtasks
 */
Sandbox.prototype.getStorage = function (options, cb) {
    var promise;

    if (!options || !options.name) {
        var err = new Error('Missing required option: `options.name`');
        err.statusCode = 400;

        promise = Bluebird.reject(err);
    }
    else {
        var request = Superagent
            .get(this.url + '/api/webtask/' + (options.container || this.container) + '/' + options.name + '/data')
            .set('Authorization', 'Bearer ' + this.token)
            .accept('json');

        promise = Request(request)
            .get('body')
            .then(function (result) {
                var storage = result;

                try {
                    storage.data = JSON.parse(result.data);
                } catch(e) {
                    // TODO: Log somewhere
                }

                return storage;
            });
    }

    return cb ? promise.nodeify(cb) : promise;
}

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

/**
 * Create a Sandbox instance from a webtask token
 *
 * @param {String} token - The webtask token from which the Sandbox profile will be derived.
 * @param {Object} options - The options for creating the Sandbox instance that override the derived values from the token.
 * @param {String} [options.url] - The url of the webtask cluster. Defaults to the public 'webtask.it.auth0.com' cluster.
 * @param {String} options.container - The container with which this Sandbox instance should be associated. Note that your Webtask token must give you access to that container or all operations will fail.
 * @param {String} options.token - The Webtask Token. See: https://webtask.io/docs/api_issue.
 * @returns {Sandbox} A {@see Sandbox} instance whose url, token and container were derived from the given webtask token.
 *
 * @alias module:sandboxjs.fromToken
 */
Sandbox.fromToken = function (token, options) {
    var config = defaults({}, options, Sandbox.optionsFromJwt(token));

    return Sandbox.init(config);
};

/**
 * Create a Sandbox instance
 *
 * @param {Object} options - The options for creating the Sandbox instance.
 * @param {String} [options.url] - The url of the webtask cluster. Defaults to the public 'webtask.it.auth0.com' cluster.
 * @param {String} options.container - The container with which this Sandbox instance should be associated. Note that your Webtask token must give you access to that container or all operations will fail.
 * @param {String} options.token - The Webtask Token. See: https://webtask.io/docs/api_issue.
 * @returns {Sandbox} A {@see Sandbox} instance.
 *
 * @alias module:sandboxjs.init
 */
Sandbox.init = function (options) {
    if (typeof options !== 'object') throw new Error('Expecting an options Object, got `' + typeof options + '`.');
    if (!options.container) throw new Error('A Sandbox instance cannot be created without a container.');
    if (typeof options.container !== 'string') throw new Error('Only String containers are supported, got `' + typeof options.container + '`.');
    if (!options.token) throw new Error('A Sandbox instance cannot be created without a token.');

    defaults(options, {
        url: 'https://webtask.it.auth0.com',
    });

    return new Sandbox(options);
};

Sandbox.optionsFromJwt = function (jwt) {
    var claims = Decode(jwt);

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
