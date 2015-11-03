var Jwt = require('jsonwebtoken');

var assign = require('lodash.assign');
var defaultsDeep = require('lodash.defaultsdeep');

/**
 * Creates an object representing a Webtask
 *
 * @constructor
 */
function CronJob (sandbox, job) {
    assign(this, job);
    
    this.claims = Jwt.decode(job.token);
    this.sandbox = sandbox;
    this.cluster_url = 'https://' + this.cluster_url;

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

CronJob.prototype.remove = function (cb) {
    var promise = this.sandbox.removeCronJob({
        container: this.container,
        name: this.name,
    });

    return cb ? promise.nodeify(cb, {spread: true}) : promise;
};

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

module.exports = CronJob;