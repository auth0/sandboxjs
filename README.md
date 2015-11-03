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
```

## Using it

**First, get a webtask token using [wt-cli](https://npmjs.org/package/wt-cli):**

```bash
# Create a new wt-cli profile
npm install -g wt-cli
wt init

# Or, if you already use wt-cli:
wt profile ls
```

```js
var Assert = require('assert');
var Sandbox = require('sandboxjs');

// You can get your webtask token using the steps above
var code = 'module.exports = function (ctx, cb) { cb(null, "hello world"); }';
var profile = Sandbox.fromToken(process.env.WEBTASK_TOKEN);

// This library lets you create a webtask and run it in one step as a shortcut:
profile.run(code, function (err, res, body) {
    Assert.ifError(err);
    Assert.equal(res.statusCode, 200, 'The webtask executed as expected');
    Assert.equal(body, 'hello world', 'The webtask returned the expected string');
});

// Alternatively, your application might want to to create a webtask url
// with your (or your users') custom code and secrets.
profile.create(code, { secrets: { auth0: 'rocks' } }, function (err, webtask) {
    Assert.ifError(err);
    
    // Making requests to this url will run the specified custom code in a
    // node.js sandbox and will give it access to your secrets in the first
    // argument (`ctx`) of your exported webtask function.
    // For more information on the different styles of webtask functions that
    // are supported, see: https://webtask.io/docs/model
    console.log(webtask.url);
});
```

## API

## Modules
<dl>
<dt><a href="#module_sandboxjs">sandboxjs</a></dt>
<dd><p>Sandbox node.js code.</p>
</dd>
</dl>
## Classes
<dl>
<dt><a href="#CronJob">CronJob</a></dt>
<dd></dd>
<dt><a href="#Sandbox">Sandbox</a></dt>
<dd></dd>
<dt><a href="#Webtask">Webtask</a></dt>
<dd></dd>
</dl>
<a name="module_sandboxjs"></a>
## sandboxjs
Sandbox node.js code.


* [sandboxjs](#module_sandboxjs)
  * [.fromToken(token, options)](#module_sandboxjs.fromToken) ⇒ <code>[Sandbox](#Sandbox)</code>
  * [.init(options)](#module_sandboxjs.init) ⇒ <code>[Sandbox](#Sandbox)</code>

<a name="module_sandboxjs.fromToken"></a>
### Sandbox.fromToken(token, options) ⇒ <code>[Sandbox](#Sandbox)</code>
Create a Sandbox instance from a webtask token

**Kind**: static method of <code>[sandboxjs](#module_sandboxjs)</code>  
**Returns**: <code>[Sandbox](#Sandbox)</code> - A {@see Sandbox} instance whose url, token and container were derived from the given webtask token.  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>String</code> | The webtask token from which the Sandbox profile will be derived. |
| options | <code>Object</code> | The options for creating the Sandbox instance that override the derived values from the token. |
| [options.url] | <code>String</code> | The url of the webtask cluster. Defaults to the public 'webtask.it.auth0.com' cluster. |
| options.container | <code>String</code> | The container with which this Sandbox instance should be associated. Note that your Webtask token must give you access to that container or all operations will fail. |
| options.token | <code>String</code> | The Webtask Token. See: https://webtask.io/docs/api_issue. |

<a name="module_sandboxjs.init"></a>
### Sandbox.init(options) ⇒ <code>[Sandbox](#Sandbox)</code>
Create a Sandbox instance

**Kind**: static method of <code>[sandboxjs](#module_sandboxjs)</code>  
**Returns**: <code>[Sandbox](#Sandbox)</code> - A {@see Sandbox} instance.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | The options for creating the Sandbox instance. |
| [options.url] | <code>String</code> | The url of the webtask cluster. Defaults to the public 'webtask.it.auth0.com' cluster. |
| options.container | <code>String</code> | The container with which this Sandbox instance should be associated. Note that your Webtask token must give you access to that container or all operations will fail. |
| options.token | <code>String</code> | The Webtask Token. See: https://webtask.io/docs/api_issue. |

<a name="CronJob"></a>
## CronJob
**Kind**: global class  

* [CronJob](#CronJob)
  * [new CronJob()](#new_CronJob_new)
  * [.claims](#CronJob+claims)
  * [.sandbox](#CronJob+sandbox)
  * [.cluster_url](#CronJob+cluster_url)
  * [.remove([cb])](#CronJob+remove) ⇒ <code>Promise</code>
  * [.getHistory(options, [cb])](#CronJob+getHistory) ⇒ <code>Promise</code>

<a name="new_CronJob_new"></a>
### new CronJob()
Creates an object representing a Webtask

<a name="CronJob+claims"></a>
### cronJob.claims
**Kind**: instance property of <code>[CronJob](#CronJob)</code>  
**Properties**

| Name | Description |
| --- | --- |
| claims | The claims embedded in the Webtask's token |

<a name="CronJob+sandbox"></a>
### cronJob.sandbox
**Kind**: instance property of <code>[CronJob](#CronJob)</code>  
**Properties**

| Name | Description |
| --- | --- |
| sandbox | The {@see Sandbox} instance used to create this Webtask instance |

<a name="CronJob+cluster_url"></a>
### cronJob.cluster_url
**Kind**: instance property of <code>[CronJob](#CronJob)</code>  
**Properties**

| Name | Description |
| --- | --- |
| cluster_url | The url of the webtask cluster on which this job will run |

<a name="CronJob+remove"></a>
### cronJob.remove([cb]) ⇒ <code>Promise</code>
Remove this cron job from the webtask cluster

Note that this will not revoke the underlying webtask token, so the underlying webtask will remain functional.

**Kind**: instance method of <code>[CronJob](#CronJob)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="CronJob+getHistory"></a>
### cronJob.getHistory(options, [cb]) ⇒ <code>Promise</code>
Get the history of this cron job

**Kind**: instance method of <code>[CronJob](#CronJob)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with an Array of cron job results.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options for retrieving the cron job. |
| [options.offset] | <code>String</code> | The offset to use when paging through results. |
| [options.limit] | <code>String</code> | The limit to use when paging through results. |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks. |

<a name="Sandbox"></a>
## Sandbox
**Kind**: global class  

* [Sandbox](#Sandbox)
  * [new Sandbox(options)](#new_Sandbox_new)
  * [.create(codeOrUrl, [options], [cb])](#Sandbox+create) ⇒ <code>Promise</code>
  * [.createRaw(claims, [cb])](#Sandbox+createRaw) ⇒ <code>Promise</code>
  * [.createUrl(options, [cb])](#Sandbox+createUrl) ⇒ <code>Promise</code>
  * [.run([codeOrUrl], [options], [cb])](#Sandbox+run) ⇒ <code>Promise</code>
  * [.createToken(options, [cb])](#Sandbox+createToken) ⇒ <code>Promise</code>
  * [.createTokenRaw(claims, [cb])](#Sandbox+createTokenRaw) ⇒ <code>Promise</code>
  * [.createLogStream(options)](#Sandbox+createLogStream) ⇒ <code>Stream</code>
  * [.createCronJob(options, [cb])](#Sandbox+createCronJob) ⇒ <code>Promise</code>
  * [.removeCronJob(options, [cb])](#Sandbox+removeCronJob) ⇒ <code>Promise</code>
  * [.listCronJobs([options], [cb])](#Sandbox+listCronJobs) ⇒ <code>Promise</code>
  * [.getCronJob(options, [cb])](#Sandbox+getCronJob) ⇒ <code>Promise</code>
  * [.getCronJobHistory(options, [cb])](#Sandbox+getCronJobHistory) ⇒ <code>Promise</code>

<a name="new_Sandbox_new"></a>
### new Sandbox(options)
Creates an object representing a user's webtask.io credentials


| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options used to configure the profile |
| options.url | <code>String</code> | The url of the webtask cluster where code will run |
| options.container | <code>String</code> | The name of the container in which code will run |
| options.token | <code>String</code> | The JWT (see: http://jwt.io) issued by webtask.io that grants rights to run code in the indicated container |

<a name="Sandbox+create"></a>
### sandbox.create(codeOrUrl, [options], [cb]) ⇒ <code>Promise</code>
Create a Webtask from the given options

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| codeOrUrl | <code>String</code> | The code for the webtask or a url starting with http:// or https:// |
| [options] | <code>Object</code> | Options for creating the webtask |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="Sandbox+createRaw"></a>
### sandbox.createRaw(claims, [cb]) ⇒ <code>Promise</code>
Create a Webtask from the given claims

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| claims | <code>Object</code> | Options for creating the webtask |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="Sandbox+createUrl"></a>
### sandbox.createUrl(options, [cb]) ⇒ <code>Promise</code>
Shortcut to create a Webtask and get its url from the given options

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options for creating the webtask |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="Sandbox+run"></a>
### sandbox.run([codeOrUrl], [options], [cb]) ⇒ <code>Promise</code>
Shortcut to create and run a Webtask from the given options

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| [codeOrUrl] | <code>String</code> | The code for the webtask or a url starting with http:// or https:// |
| [options] | <code>Object</code> | Options for creating the webtask |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="Sandbox+createToken"></a>
### sandbox.createToken(options, [cb]) ⇒ <code>Promise</code>
Create a webtask token - A JWT (see: http://jwt.io) with the supplied options

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Claims to make for this token (see: https://webtask.io/docs/api_issue) |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="Sandbox+createTokenRaw"></a>
### sandbox.createTokenRaw(claims, [cb]) ⇒ <code>Promise</code>
Create a webtask token - A JWT (see: http://jwt.io) with the supplied claims

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| claims | <code>Object</code> | Claims to make for this token (see: https://webtask.io/docs/api_issue) |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="Sandbox+createLogStream"></a>
### sandbox.createLogStream(options) ⇒ <code>Stream</code>
Create a stream of logs from the webtask container

Note that the logs will include messages from our infrastructure.

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Stream</code> - A stream that will emit 'data' events with container logs  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Streaming options overrides |
| [options.container] | <code>String</code> | The container for which you would like to stream logs. Defaults to the current profile's container. |

<a name="Sandbox+createCronJob"></a>
### sandbox.createCronJob(options, [cb]) ⇒ <code>Promise</code>
Create a cron job from an already-existing webtask token

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with a {@see CronJob} instance.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options for creating a cron job |
| [options.container] | <code>String</code> | The container in which the job will run. Defaults to the current profile's container. |
| options.name | <code>String</code> | The name of the cron job. |
| options.token | <code>String</code> | The webtask token that will be used to run the job. |
| options.schedule | <code>String</code> | The cron schedule that will be used to determine when the job will be run. |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks. |

<a name="Sandbox+removeCronJob"></a>
### sandbox.removeCronJob(options, [cb]) ⇒ <code>Promise</code>
Remove an existing cron job

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the response from removing the job.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options for removing the cron job |
| [options.container] | <code>String</code> | The container in which the job will run. Defaults to the current profile's container. |
| options.name | <code>String</code> | The name of the cron job. |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks. |

<a name="Sandbox+listCronJobs"></a>
### sandbox.listCronJobs([options], [cb]) ⇒ <code>Promise</code>
List cron jobs associated with this profile

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with an Array of {@see CronJob} instances.  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Options for listing cron jobs. |
| [options.container] | <code>String</code> | The container in which the job will run. Defaults to the current profile's container. |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks. |

<a name="Sandbox+getCronJob"></a>
### sandbox.getCronJob(options, [cb]) ⇒ <code>Promise</code>
Get a CronJob instance associated with an existing cron job

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with a {@see CronJob} instance.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options for retrieving the cron job. |
| [options.container] | <code>String</code> | The container in which the job will run. Defaults to the current profile's container. |
| options.name | <code>String</code> | The name of the cron job. |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks. |

<a name="Sandbox+getCronJobHistory"></a>
### sandbox.getCronJobHistory(options, [cb]) ⇒ <code>Promise</code>
Get the historical results of executions of an existing cron job.

**Kind**: instance method of <code>[Sandbox](#Sandbox)</code>  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with an Array of cron job results.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options for retrieving the cron job. |
| [options.container] | <code>String</code> | The container in which the job will run. Defaults to the current profile's container. |
| options.name | <code>String</code> | The name of the cron job. |
| [options.offset] | <code>String</code> | The offset to use when paging through results. |
| [options.limit] | <code>String</code> | The limit to use when paging through results. |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks. |

<a name="Webtask"></a>
## Webtask
**Kind**: global class  

* [Webtask](#Webtask)
  * [new Webtask()](#new_Webtask_new)
  * [.claims](#Webtask+claims)
  * [.sandbox](#Webtask+sandbox)
  * [.token](#Webtask+token)
  * [.createLogStream(options)](#Webtask+createLogStream) ⇒ <code>Stream</code>
  * [.run(options, [cb])](#Webtask+run) ⇒ <code>Promise</code>
  * [.createCronJob(options, [cb])](#Webtask+createCronJob) ⇒ <code>Promise</code>

<a name="new_Webtask_new"></a>
### new Webtask()
Creates an object representing a Webtask

<a name="Webtask+claims"></a>
### webtask.claims
**Kind**: instance property of <code>[Webtask](#Webtask)</code>  
**Properties**

| Name | Description |
| --- | --- |
| claims | The claims embedded in the Webtask's token |

<a name="Webtask+sandbox"></a>
### webtask.sandbox
**Kind**: instance property of <code>[Webtask](#Webtask)</code>  
**Properties**

| Name | Description |
| --- | --- |
| sandbox | The {@see Sandbox} instance used to create this Webtask instance |

<a name="Webtask+token"></a>
### webtask.token
**Kind**: instance property of <code>[Webtask](#Webtask)</code>  
**Properties**

| Name | Description |
| --- | --- |
| token | The token associated with this webtask |

<a name="Webtask+createLogStream"></a>
### webtask.createLogStream(options) ⇒ <code>Stream</code>
Create a stream of logs from the webtask container

Note that the logs will include messages from our infrastructure.

**Kind**: instance method of <code>[Webtask](#Webtask)</code>  
**Returns**: <code>Stream</code> - A stream that will emit 'data' events with container logs  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Streaming options overrides |
| [options.container] | <code>String</code> | The container for which you would like to stream logs. Defaults to the current profile's container. |

<a name="Webtask+run"></a>
### webtask.run(options, [cb]) ⇒ <code>Promise</code>
Run the webtask and return the result of execution

**Kind**: instance method of <code>[Webtask](#Webtask)</code>  
**Returns**: <code>Promise</code> - - A Promise that will be resolved with the response from the server.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options used to tweak how the webtask will be invoked |
| [cb] | <code>function</code> | Optional node-style callback that will be invoked upon completion |

<a name="Webtask+createCronJob"></a>
### webtask.createCronJob(options, [cb]) ⇒ <code>Promise</code>
Schedule the webtask to run periodically

**Kind**: instance method of <code>[Webtask](#Webtask)</code>  
**Returns**: <code>Promise</code> - - A Promise that will be resolved with a {@see CronJob} instance.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options for creating the webtask |
| options.schedule | <code>Object</code> | Cron-string-formatted schedule |
| [options.name] | <code>Object</code> | The name for the cron job |
| [cb] | <code>function</code> | Optional node-style callback that will be invoked upon completion |


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
