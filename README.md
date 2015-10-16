# sandboxjs

Sandbox node.js code like a boss.

## Key Features

* Runs code on the public [webtask.io](https://webtask.io) cluster.
* Your code is totally sandboxed from everyone else's.
* Integrated with your [wt-cli](https://npmjs.org/package/wt-cli) profiles.
* Supports returning Promises and/or invoking node-style callbacks.

## Installing it

```bash
npm install sandboxjs

# Optionally configure a default wt-cli profile
npm install -g wt-cli
wt init
```

## Using it

```js
var Assert = require('assert');
var Sandbox = require('sandboxjs');

var code = 'module.exports = function (cb) { cb(null, "hello world"); }';

Sandbox.run(code, function (err, res, body) {
    Assert.ifError(err);
    Assert.equal(res.statusCode, 200, 'The webtask executed as expected');
    Assert.equal(body, 'hello world', 'The webtask returned the expected string');
});
```

For more detailed usage, see [the docs.](docs.md)

## Usages

This library will be used in [wt-cli](https://github.com/auth0/wt-cli).

## Contributing

Just clone the repo, run `npm install` and then hack away.

## Issue reporting
 
If you have found a bug or if you have a feature request, please report them at
this repository issues section. Please do not report security vulnerabilities on
the public GitHub issue tracker. The 
[Responsible Disclosure Program](https://auth0.com/whitehat) details the 
procedure for disclosing security issues.

## License
 
MIT

## What is Auth0?
 
Auth0 helps you to:

* Add authentication with [multiple authentication sources](https://docs.auth0.com/identityproviders), either social like **Google, Facebook, Microsoft Account, LinkedIn, GitHub, Twitter, Box, Salesforce, amont others**, or enterprise identity systems like **Windows Azure AD, Google Apps, Active Directory, ADFS or any SAML Identity Provider**.
* Add authentication through more traditional **[username/password databases](https://docs.auth0.com/mysql-connection-tutorial)**.
* Add support for **[linking different user accounts](https://docs.auth0.com/link-accounts)** with the same user.
* Support for generating signed [Json Web Tokens](https://docs.auth0.com/jwt) to call your APIs and **flow the user identity** securely.
* Analytics of how, when and where users are logging in.
* Pull data from other sources and add it to the user profile, through [JavaScript rules](https://docs.auth0.com/rules).

## Create a free account in Auth0
 
1. Go to [Auth0](https://auth0.com) and click Sign Up.
2. Use Google, GitHub or Microsoft Account to login.
3. 
