require('dotenv').load({ silent: true });

var Bluebird = require('bluebird');
var Code = require('code');
var Lab = require('lab');
var Sandbox = require('../');

var lab = exports.lab = Lab.script();
var expect = Code.expect;

var sandboxParams = {
    url: process.env.SANDBOX_URL,
    token: process.env.SANDBOX_TOKEN,
    container: process.env.SANDBOX_CONTAINER,
};


lab.experiment('CronJob', {parallel: false, timeout: 10000}, function () {
    var googleTestCodeUrl = 'https://cdn.auth0.com/webtasks/test_cron_google.js';

    lab.test('test pre-requisites are met', function (done) {

        expect(sandboxParams.url).to.exist();
        expect(sandboxParams.token).to.exist();
        expect(sandboxParams.container).to.exist();

        done();
    });
    
    lab.test('creation will throw if a name cannot be derived', function (done) {
        var sandbox = Sandbox.init(sandboxParams);
        var resolved = false;

        // Because there is no pathname to this url, no cron job name can be
        // automatically derived. As a result, Webtask#createCronJob will
        // throw.
        sandbox.create('https://example.com')
            .call('createCronJob', { schedule: '* * * * *' })
            .tap(function (job) {
                resolved = true;
            })
            .catch(function (err) {
                expect(err).to.be.an.instanceOf(Error);
                expect(err.message).to.match(/job.*name/);
            })
            .finally(function () {
                expect(resolved).to.equal(false);
            })
            .nodeify(done);
    });
    
    lab.test('instances can be created from Webtask instances and can destroy themselves', function (done) {
        var sandbox = Sandbox.init(sandboxParams);
        var jobName = 'sandboxjs-test';

        sandbox.create(googleTestCodeUrl, { name: jobName })
            .call('createCronJob', { schedule: '* * * * *' })
            .tap(function (job) {
                expect(job).to.be.an.instanceOf(Sandbox.CronJob);
                expect(job.cluster_url).to.equal(sandbox.url);
                expect(job.name).to.equal(jobName);
            })
            .tap(function (job) {
                return job.remove();
            })
            .tap(function (job) {
                return Bluebird.join(job, sandbox.listCronJobs(), function (removed, jobs) {
                    jobs.forEach(function (job) {
                        expect(job.name).to.not.equal(removed.name);
                    });
                });
            })
            .nodeify(done);
    });
    
    lab.test('listings can be retrieved from a Sandbox', function (done) {
        var sandbox = Sandbox.init(sandboxParams);
        var jobName = 'sandboxjs-test';

        sandbox.create(googleTestCodeUrl, { name: jobName })
            .call('createCronJob', { schedule: '* * * * *' })
            .tap(function (job) {
                var found = false;
                
                expect(job).to.be.an.instanceOf(Sandbox.CronJob);
                expect(job.cluster_url).to.equal(sandbox.url);
                expect(job.name).to.equal(jobName);
                
                return Bluebird.join(job, sandbox.listCronJobs(), function (created, jobs) {
                    jobs.forEach(function (job) {
                        found = found || (job.name === created.name);
                    });
                    
                    expect(found).to.equal(true);
                });
            })
            .tap(function (job) {
                return job.remove();
            })
            .nodeify(done);
    });
});