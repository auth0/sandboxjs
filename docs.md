## Classes
<dl>
<dt><a href="#Sandbox">Sandbox</a></dt>
<dd></dd>
<dt><a href="#Webtask">Webtask</a></dt>
<dd></dd>
</dl>
## Functions
<dl>
<dt><a href="#create">create(codeOrUrl, [options], [cb])</a> ⇒ <code>Promise</code></dt>
<dd><p>Create a Webtask from the given options</p>
</dd>
<dt><a href="#create">create(claims, [cb])</a> ⇒ <code>Promise</code></dt>
<dd><p>Create a Webtask from the given claims</p>
</dd>
<dt><a href="#createUrl">createUrl(options, [cb])</a> ⇒ <code>Promise</code></dt>
<dd><p>Shortcut to create a Webtask and get its url from the given options</p>
</dd>
<dt><a href="#run">run([codeOrUrl], [options], [cb])</a> ⇒ <code>Promise</code></dt>
<dd><p>Shortcut to create and run a Webtask from the given options</p>
</dd>
<dt><a href="#createToken">createToken(options, [cb])</a> ⇒ <code>Promise</code></dt>
<dd><p>Create a webtask token - A JWT (see: <a href="http://jwt.io">http://jwt.io</a>) with the supplied options</p>
</dd>
<dt><a href="#createToken">createToken(claims, [cb])</a> ⇒ <code>Promise</code></dt>
<dd><p>Create a webtask token - A JWT (see: <a href="http://jwt.io">http://jwt.io</a>) with the supplied claims</p>
</dd>
<dt><a href="#createLogStream">createLogStream(options)</a> ⇒ <code>Stream</code></dt>
<dd><p>Create a stream of logs from the webtask container</p>
<p>Note that the logs will include messages from our infrastructure.</p>
</dd>
<dt><a href="#createLogStream">createLogStream(options)</a> ⇒ <code>Stream</code></dt>
<dd><p>Create a stream of logs from the webtask container</p>
<p>Note that the logs will include messages from our infrastructure.</p>
</dd>
</dl>
<a name="Sandbox"></a>
## Sandbox
**Kind**: global class  
<a name="new_Sandbox_new"></a>
### new Sandbox(options)
Creates an object representing a user's webtask.io credentials


| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options used to configure the profile |
| options.url | <code>String</code> | The url of the webtask cluster where code will run |
| options.container | <code>String</code> | The name of the container in which code will run |
| options.token | <code>String</code> | The JWT (see: http://jwt.io) issued by webtask.io that grants rights to run code in the indicated container |

<a name="Webtask"></a>
## Webtask
**Kind**: global class  

* [Webtask](#Webtask)
  * [new Webtask()](#new_Webtask_new)
  * [.run(options, [cb])](#Webtask+run) ⇒ <code>Promise</code>

<a name="new_Webtask_new"></a>
### new Webtask()
Creates an object representing a Webtask

<a name="Webtask+run"></a>
### webtask.run(options, [cb]) ⇒ <code>Promise</code>
Run the webtask and return the result of execution

**Kind**: instance method of <code>[Webtask](#Webtask)</code>  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options used to tweak how the webtask will be invoked |
| [cb] | <code>function</code> | Optional node-style callback that will be invoked upon completion |

<a name="create"></a>
## create(codeOrUrl, [options], [cb]) ⇒ <code>Promise</code>
Create a Webtask from the given options

**Kind**: global function  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| codeOrUrl | <code>String</code> | The code for the webtask or a url starting with http:// or https:// |
| [options] | <code>Object</code> | Options for creating the webtask |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="create"></a>
## create(claims, [cb]) ⇒ <code>Promise</code>
Create a Webtask from the given claims

**Kind**: global function  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| claims | <code>Object</code> | Options for creating the webtask |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="createUrl"></a>
## createUrl(options, [cb]) ⇒ <code>Promise</code>
Shortcut to create a Webtask and get its url from the given options

**Kind**: global function  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Options for creating the webtask |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="run"></a>
## run([codeOrUrl], [options], [cb]) ⇒ <code>Promise</code>
Shortcut to create and run a Webtask from the given options

**Kind**: global function  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| [codeOrUrl] | <code>String</code> | The code for the webtask or a url starting with http:// or https:// |
| [options] | <code>Object</code> | Options for creating the webtask |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="createToken"></a>
## createToken(options, [cb]) ⇒ <code>Promise</code>
Create a webtask token - A JWT (see: http://jwt.io) with the supplied options

**Kind**: global function  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Claims to make for this token (see: https://webtask.io/docs/api_issue) |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="createToken"></a>
## createToken(claims, [cb]) ⇒ <code>Promise</code>
Create a webtask token - A JWT (see: http://jwt.io) with the supplied claims

**Kind**: global function  
**Returns**: <code>Promise</code> - A Promise that will be fulfilled with the token  

| Param | Type | Description |
| --- | --- | --- |
| claims | <code>Object</code> | Claims to make for this token (see: https://webtask.io/docs/api_issue) |
| [cb] | <code>function</code> | Optional callback function for node-style callbacks |

<a name="createLogStream"></a>
## createLogStream(options) ⇒ <code>Stream</code>
Create a stream of logs from the webtask container

Note that the logs will include messages from our infrastructure.

**Kind**: global function  
**Returns**: <code>Stream</code> - A stream that will emit 'data' events with container logs  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Streaming options overrides |
| [options.container] | <code>String</code> | The container for which you would like to stream logs. Defaults to the current profile's container. |

<a name="createLogStream"></a>
## createLogStream(options) ⇒ <code>Stream</code>
Create a stream of logs from the webtask container

Note that the logs will include messages from our infrastructure.

**Kind**: global function  
**Returns**: <code>Stream</code> - A stream that will emit 'data' events with container logs  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Streaming options overrides |
| [options.container] | <code>String</code> | The container for which you would like to stream logs. Defaults to the current profile's container. |

