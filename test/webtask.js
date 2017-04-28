require('dotenv').load({ silent: true });

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


lab.experiment('Webtask instances', { parallel: false, timeout: 10000 }, function () {
    var googleTestCodeUrl = 'https://cdn.auth0.com/webtasks/test_cron_google.js';
    var helloWorldCode = 'module.exports = function (cb) { cb(null, "OK"); };';

    lab.test('test pre-requisites are met', done => {

        expect(sandboxParams.url).to.exist();
        expect(sandboxParams.token).to.exist();
        expect(sandboxParams.container).to.exist();

        done();
    });

    lab.test('can be updated with noop options', (done, onCleanUp) => {
        var sandbox = Sandbox.init(sandboxParams);
        var secrets = { foo: 'bar' };

        sandbox.create(helloWorldCode, { name: 'update-test', secrets: secrets })
            .then(webtask => {
                onCleanUp((next) => webtask.remove(next));

                return webtask.update();
            })
            .tap(webtask => {
                expect(webtask).to.be.an.object();
                expect(webtask.constructor).to.be.a.function();
                expect(webtask.constructor.name).to.equal('Webtask');
                expect(webtask.container).to.equal(sandbox.container);
                expect(webtask.claims).to.be.an.object();

                return webtask.inspect({ decrypt: true })
                    .then(function (claims) {
                        expect(claims.ectx).to.equal(secrets);
                    });
            })
            .nodeify(done);
    });

    lab.test('can be updated from code to a url', (done, onCleanUp) => {
        var sandbox = Sandbox.init(sandboxParams);

        sandbox.create(helloWorldCode, { name: 'update-test' })
            .then(webtask => {
                onCleanUp((next) => webtask.remove(next));

                return webtask.update({ url: googleTestCodeUrl });
            })
            .tap(webtask => {
                expect(webtask).to.be.an.object();
                expect(webtask.constructor).to.be.a.function();
                expect(webtask.constructor.name).to.equal('Webtask');
                expect(webtask.container).to.equal(sandbox.container);
                expect(webtask.claims).to.be.an.object();
                expect(webtask.claims.code).to.be.undefined();
                expect(webtask.claims.url).to.equal(googleTestCodeUrl);
            })
            .nodeify(done);
    });

    lab.test('will preserve its secrets', (done, onCleanUp) => {
        var sandbox = Sandbox.init(sandboxParams);
        var secrets = { foo: 'bar' };

        sandbox.create(helloWorldCode, { name: 'update-test', secrets: secrets })
            .then(webtask => {
                onCleanUp((next) => webtask.remove(next));

                return webtask.update({ url: googleTestCodeUrl });
            })
            .tap(webtask => {
                expect(webtask).to.be.an.object();
                expect(webtask.constructor).to.be.a.function();
                expect(webtask.constructor.name).to.equal('Webtask');
                expect(webtask.container).to.equal(sandbox.container);
                expect(webtask.claims).to.be.an.object();
                expect(webtask.claims.code).to.be.undefined();
                expect(webtask.claims.url).to.equal(googleTestCodeUrl);

                return webtask.inspect({ decrypt: true })
                    .then(function (claims) {
                        expect(claims.ectx).to.equal(secrets);
                    });
            })
            .nodeify(done);
    });

    lab.test('will strip secrets when secrets === false', (done, onCleanUp) => {
        var sandbox = Sandbox.init(sandboxParams);
        var secrets = { foo: 'bar' };

        sandbox.create(helloWorldCode, { name: 'update-test', secrets: secrets })
            .then(webtask => {
                onCleanUp((next) => webtask.remove(next));

                return webtask.update({ url: googleTestCodeUrl, secrets: false });
            })
            .tap(webtask => {
                expect(webtask).to.be.an.object();
                expect(webtask.constructor).to.be.a.function();
                expect(webtask.constructor.name).to.equal('Webtask');
                expect(webtask.container).to.equal(sandbox.container);
                expect(webtask.claims).to.be.an.object();
                expect(webtask.claims.code).to.be.undefined();
                expect(webtask.claims.url).to.equal(googleTestCodeUrl);

                return webtask.inspect({ decrypt: true })
                    .then(function (claims) {
                        expect(claims.ectx).to.be.undefined();
                    });
            })
            .nodeify(done);
    });

    lab.test('can be used to run a named webtask', (done, onCleanUp) => {
        var sandbox = Sandbox.init(sandboxParams);
        var secrets = { foo: 'bar' };

        sandbox.create(helloWorldCode, { name: 'update-test', secrets: secrets })
            .tap(webtask => {
                onCleanUp(next => webtask.remove(next));

                return webtask.run({})
                    .then(function (res) {
                        expect(res.statusCode).to.be.at.least(200).and.below(300);
                        expect(res.text).to.equal('"OK"');
                    });
            })
            .nodeify(done);
    });

    lab.test('can be used to run an unnamed webtask', (done, onCleanUp) => {
        var sandbox = Sandbox.init(sandboxParams);
        var secrets = { foo: 'bar' };

        sandbox.create(googleTestCodeUrl, { secrets: secrets })
            .tap(webtask => {
                onCleanUp((next) => webtask.remove(next));

                return webtask.run({})
                    .then(function (res) {
                        expect(res.statusCode).to.be.at.least(200).and.below(300);
                        expect(res.text).to.match(/^\d+$/);
                    });
            })
            .nodeify(done);
    });

    lab.test('can be updated and will preserve metadata', (done, onCleanUp) => {
        var sandbox = Sandbox.init(sandboxParams);
        var secrets = { foo: 'bar' };
        var meta = { key: 'value' };

        sandbox.create(helloWorldCode, { name: 'update-meta-test', secrets, meta })
            .then(webtask => {
                onCleanUp((next) => webtask.remove(next));

                expect(webtask.meta).to.equal(meta);

                return webtask.update({ code: helloWorldCode });
            })
            .tap(webtask => {
                expect(webtask).to.be.an.object();
                expect(webtask.constructor).to.be.a.function();
                expect(webtask.constructor.name).to.equal('Webtask');
                expect(webtask.container).to.equal(sandbox.container);
                expect(webtask.claims).to.be.an.object();
                expect(webtask.meta).to.be.an.object();

                return webtask.inspect({ decrypt: true, fetch_code: true, meta: true })
                    .then(function (claims) {
                        expect(claims.ectx).to.equal(secrets);
                        expect(claims.code).to.equal(helloWorldCode);
                        expect(claims.meta).to.equal(meta);
                    });
            })
            .nodeify(done);
    });
});
