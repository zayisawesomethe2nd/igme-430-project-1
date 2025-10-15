// https://stackoverflow.com/questions/19253753/javascript-find-json-value

const fs = require('fs');

const lowRoarData = JSON.parse(fs.readFileSync('dataset/low-roar.json', 'utf8'));


// Takes request, response, status code, and object to send 
// returns with a JSON object. 
const respondJSON = (request, response, status, object) => {
    const content = JSON.stringify(object);
    const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(content, 'utf8'), // gives the BYTE length of the content
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
    
    // Goes through the dataset to grab all album objects with all of their associated data
    for (const album of lowRoarData) {
        albums.push({
            ID: album.ID,
            AlbumTitle: album.AlbumTitle,
            AlbumArtist: album.AlbumArtist,
            CoverImage: `/getImage?image=${album.CoverImage}`,
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

    // First, enter an album, and then get the tracks from that album. This is a nested for loop
    // to get all tracks from all albums. Also gets the cover image from the associated track album.
    for (const album of lowRoarData) {
        for (const track of album.Tracks) {
            const trackData = {
                CoverImage: `/getImage?image=${album.CoverImage}`,
                SongName: track.Name,
                Length: track.Length,
                Lyrics: track.Lyrics,
            };

            // IF there is a rating, add it to the song array
            if (track.Rating !== undefined) {
                trackData.Rating = track.Rating;
            }
            // If there is no track artist, use album artist
            if (!track.TrackArtist) {
                trackData.Artist = album.AlbumArtist;
            }
            songs.push(trackData);

        }
    }

    return respondJSON(request, response, 200, songs);
}

// Uses title and year inputs from the user to search for the appropriate album. Neither is necessary
// for a search to go through.
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
        let matchesTitle; // both are booleans for checking if our title is found
        let matchesYear;

        // Check title
        if (titleSearchTerm) {
            matchesTitle = album.AlbumTitle.toLowerCase().includes(titleSearchTerm);
        } else {
            matchesTitle = true;  // If not given, ignore this basically
        }

        // Check year 
        if (yearSearchTerm) {
            matchesYear = album.Released.toString().includes(yearSearchTerm);
        } else {
            matchesYear = true;
        }
        // If we have a matching title and year, add the album to our results. Can return multiple albums.
        if (matchesTitle && matchesYear) {
            results.push({
                ID: album.ID,
                AlbumTitle: album.AlbumTitle,
                AlbumArtist: album.AlbumArtist,
                CoverImage: `/getImage?image=${album.CoverImage}`,
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

// Uses a song title and album year to find an appropriate song. 
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
        if (yearSearchTerm && !album.Released.toString().includes(yearSearchTerm)) continue;

        for (const track of album.Tracks) {
            if (!track.Name) continue; 
            if (titleSearchTerm && !track.Name.toLowerCase().includes(titleSearchTerm)) continue;

            const trackData = {
                CoverImage: `/getImage?image=${album.CoverImage}`,
                SongName: track.Name,
                Length: track.Length,
                Lyrics: track.Lyrics,
            };

            // IF there is a rating, add it to the song array
            if (track.Rating !== undefined) {
                trackData.Rating = track.Rating;
            }
            // If there is no track artist, use album artist
            if (!track.TrackArtist) {
                trackData.Artist = album.AlbumArtist;
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
            CoverImage: `/getImage?image=${album.CoverImage}`,
            SongName: track.Name,
            Length: track.Length,
            Lyrics: track.Lyrics,
            });
        }
        }
    }

    return respondJSON(request, response, 200, results);
};

// Adds a song to the specified album, with the specified data.
const addSong = (request, response) => {
    const { title, length, album} = request.body;

    // Validate inputs
    if (!title || !length) {
        return respondJSON(request, response, 400, {
            message: 'Title and length fields are required.',
            id: 'MissingFields',
        });
    }

    //Locating the album
    let targetAlbum;
    if (album) {
        targetAlbum = lowRoarData.find(a => a.AlbumTitle.toLowerCase() === album.toLowerCase());
    }

    // get the unorganizedAlbum data field. only done if no album is given.
    if (!targetAlbum) {
        targetAlbum = lowRoarData.find(a => a.ID === 0);
        if (!targetAlbum) {
            return respondJSON(request, response, 500, {
                message: 'Unorganized album not found in dataset.',
                id: 'InternalServerError',
            });
        }
    }

    
    // No changes are confirmed yet, but we can set the status code to 204 for now
    let responseCode = 204;

    // Checking if the song already exists, so we can replace some of the data in it.
    // Will cause lyrics to be deleted.
    const existingSong = targetAlbum.Tracks.find(
        track => track.Name.toLowerCase() === title.toLowerCase()
    );

    if (!existingSong) {
        // Add new song
        const newSong = {
            Name: title,
            Length: length,
            Lyrics: '',
        };
        targetAlbum.Tracks.push(newSong);
        const responseJSON = {
            message: 'Song added successfully.',
            id: 'SongAdded',
        }; 
        return respondJSON(request, response, 201, responseJSON);
    } else {
        existingSong.Length = length;
        existingSong.Lyrics = '';
        return respondJSON(request, response, 204, {});
    }

};

// Adds rating data to an track object.
const addRating = (request, response) => {
    const { title, rating } = request.body;
    console.log("help")

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


    return respondJSON(request, response, 200, {
        message: `Rating for "${foundSong.Name}" updated successfully.`,
        song: {
            title: foundSong.Name,
            rating: foundSong.Rating,
        },
    });
};




// For when a link does not exist.
const notFound = (request, response) => {
    const responseJSON = {
        message: 'The page you are looking for was not found.',
        id: 'notFound',
    };

    respondJSON(request, response, 404, responseJSON);
}

module.exports = {
    getAlbums,
    getSongs,
    albumSearch,
    songSearch,
    lyricalSearch,
    addSong,
    addRating,
    notFound,
};