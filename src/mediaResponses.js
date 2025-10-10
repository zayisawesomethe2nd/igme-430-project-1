const fs = require('fs');


const getImage = (request, response, status) => {
    const headers = {
        'Content-Type': 'images/png',
        'Content-Length': Buffer.byteLength(content, 'utf8'),
    };
    response.writeHead(status, headers);
    if(request.method !== 'HEAD') {
        response.write(content);
    }
  response.end();
};

module.exports.getImage = getImage;
