const http = require('http');
const query = require('querystring');

const htmlHandler = require('./htmlResponses.js');
const jsonHandler = require('./jsonResponses.js');
// Called media handler, but is really only handling album cover images.
// Song previews are to be handled by the Apple/iTunes API (whichever it ends up being)
const mediaHandler = require('./mediaResponses.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const parseBody = (request, response, handler) => {
  const body = [];

  request.on('error', (err) => {
    console.dir(err);
    response.statusCode = 400;
    response.end();
  });

  request.on('data', (chunk) => {
    body.push(chunk);
  });

  request.on('end', () => {
    const bodyString = Buffer.concat(body).toString();
    request.body = query.parse(bodyString);
    handler(request, response);
  });
};

const handlePost = (request, response, parsedUrl) => {
  if (parsedUrl.pathname === '/addSong') {
    console.log('Adding song...');
    parseBody(request, response, jsonHandler.addSong);
  } else if (parsedUrl.pathname === '/addRating') {
    console.log('Adding rating...');
    parseBody(request, response, jsonHandler.addRating);
  }
};

const handleGet = (request, response, parsedUrl) => {
  if (parsedUrl.pathname === '/style.css') {
    htmlHandler.getCSS(request, response);
  } else if (parsedUrl.pathname === '/getAlbums') {
    jsonHandler.getAlbums(request, response);
  } else if (parsedUrl.pathname === '/getSongs') {
    jsonHandler.getSongs(request, response);
  } else if (parsedUrl.pathname === '/albumSearch') {
    jsonHandler.albumSearch(request, response);
  } else if (parsedUrl.pathname === '/songSearch') {
    jsonHandler.songSearch(request, response);
  } else if (parsedUrl.pathname === '/getSongFromLyrics') {
    jsonHandler.lyricalSearch(request, response);
  } else if (parsedUrl.pathname === '/getImage') {
    mediaHandler.getImage(request, response, parsedUrl.searchParams.get('image'));
  } else if (parsedUrl.pathname === '/getSongPreview') {
    // Grab the proper params from our URL to get the song preview.
    const songName = parsedUrl.searchParams.get('song');
    const artistName = parsedUrl.searchParams.get('artist');
    mediaHandler.getSongPreview(response, songName, artistName);
  } else {
    htmlHandler.getIndex(request, response);
  }
};

const onRequest = (request, response) => {
  const protocol = request.connection.encrypted ? 'https' : 'http';
  const parsedUrl = new URL(request.url, `${protocol}://${request.headers.host}`);

  // Query taken from parsed URL, used for searches
  request.query = Object.fromEntries(parsedUrl.searchParams);

  if (request.method === 'POST') {
    handlePost(request, response, parsedUrl);
  } else {
    handleGet(request, response, parsedUrl);
  }
};

// Creating server
http.createServer(onRequest).listen(port, () => {
  console.log(`Listening on 127.0.0.1: ${port}`);
});
