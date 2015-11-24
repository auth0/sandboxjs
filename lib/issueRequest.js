var Bluebird = require('bluebird');


module.exports = issueRequest;


function issueRequest (request) {
    return Bluebird.resolve(request)
        .catch(function (err) {
            throw new Error('Error communicating with the webtask cluster: '
                + err.message);
        })
        .then(function (res) {
            if (res.error) throw createResponseError(res);

            // Api compatibility
            res.statusCode = res.status;

            return res;
        });
}

function createResponseError (res) {
    if (res.clientError) return new Error('Invalid request: '
        + res.body && res.body.message
            ? res.body.message
            : res.text);
    if (res.serverError) return new Error('Server error: '
        + res.body && res.body.message
            ? res.body.message
            : res.text);
}