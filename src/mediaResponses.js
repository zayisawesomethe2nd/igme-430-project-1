const fs = require('fs');
const https = require('https'); // to access itunes search api, which is https

// Return an image to the server.
const respondImage = (request, response, status, image) => {
  const headers = {
    'Content-Type': 'image/png',
    'Content-Length': image.length,
  };
  response.writeHead(status, headers);
  if (request.method !== 'HEAD') {
    response.write(image);
  }
  response.end();
};

// Retrieves an image to give to the client. Takes in an imageName only,
// since we know where all images are stored.
// THIS SUCKED TO DO!!!! just a btw.
const getImage = (request, response, imageName) => {
  if (imageName !== '') { // since we have an unorganized album
    const imagePath = `${__dirname}/../client/images/${imageName}`;
    const image = fs.readFileSync(imagePath);
    respondImage(request, response, 200, image);
  } else {
    const imagePath = `${__dirname}/../client/images/low-roar.png`;
    const image = fs.readFileSync(imagePath);
    respondImage(request, response, 200, image);
  }
};

// THE FUN PART!!! Retrieving the actual song preview so that it can played by the client.
// Uses iTunes Search API: https://performance-partners.apple.com/search-api
// Basically everyone uses express or something to access external API's, but I did find this:
// https://nodejs.org/api/https.html#httpsgeturl-options-callback
const getSongPreview = (response, songName, artistName) => {
  // need to build the url to get appropriate songs.
  const searchURL = `https://itunes.apple.com/search?term=${songName} ${artistName}&entity=song&limit=50`;


  https.get(searchURL, (res) => {
    let data = '';
    // so this is when we get a response- we add the d to the d-ata
    res.on('data', (d) => {
      data += d;
    });
    // when the data is grabbed, let us parse it.
    res.on('end', () => {
      // parse data from JSON.
      data = JSON.parse(data);
      // lets find the song name and artist (both are important for getting the URL)
      const song = data.results.find(
        (track) => track.trackName.toLowerCase() === songName.toLowerCase()
        && track.artistName.toLowerCase() === artistName.toLowerCase(),
      );
      // if the song exists, take it!
      if (song) {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ previewUrl: song.previewUrl }));
      } else { // if not, then write that it was not located.
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Preview not found' }));
      }
    });
  });
  // All in all, it was much simpler than expected with the right documentation.
  // Probably should have been in jsonResponses, though, oops.
};

module.exports = {
  getImage,
  getSongPreview,
};
