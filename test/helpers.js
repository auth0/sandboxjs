var Bluebird = require('bluebird');
var Code = require('code');
var Jwt = require('jsonwebtoken');
var Lab = require('lab');
var Path = require('path');
var Sandbox = require('../');
var _ = require('lodash');

var lab = exports.lab = Lab.script();
var expect = Code.expect;


lab.experiment('Sandbox helpers', {parallel: true, timeout: 10000}, function () {
    var googleTestCodeUrl = 'https://cdn.auth0.com/webtasks/test_cron_google.js';
    
    lab.test('test pre-requisites are met', function (done) {
        var test = function () {
            return Sandbox.fromProfile();
        };
        
        expect(test).to.not.throw();
        done();
    });
    
    lab.test('can be used to create a Webtask using Promise syntax', function (done) {
        Sandbox.create(googleTestCodeUrl)
            .then(function (webtask) {
                expect(webtask).to.be.an.object();
                expect(webtask.constructor).to.be.a.function();
                expect(webtask.constructor.name).to.equal('Webtask');
                expect(webtask.token).to.be.a.string();
                expect(webtask.url).to.be.a.string();
                expect(webtask.url).to.match(/^https:\/\//);
            })
            .nodeify(done);
    });
    
    lab.test('can be used to create a Webtask using node-style callback', function (done) {
        Sandbox.create(googleTestCodeUrl, function (err, webtask) {
            expect(webtask).to.be.an.object();
            expect(webtask.constructor).to.be.a.function();
            expect(webtask.constructor.name).to.equal('Webtask');
            expect(webtask.token).to.be.a.string();
            expect(webtask.url).to.be.a.string();
            expect(webtask.url).to.match(/^https:\/\//);
            
            done(err);
        });
    });

    lab.test('can be used to run a webtask', function (done) {
        Sandbox.run(googleTestCodeUrl)
            .spread(function (res, body) {
                expect(res.statusCode).to.be.at.least(200).and.below(300);
                expect(body).to.match(/^\d+$/);
            })
            .nodeify(done);
    });
    
    lab.test('can be used to run code', function (done) {
        var code = 'module.exports = function (ctx, cb) { cb(null, ctx.data.id); }';
        var query = {id: 'test'};
        
        Sandbox.run(code, {query: query})
            .spread(function (res, body) {
                expect(res.statusCode).to.be.at.least(200).and.below(300);
                expect(body).to.equal(query.id);
            })
            .nodeify(done);
    });
    
    lab.test('can be used to get a webtask url', function (done) {
        var code = 'module.exports = function (ctx, cb) { cb(null, ctx.data.id); }';
        
        Sandbox.createUrl(code)
            .then(function (url) {
                expect(url).to.match(/^https:\/\/webtask.it.auth0.com\/api\/run\//);
            })
            .nodeify(done);
    });
});