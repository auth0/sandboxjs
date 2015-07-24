var Bluebird = require('bluebird');
var Code = require('code');
var Jwt = require('jsonwebtoken');
var Lab = require('lab');
var Path = require('path');
var Sandbox = require('../');
var _ = require('lodash');

var lab = exports.lab = Lab.script();
var expect = Code.expect;


lab.experiment('Sandbox instance', {parallel: true, timeout: 10000}, function () {
    var googleTestCodeUrl = 'https://cdn.auth0.com/webtasks/test_cron_google.js';
    
    lab.test('test pre-requisites are met', function (done) {
        var test = function () {
            return Sandbox.fromProfile();
        };
        
        expect(test).to.not.throw();
        done();
    });
    
    lab.test('can be used to create a Webtask using Promise syntax', function (done) {
        var sandbox = Sandbox.fromProfile(); // Default profile used
        
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
        var sandbox = Sandbox.fromProfile(); // Default profile used
        
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
        var sandbox = Sandbox.fromProfile(); // Default profile used
        var tokenOptions = {
            name: 'pinggoogle',
        };
        
        Bluebird.join(
            sandbox.create(googleTestCodeUrl),
            sandbox.create(googleTestCodeUrl, tokenOptions),
            function (webtask1, webtask2) {
                expect(webtask1.url).to.match(/^https:\/\//);
                expect(webtask2.url).to.match(/^https:\/\//);
                expect(webtask1.url + '/' + tokenOptions.name).to.equal(webtask2.url);
            })
            .nodeify(done);
    });
});