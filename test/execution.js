require('dotenv').load({ silent: true });

var Bluebird = require('bluebird');
var Code = require('code');
var Lab = require('lab');
var Sandbox = require('../');
var Url = require('url');

var lab = exports.lab = Lab.script();
var expect = Code.expect;

var sandboxParams = {
    url: process.env.SANDBOX_URL,
    token: process.env.SANDBOX_TOKEN,
    container: process.env.SANDBOX_CONTAINER,
};


lab.experiment('Sandbox instance', {parallel: true, timeout: 10000}, function () {
    var googleTestCodeUrl = 'https://cdn.auth0.com/webtasks/test_cron_google.js';
    var helloWorldCode = 'module.exports = function (cb) { cb(null, "OK"); };';
    var counter = 0;

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
            name: 'pinggoogle-' + (counter++),
        };

        Bluebird.join(
            sandbox.create(googleTestCodeUrl),
            sandbox.create(googleTestCodeUrl, tokenOptions),
            function (webtask1, webtask2) {
                var url1 = Url.parse(webtask1.url, true);
                var url2 = Url.parse(webtask2.url, true);

                expect(webtask1.url).to.match(/^https:\/\//);
                expect(webtask2.url).to.match(/^https:\/\//);
                expect(url1.query.key).to.be.a.string();
                expect(url2.query.key).to.not.exist();

                return sandbox.removeWebtask(tokenOptions);
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
        var tokenOptions = {
            name: 'pinggoogle-' + (counter++),
        };

        sandbox.run(googleTestCodeUrl, tokenOptions)
            .then(function (res) {
                expect(res.statusCode).to.be.at.least(200).and.below(300);
                expect(res.text).to.match(/^\d+$/);

                return sandbox.removeWebtask(tokenOptions);
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

    lab.test('4XX errors do not reject promises', function (done) {
        var sandbox = Sandbox.init(sandboxParams);
        var code = 'module.exports = function (ctx, req, res) { res.writeHead(404); res.end(); }';

        sandbox.run(code)
            .then(function (res, body) {
                expect(res.statusCode).to.equal(404);
                expect(res.clientError).to.equal(true);
                expect(res.serverError).to.equal(false);
            })
            .nodeify(done);
    });

    lab.test('5XX errors do not reject promises', function (done) {
        var sandbox = Sandbox.init(sandboxParams);
        var code = 'module.exports = function (ctx, req, res) { res.writeHead(500); res.end(); }';

        sandbox.run(code)
            .then(function (res, body) {
                expect(res.statusCode).to.equal(500);
                expect(res.clientError).to.equal(false);
                expect(res.serverError).to.equal(true);
            })
            .nodeify(done);
    });

    lab.test('can be used to list named Webtasks in a container', function (done) {
        var sandbox = Sandbox.init(sandboxParams);
        var tokenOptions = {
            name: 'pinggoogle-' + (counter++),
        };

        sandbox.create(googleTestCodeUrl, tokenOptions)
            .then(function (webtask) {
                return sandbox.listWebtasks()
                    .then(function (webtasks) {
                        expect(webtasks).to.be.an.array();
                        expect(webtasks.length).to.be.at.least(1);

                        expect(webtasks[0]).to.be.an.instanceof(Sandbox.Webtask);

                        return webtask.remove();
                    });
            })
            .nodeify(done);
    });

    lab.test('can be used to read a named webtask', function (done) {
        var sandbox = Sandbox.init(sandboxParams);
        var tokenOptions = {
            name: 'pinggoogle-' + (counter++),
        };

        sandbox.create(googleTestCodeUrl, tokenOptions)
            .then(function (created) {
                return sandbox.getWebtask(tokenOptions)
                    .then(function (read) {
                        expect(created).to.be.an.instanceof(Sandbox.Webtask);
                        expect(read).to.be.an.instanceof(Sandbox.Webtask);
                        expect(read.url).to.equal(created.url);
                        expect(read.token).to.equal(created.token);

                        return read.remove();
                    });
            })
            .nodeify(done);
    });

    lab.test('can be used to inspect a named webtask', function (done) {
        var sandbox = Sandbox.init(sandboxParams);
        var tokenOptions = {
            name: 'pinggoogle-' + (counter++),
            secrets: {
                foo: 'bar',
            }
        };

        sandbox.create(helloWorldCode, tokenOptions)
            .then(function (webtask) {
                return webtask.inspect({ decrypt: true, fetch_code: true })
                    .then(function (data) {
                        expect(data).to.be.an.object();
                        expect(data.code).to.equal(helloWorldCode);
                        expect(data.ectx).to.deep.equal(tokenOptions.secrets);

                        return webtask.remove();
                    });
            })
            .nodeify(done);
    });
});
