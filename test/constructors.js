var Bluebird = require('bluebird');
var Code = require('code');
var Jwt = require('jsonwebtoken');
var Lab = require('lab');
var MockFs = require('mock-fs');
var Path = require('path');
var Sandbox = require('../');
var _ = require('lodash');

var lab = exports.lab = Lab.script();
var expect = Code.expect;


lab.experiment('Sandbox.fromToken()', function () {
    lab.test('will fail with an invalid token', function (done) {
        var test = function () {
            return Sandbox.fromToken('Not a real jwt.');
        };
        
        expect(test).to.throw();
        done();
    });
    
    lab.test('will fail with a jwt missing a `ten` claim', function (done) {
        var test = function () {
            var token = Jwt.sign({
                
            }, 'test');
            return Sandbox.fromToken(token);
        };
        
        expect(test).to.throw();
        done();
    });
    
    lab.test('will fail with a jwt having a blank `jwt` claim', function (done) {
        var test = function () {
            var token = Jwt.sign({
                ten: '',
            }, 'test');
            return Sandbox.fromToken(token);
        };
        
        expect(test).to.throw();
        done();
    });
    
    lab.test('will derive `ten` claim from a regular expression', function (done) {
        var token = Jwt.sign({
            ten: '/^wt-1234-[0-1]$/',
        }, 'test');
        var sandbox = Sandbox.fromToken(token);
        
        expect(sandbox).to.be.an.instanceof(Sandbox);
        expect(sandbox.container).to.equal('wt-1234-0');
        done();
    });
    
    lab.test('will populate default options', function (done) {
        var token = Jwt.sign({
            ten: 'test',
        }, 'test');
        var sandbox = Sandbox.fromToken(token);
        
        expect(sandbox).to.be.an.instanceof(Sandbox);
        expect(sandbox.container).to.equal('test');
        expect(sandbox.token).to.equal(token);
        expect(sandbox.url).to.equal('https://webtask.it.auth0.com');
        done();
    });
});

lab.experiment('Sandbox.fromProfile()', function () {
    lab.test('will fail if no profiles are in the default location', function (done) {
        var configPath = Path.join(process.env['USERPROFILE'] || process.env['HOME'], '.webtask');
        
        MockFs(_.set({}, [configPath], undefined));
        
        var test = function () {
            return Sandbox.fromProfile('default');
        };
        
        expect(test).to.throw();
        
        MockFs.restore();
        
        done();
    });
    
    lab.test('will succeed with the default profile in the default location', function (done) {
        var configPath = Path.join(process.env['USERPROFILE'] || process.env['HOME'], '.webtask');
        
        MockFs(_.set({}, [configPath], JSON.stringify({
            'default': {
                container: 'foo',
                token: 'bar',
                url: 'baz',
            }
        })));
        
        var sandbox = Sandbox.fromProfile('default');
        
        expect(sandbox).to.be.an.instanceof(Sandbox);
        expect(sandbox.container).to.equal('foo');
        expect(sandbox.token).to.equal('bar');
        expect(sandbox.url).to.equal('baz');
        
        MockFs.restore();
        
        done();
    });
    
    lab.test('will fail if no profiles are in a custom location', function (done) {
        var configPath = Path.join(process.cwd(), '.webtask');
        
        MockFs(_.set({}, [configPath], undefined));
        
        var test = function () {
            return Sandbox.fromProfile('default', {configPath: configPath});
        };
        
        expect(test).to.throw();
        
        MockFs.restore();
        
        done();
    });
    
    lab.test('will succeed with the default profile in a custom location', function (done) {
        var configPath = Path.join(process.cwd(), '.webtask');
        
        MockFs(_.set({}, [configPath], JSON.stringify({
            'default': {
                container: 'foo',
                token: 'bar',
                url: 'baz',
            }
        })));
        
        var sandbox = Sandbox.fromProfile('default', {configPath: configPath});
        
        expect(sandbox).to.be.an.instanceof(Sandbox);
        expect(sandbox.container).to.equal('foo');
        expect(sandbox.token).to.equal('bar');
        expect(sandbox.url).to.equal('baz');
        
        MockFs.restore();
        
        done();
    });
});

lab.experiment('Sandbox.init()', function () {
    lab.test('will fail if no options are passed in', function (done) {
        var test = function () {
            return Sandbox.init();
        };
        
        expect(test).to.throw();
        
        done();
    });
    
    lab.test('will fail if a non-Object options parameter is used', function (done) {
        var test = function () {
            return Sandbox.init('not an object, I think');
        };
        
        expect(test).to.throw();
        
        done();
    });
    
    lab.test('will fail if container option is missing', function (done) {
        var test = function () {
            return Sandbox.init({
                token: 'foo',
            });
        };
        
        expect(test).to.throw();
        
        done();
    });
    
    lab.test('will fail if container option is not a string', function (done) {
        var test = function () {
            return Sandbox.init({
                container: /regex/,
                token: 'foo',
            });
        };
        
        expect(test).to.throw();
        
        done();
    });
    
    lab.test('will fail if token option is missing', function (done) {
        var test = function () {
            return Sandbox.init({
                container: 'foo',
            });
        };
        
        expect(test).to.throw();
        
        done();
    });
});