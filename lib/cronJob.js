var Decode = require('jwt-decode');
var Request = require('./issueRequest');
var Superagent = require('superagent');

var assign = require('lodash.assign');
var defaultsDeep = require('lodash.defaultsdeep');


module.exports = CronJob;


/**
 * Creates an object representing a CronJob
 *
 * @constructor
 */
function CronJob (sandbox, job) {
    /**
     * @property name - The name of the cron job
     * @property schedule - The cron schedule of the job
     * @property next_scheduled_at - The next time this job is scheduled
     */
    assign(this, job);
    
    /**
     * @property claims - The claims embedded in the Webtask's token
     */
    this.claims = Decode(job.token);
    
    /**
     * @property sandbox - The {@see Sandbox} instance used to create this Webtask instance
     */
    this.sandbox = sandbox;

    /**
     * @property url - The public url that can be used to invoke webtask that the cron job runs
     */
    Object.defineProperty(this, 'url', {
        enumerable: true,
        get: function () {
            return this.sandbox.url + '/api/run/' + this.container + '/' + this.name;
        }
    });
}

/**
 * Refresh this job's metadata
 * 
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the this cron job instance
 */
CronJob.prototype.refresh = function (cb) {
    var promise = this.sandbox.getCronJob({
        container: this.container,
        name: this.name,
        handleMetadata: handleMetadata.bind(this),
    });

    return cb ? promise.nodeify(cb, {spread: true}) : promise;
    
    function handleMetadata(job) {
        assign(this, job);
        
        this.claims = Decode(job.token);
        
        return this;
    }
};

/**
 * Remove this cron job from the webtask cluster
 * 
 * Note that this will not revoke the underlying webtask token, so the underlying webtask will remain functional.
 * 
 * @param {Function} [cb] - Optional callback function for node-style callbacks
 * @returns {Promise} A Promise that will be fulfilled with the token
 */
CronJob.prototype.remove = function (cb) {
    var promise = this.sandbox.removeCronJob({
        container: this.container,
        name: this.name,
    });

    return cb ? promise.nodeify(cb, {spread: true}) : promise;
};

/**
 * Get the history of this cron job
 * 
 * @param {Object} options - Options for retrieving the cron job.
 * @param {String} [options.offset] - The offset to use when paging through results.
 * @param {String} [options.limit] - The limit to use when paging through results.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with an Array of cron job results.
 */
CronJob.prototype.getHistory = function (options, cb) {
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }

    if (!options) options = {};
    
    options = defaultsDeep(options, {
        container: this.container,
        name: this.name,
        offset: 0,
        limit: 10,
    });
    
    var promise = this.sandbox.getCronJobHistory(options);

    return cb ? promise.nodeify(cb, {spread: true}) : promise;
};


/**
 * Inspect an existing webtask to optionally get code and/or secrets
 * 
 * @param {Object} options - Options for inspecting the webtask.
 * @param {Boolean} [options.fetch_code] - Fetch the code associated with the webtask.
 * @param {Boolean} [options.decrypt] - Decrypt the webtask's secrets.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with an Array of cron job results.
 */
CronJob.prototype.inspect = function (options, cb) {
    options.token = this.token;
    
    var promise = this.sandbox.inspectToken(options);

    return cb ? promise.nodeify(cb) : promise;
};

/**
 * Set the cron job's state
 * 
 * @param {Object} options - Options for updating the webtask.
 * @param {Boolean} options.state - Set the cron job's state to this.
 * @param {Function} [cb] - Optional callback function for node-style callbacks.
 * @returns {Promise} A Promise that will be fulfilled with an Array of cron job results.
 */
CronJob.prototype.setJobState = function (options, cb) {
    options.token = this.token;
    
    var self = this;
    var promise = this.sandbox.setCronJobState({
        container: this.container,
        name: this.name,
        state: options.state,
    })
        .tap(function (job) {
            assign(self, job);
        });

    return cb ? promise.nodeify(cb) : promise;
};
