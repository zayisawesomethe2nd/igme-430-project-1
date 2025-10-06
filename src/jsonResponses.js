const fs = require('fs');

// Using let since the data will be modified.
let lowRoarData = JSON.parse(fs.readFileSync('dataset/low-roar.json', 'utf8'));

// Takes request, response, status code, and object to send 
// returns with a JSON object. 
const respondJSON = (request, response, status, object) => {
    const content = JSON.stringify(object);
    const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(content, 'utf8'),
    };

    response.writeHead(status, headers);

    if(request.method !== 'HEAD') {
        response.write(content);
    }

    response.end();
};

// Gets all album data.
const getAlbums = (request, response) => {
    return respondJSON(request, response, 200, lowRoarData);
};

// Gets all song (track) data.
const getSongs = (request, response) => {
    
};

const notFound = (request, response) => {
    const responseJSON = {
        message: 'The page you are looking for was not found.',
        id: 'notFound',
    };

    respondJSON(request, response, 404, responseJSON);
}

module.exports = {
    getAlbums,
    notFound,
};