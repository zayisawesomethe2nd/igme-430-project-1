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
    const albums = [];

    for (const album of lowRoarData) {
        albums.push({
        ID: album.ID,
        AlbumTitle: album.AlbumTitle,
        CoverImage: album.CoverImage,
        Released: album.Released,
        Length: album.Length,
        Label: album.Label,
        Description: album.Description,
        YoutubeURL: album.YoutubeURL,
        SpotifyURL: album.SpotifyURL,
        AppleURL: album.AppleURL,
        WikiURL: album.WikiURL,
        });
    }

    return respondJSON(request, response, 200, albums);
};

// Gets all song (track) data.
const getSongs = (request, response) => {
  const songs = [];

  for (const album of lowRoarData) {
    for (const track of album.Tracks) {
        const trackData = {
            CoverImage: album.CoverImage,
            SongName: track.Name,
            Length: track.Length,
            Lyrics: track.Lyrics,
        };

        // IF there is a rating, add it to the song array
        console.log(track.Rating);
        if (track.Rating !== undefined) {
            trackData.Rating = track.Rating;
        }
        songs.push(trackData);

    }
  }

  return respondJSON(request, response, 200, songs);
}

const albumSearch = (request, response) => {
    const { title, year } = request.query;
    if (!title && !year) {
        return respondJSON(request, response, 400, {
            message: 'Title or year search term are required.',
            id: "MissingTitleOrYear",
        });
    }
    const results =[];
    const titleSearchTerm = title.trim().toLowerCase();
    const yearSearchTerm = year.trim();

    for (const album of lowRoarData) {
        let matchesTitle;
        let matchesYear;

        // Check title
        if (titleSearchTerm) {
            matchesTitle = album.AlbumTitle.toLowerCase().includes(titleSearchTerm);
        } else {
            matchesTitle = true; // no title given → ignore title filter
        }

        // Check year
        if (yearSearchTerm) {
            matchesYear = album.Released.toString().includes(yearSearchTerm);
        } else {
            matchesYear = true; // no year given → ignore year filter
        }

        // If both filters pass, add album to results
        if (matchesTitle && matchesYear) {
            results.push({
                ID: album.ID,
                AlbumTitle: album.AlbumTitle,
                CoverImage: album.CoverImage,
                Released: album.Released,
                Length: album.Length,
                Label: album.Label,
                Description: album.Description,
                YoutubeURL: album.YoutubeURL,
                SpotifyURL: album.SpotifyURL,
                AppleURL: album.AppleURL,
                WikiURL: album.WikiURL,
            });
        }
    }

    return respondJSON(request, response, 200, results);
};

const songSearch = (request, response) => {
    const { title, year } = request.query;
    if (!title && !year) {
        return respondJSON(request, response, 400, {
            message: 'Title or year search term are required.',
            id: "MissingTitleOrYear",
        });
    }

    const songs = [];
    const titleSearchTerm = title ? title.trim().toLowerCase() : null;
    const yearSearchTerm = year ? year.trim() : null;

    for (const album of lowRoarData) {
        // Year filter (convert album.Released to string)
        if (yearSearchTerm && !album.Released.toString().includes(yearSearchTerm)) continue;

        for (const track of album.Tracks) {
            if (!track.Name) continue; // skip empty tracks
            if (titleSearchTerm && !track.Name.toLowerCase().includes(titleSearchTerm)) continue;

            const trackData = {
                CoverImage: album.CoverImage,
                SongName: track.Name,
                Length: track.Length,
                Lyrics: track.Lyrics,
            };

            // IF there is a rating, add it to the song array
            console.log(track.Rating);
            if (track.Rating !== undefined) {
                trackData.Rating = track.Rating;
            }
            songs.push(trackData);
            }
    }

    return respondJSON(request, response, 200, songs);
};

// Searches all tracks lyrics for any sign of the inputted lyrics. Then pushes those results
// to our array. This can hold multiple songs, and will return them all.
const lyricalSearch = (request, response) => {
    const { lyrics } = request.query; 
    // If there are no lyrics given by the user, throw error + message
    if (!lyrics) {
        return respondJSON(request, response, 400, {
            message: 'Lyrics search term is required.',
            id: "MissingLyrics",
        });
    }

    const results = [];
    // for more accurate results. track lyrics will get a similar treatment.
    const searchTerm = lyrics.toLowerCase().trim();

    // If a track includes our string, add it to the list of songs.
    for (const album of lowRoarData) {
        for (const track of album.Tracks) {
        if (track.Lyrics && track.Lyrics.toLowerCase().includes(searchTerm)) {
            results.push({
            CoverImage: album.CoverImage,
            SongName: track.Name,
            Length: track.Length,
            Lyrics: track.Lyrics,
            });
        }
        }
    }

    return respondJSON(request, response, 200, results);
};

const addSong = (request, response) => {
    const { title, length } = request.body;

    // Validate inputs
    if (!title || !length) {
        return respondJSON(request, response, 400, {
            message: 'Both title and length are required.',
            id: 'MissingFields',
        });
    }

    // get the unorganizedAlbum data field
    const unorganizedAlbum = lowRoarData.find(album => album.ID === 0);
    if (!unorganizedAlbum) {
        return respondJSON(request, response, 500, {
            message: 'Unorganized album not found in dataset.',
            id: 'InternalServerError',
        });
    }
    
    // No changes are confirmed yet, but we can set the status code to 204 for now
    let responseCode = 204;

    const existingSong = unorganizedAlbum.Tracks.find(
        track => track.Name.toLowerCase() === title.toLowerCase()
    );

    if (!existingSong) {
        // Add new song
        const newSong = {
            Name: title,
            Length: length,
        };
        unorganizedAlbum.Tracks.push(newSong);
        responseCode = 201;
    } else {
        // Update existing song’s length
        existingSong.Length = length;
    }

    // Respond to client
    if (responseCode === 201) {
        return respondJSON(request, response, 201, {
            message: 'Song added successfully.',
            song: { title, length },
        });
    }

    return respondJSON(request, response, 204, {});

};

const addRating = (request, response) => {
    const { title, rating } = request.body;

    // Validate inputs
    if (!title || !rating) {
        return respondJSON(request, response, 400, {
            message: 'Both title and rating are required.',
            id: 'MissingFields',
        });
    }
    
    // No changes are confirmed yet, but we can set the status code to 204 for now
    let foundSong = null;
    
    for (const album of lowRoarData) {
        const song = album.Tracks.find(
            track => track.Name.toLowerCase() === title.toLowerCase()
        );
        if (song) {
            foundSong = song;
            break;
        }
    }

    // If the song wasn’t found in any album
    if (!foundSong) {
        return respondJSON(request, response, 404, {
            message: `Song "${title}" not found in any album.`,
            id: 'SongNotFound',
        });
    }

    // Update or add the rating
    foundSong.Rating = rating;
    console.log(lowRoarData)


    return respondJSON(request, response, 200, {
        message: `Rating for "${foundSong.Name}" updated successfully.`,
        album: foundAlbum.Name,
        song: {
            title: foundSong.Name,
            rating: foundSong.Rating,
        },
    });
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
    getSongs,
    albumSearch,
    songSearch,
    lyricalSearch,
    addSong,
    addRating,
};