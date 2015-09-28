require('dotenv').load({ silent: true });

var Bluebird = require('bluebird');
var Code = require('code');
var Lab = require('lab');
var Sandbox = require('../');
var Url = require('url');
var _ = require('lodash');

var lab = exports.lab = Lab.script();
var expect = Code.expect;

var sandboxParams = {
    url: process.env.SANDBOX_URL,
    token: process.env.SANDBOX_TOKEN,
    container: process.env.SANDBOX_CONTAINER,
};


lab.experiment('Sandbox instance', {parallel: true, timeout: 10000}, function () {
    var googleTestCodeUrl = 'https://cdn.auth0.com/webtasks/test_cron_google.js';

    lab.test('test pre-requisites are met', function (done) {

        expect(sandboxParams.url).to.exist();
        expect(sandboxParams.token).to.exist();
        expect(sandboxParams.container).to.exist();

        done();
    });

    lab.test('can be used to create a Webtask using Promise syntax', function (done) {
        var sandbox = Sandbox.init(sandboxParams);

        sandbox.create(googleTestCodeUrl)
            .then(function (webtask) {
                expect(webtask).to.be.an.object();
                expect(webtask.constructor).to.be.a.function();
                expect(webtask.constructor.name).to.equal('Webtask');
                expect(webtask.container).to.equal(sandbox.container);
                expect(webtask.token).to.be.a.string();
                expect(webtask.url).to.be.a.string();
                expect(webtask.url).to.match(/^https:\/\//);
            })
            .nodeify(done);
    });

    lab.test('can be used to create a Webtask using node-style callback', function (done) {
        var sandbox = Sandbox.init(sandboxParams);

        sandbox.create(googleTestCodeUrl, function (err, webtask) {
            expect(webtask).to.be.an.object();
            expect(webtask.constructor).to.be.a.function();
            expect(webtask.constructor.name).to.equal('Webtask');
            expect(webtask.container).to.equal(sandbox.container);
            expect(webtask.token).to.be.a.string();
            expect(webtask.url).to.be.a.string();
            expect(webtask.url).to.match(/^https:\/\//);

            done(err);
        });
    });

    lab.test('can be used to create a named Webtask', function (done) {
        var sandbox = Sandbox.init(sandboxParams);
        var tokenOptions = {
            name: 'pinggoogle',
        };

        Bluebird.join(
            sandbox.create(googleTestCodeUrl),
            sandbox.create(googleTestCodeUrl, tokenOptions),
            function (webtask1, webtask2) {
                var url1 = Url.parse(webtask1.url, true);
                var url2 = Url.parse(webtask2.url, true);

                expect(webtask1.url).to.match(/^https:\/\//);
                expect(webtask2.url).to.match(/^https:\/\//);
                expect(url1.pathname + '/' + tokenOptions.name).to.equal(url2.pathname);
                expect(url1.query.key).to.be.a.string();
                expect(url2.query.key).to.not.exist();
            })
            .nodeify(done);
    });

    lab.test('can be used to run a webtask', function (done) {
        var sandbox = Sandbox.init(sandboxParams);

        sandbox.run(googleTestCodeUrl)
            .then(function (res) {
                expect(res.statusCode).to.be.at.least(200).and.below(300);
                expect(res.text).to.match(/^\d+$/);
            })
            .nodeify(done);
    });

    lab.test('can be used to run a named Webtask', function (done) {
        var sandbox = Sandbox.init(sandboxParams);

        sandbox.run(googleTestCodeUrl, { name: 'pinggoogle' })
            .then(function (res) {
                expect(res.statusCode).to.be.at.least(200).and.below(300);
                expect(res.text).to.match(/^\d+$/);
            })
            .nodeify(done);
    });

    lab.test('can be used to run code', function (done) {
        var sandbox = Sandbox.init(sandboxParams);
        var code = 'module.exports = function (ctx, cb) { cb(null, ctx.data.id); }';
        var query = {id: 'test'};

        sandbox.run(code, {query: query})
            .then(function (res, body) {
                expect(res.statusCode).to.be.at.least(200).and.below(300);
                expect(res.body).to.equal(query.id);
            })
            .nodeify(done);
    });
});