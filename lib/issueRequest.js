var Bluebird = require('bluebird');


module.exports = issueRequest;


function issueRequest (request) {
    return Bluebird.resolve(request)
        .catch(normalizeResponseError)
        .then(function (res) {
            // Api compatibility
            res.statusCode = res.status;

            return res;
        });
}

function normalizeResponseError (err) {
    var error;
    var res = err.response;
    
    if (!res) {
        error = new Error(err.message);
    } else if (res.clientError) {
        error = new Error('Invalid request: '
            + res.body && res.body.message
                ? res.body.message
                : res.text);
    } else if (res.serverError) {
        error = new Error('Server error: '
            + res.body && res.body.message
                ? res.body.message
                : res.text);
    }
    
    Object.defineProperty(error, 'stack', { get: function () { return err.stack; }});
    
    error.statusCode = err.status || 500;
    
    throw error;
}