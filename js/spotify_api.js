let _token;
document.addEventListener("DOMContentLoaded", function() {
    // Get the hash of the url
    const hash = window.location.hash
        .substring(1)
        .split('&')
        .reduce(function (initial, item) {
            if (item) {
                const parts = item.split('=');
                initial[parts[0]] = decodeURIComponent(parts[1]);
            }
            return initial;
        }, {});

    window.location.hash = '';

    // Set token
    _token = hash.access_token;

    document.getElementById('spotifyArtists').style.display = 'none';
    document.getElementById('spotifyTracks').style.display = 'none';

    if (typeof _token === 'undefined') {
        document.getElementById('btnSpotifyArtists').style.display = 'none';
        document.getElementById('btnSpotifyTracks').style.display = 'none';
        document.getElementById('btnSpotify').style.display = 'inline';
    } else {
        document.getElementById('btnSpotifyArtists').style.display = 'inline';
        document.getElementById('btnSpotifyTracks').style.display = 'inline';
        document.getElementById('btnSpotify').style.display = 'none';
    }

});

function getSpotify() {

    const authEndpoint = 'https://accounts.spotify.com/authorize';

    // Replace with your app's client ID, redirect URI and desired scopes
    const clientId = '54d26b92340c44bdaa4b0f54b09a858f';
    const redirectUri = 'https%3A%2F%2Fcbrennan18.github.io%2Fspotify.html';
    const scopes = [
        'user-read-email',
        'user-read-private',
        'user-top-read',
        'playlist-read-private'
    ];
    // TODO change dialog
    const showDialog = 'false';

    // If there is no token, redirect to Spotify authorization
    if (!_token) {
        window.location = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join('%20')}&show_dialog=${showDialog}&response_type=token`;
    }
}

function getMySpotifyArtists() {
    $.ajax({
        url: "https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=10",
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + _token);
        },
        success: function (data){
            $("#top-artists").empty();
            // Do something with the returned data
            let i = 0;
            data.items.map(function (artist) {
                i += 1;
                let item = $('<div class="card mb-3 border-0" style="border-radius: 45px;">' +
                    '<div class="row no-gutters">' +
                        '<div class="col-5 col-md-4">' +
                            '<img src="' + artist.images[0].url + '" class="card-img-top" style="border-top-left-radius: 45px; border-bottom-left-radius: 45px;" alt="image"/>' +
                        '</div>' +
                        '<div class="col-7 col-md-8">' +
                            '<div class="card-body my-auto">' +
                                '<div class="row">' +
                                    '<h5 class="text-left card-title text-truncate px-2 px-md-4" style="font-family: ' + 'Roboto Light' + ',sans-serif">' + artist.name + '</h5>' +
                                '</div>' +
                                '<div class="row">' +
                                    '<div class="col-5 px-2 col-md-4 px-md-4">' +
                                        '<h1 class="display-4">' + i + '</h1>' +
                                    '</div>' +
                                    '<div class="col-7 px-2 col-md-8 px-md-4">' +
                                        '<p class="text-secondary my-1" style="font-family: ' + 'Roboto Light' + ',sans-serif;">' + toTitleCase(artist.genres[1]) + '</p>' +
                                        '<p class="text-secondary my-1" style="font-family: ' + 'Roboto Light' + ',sans-serif;">Popularity: ' + numberWithCommas(artist.popularity) + '</p>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div></div>');
                item.appendTo($('#top-artists'));
                buttonChanges('btnSpotifyArtists', 'btnSpotifyTracks');
                document.getElementById('spotifyArtists').style.display = 'inline';
                document.getElementById('spotifyTracks').style.display = 'none';
            });
        }
    });
}

function getMySpotifyTracks() {
    $.ajax({
        url: "https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=10",
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + _token);
        },
        success: function (data){
            $("#top-tracks").empty();
            // Do something with the returned data
            let i = 0;
            data.items.map(function (track) {
                i += 1;
                let item = $('<div class="card mb-3 border-0" style="border-radius: 45px;">' +
                    '<div class="row no-gutters">' +
                        '<div class="col-5 col-md-4">' +
                            '<img src="' + track.album.images[0].url + '" class="card-img-top" style="border-top-left-radius: 45px; border-bottom-left-radius: 45px;" alt="image"/>' +
                        '</div>' +
                        '<div class="col-7 col-md-8">' +
                            '<div class="card-body my-auto">' +
                                '<div class="row">' +
                                    '<h5 class="text-left card-title text-truncate px-2 px-md-4" style="font-family: ' + 'Roboto Light' + ',sans-serif">' + track.name + '</h5>' +
                                '</div>' +
                                '<div class="row">' +
                                    '<div class="col-5 px-2 col-md-4 px-md-4">' +
                                        '<h1 class="display-4">' + i + '</h1>' +
                                    '</div>' +
                                    '<div class="col-7 px-2 col-md-8 px-md-4">' +
                                        '<p class="text-secondary my-1" style="font-family: ' + 'Roboto Light' + ',sans-serif;">Length: ' + getTime(track.duration_ms) + '</p>' +
                                        '<p class="text-secondary my-1" style="font-family: ' + 'Roboto Light' + ',sans-serif;">Popularity: ' + numberWithCommas(track.popularity) + '</p>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div></div>');
                item.appendTo($('#top-tracks'));
                buttonChanges('btnSpotifyTracks', 'btnSpotifyArtists');
                document.getElementById('spotifyTracks').style.display = 'inline';
                document.getElementById('spotifyArtists').style.display = 'none';
            });
        }
    });
}

let song_id_dict = new Map();
let artists_dict = new Map();
let genres_dict = new Map();
let audio_dict = new Map();
let final_dict = new Map();

function getSpotifyPlaylists() {
    $.ajax({
        url: "https://api.spotify.com/v1/search?q=%22Your%20Top%20Songs%22&type=playlist&limit=50",
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + _token);
        },
        success: function (data) {
            getPlaylists(data);
            getCurrentTracks().done(async function(a) {
                let track_ids = [];
                let artist_ids = [];
                let genre_counts = [];
                let i;
                let tracks = a.items;
                for (i = 0; i < tracks.length; i++) {

                    track_ids.push(tracks[i].id);
                    artist_ids.push(tracks[i].album.artists[0].id);
                }
                song_id_dict.set("2020", track_ids);
                genres_dict.set("2020", getSpotifyArtistIds(artist_ids, genre_counts));
                await getAudioFeatures();
                await getCurrentArtists();
                final_dict = {
                    'audio_features': new Map([...audio_dict.entries()].sort()),
                    'artists': new Map([...artists_dict.entries()].sort()),
                    'genres': new Map([...genres_dict.entries()].sort())
                };
                await getCharts(final_dict);
            });
        }
    });
}
function getCharts(final_dict) {
    let y = [], a = [], d = [], e=[], v=[];
    for (let [year, value] of final_dict.audio_features.entries()) {
        y.push(year);
        a.push(value.acousticness.toFixed(4));
        d.push(value.danceability.toFixed(4));
        e.push(value.energy.toFixed(4));
        v.push(value.valence.toFixed(4));
    }
    // colors
    // #1db954
    // #009b89
    // #0078ad
    // #0050a9
    // #0b1d78
    let valence_average = 0.5059, energy_average = 0.6121, danceability_average = 0.5746, acousticness_average = 0.2204;

    populateChart('acousticChart', y, a, '#1db954', 'Acousticness', acousticness_average);
    populateChart('danceChart', y, d, '#009b89', 'Danceability', danceability_average);
    populateChart('energyChart', y, e, '#0078ad', 'Energy', energy_average);
    populateChart('valenceChart', y, v, '#0050a9', 'Valence', valence_average);
}

function populateChart(element, labels, data, color, title, average) {
    let ctx = document.getElementById(element).getContext('2d');
    let chart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',

        // The data for our dataset
        data: {
            labels: labels,
            datasets: [{
                label: title,
                borderColor: color,
                pointBackgroundColor: color,
                data: data
            }]
        },

        // Configuration options go here
        options: {
            annotation: {
                annotations: [{
                    type: 'line',
                    mode: 'horizontal',
                    scaleID: 'y-axis-0',
                    value: average,
                    borderColor: 'rgb(0, 0, 0)',
                    borderWidth: 2,
                    borderDash: [2, 2],
                    label: {
                        enabled: true,
                        content: 'Global Average',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        fontColor: "#fff",
                        xPadding: 6,
                        yPadding: 6,
                        cornerRadius: 6,
                        position: "center",
                    }
                }]
            }
        }
    });
}

function getPlaylists(data) {

    data = data.playlists;
    let playlist_ids = [];
    data.items.map(function (playlist) {
        if (playlist.owner.external_urls.spotify === "https://open.spotify.com/user/spotify") {
            playlist_ids.push(playlist.uri);
        }
    });

    let i;

    for (i = 0; i < playlist_ids.length; i++) {

        let track_ids = [];
        let artist_ids = [];
        let genre_counts = [];
        let artist_counts = [];

        try {
            let url = "https://api.spotify.com/v1/playlists/" + playlist_ids[i].split(":").pop();
            let tracks = [];
            let year = "";
            $.ajax({
                url: url,
                type: "GET",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + _token);
                },
                success: function (data) {
                    year = data.name.split(" ").pop();
                    let i;
                    for (i = 0; i < data.tracks.items.length; i++) {
                        tracks.push(data.tracks.items[i].track);
                        track_ids.push(tracks[i].id);
                        artist_ids.push(tracks[i].album.artists[0].id);

                        let artist_name = tracks[i].album.artists[0].name;
                        if (!artist_counts[artist_name] || artist_counts[artist_name] < 1) {
                            artist_counts[artist_name] = 1;
                        } else {
                            artist_counts[artist_name] += 1;
                        }
                    }
                    song_id_dict.set(year, track_ids);
                    artists_dict.set(year, artist_counts);
                    genres_dict.set(year, getSpotifyArtistIds(artist_ids, genre_counts));
                }

            });
        }
        catch(err) {
            console.log(err.message);
        }
    }
    return([song_id_dict, artists_dict, genres_dict]);
}

function getSpotifyArtistIds(artist_ids, genre_counts) {

    let artist_ids_str = "";
    let artist_ids_str_2 = "";
    let i;

    for (i = 0; i < 50; i++) {
        artist_ids_str = artist_ids_str.concat(artist_ids[i]);
        artist_ids_str += ",";
    }
    for (i = 50; i < artist_ids.length; i++) {
        artist_ids_str_2 = artist_ids_str_2.concat(artist_ids[i]);
        artist_ids_str_2 += ",";
    }

    artist_ids_str = artist_ids_str.slice(0, -1);
    artist_ids_str_2 = artist_ids_str_2.slice(0, -1);

   getSpotifyArtists(artist_ids_str).done(function(data) {
       getGenreCounts(data, genre_counts);
   });

   if (artist_ids_str_2 !== "") {
       getSpotifyArtists(artist_ids_str_2).done(function (data) {
           getGenreCounts(data, genre_counts);
       });
   }

   return genre_counts;
}

function getSpotifyArtists(str1) {

    return $.ajax({
        url: "https://api.spotify.com/v1/artists?ids=" + str1,
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + _token);
        },
        success: function (data) {

        }
    });
}

function getGenreCounts(data, genre_counts) {
    let i, j = 0;
    for (i = 0; i < data.artists.length; i++) {
        for (j = 0; j < data.artists[i].genres.length; j++) {
            let genre = data.artists[i].genres[j];
            if (genre !== 'pop') {
                getGenre(genre_counts, genre);
            } else {
                getGenre(genre_counts, 'Pop');
            }
        }
    }
    return genre_counts;
}

function getGenre(genre_counts, genre) {
    if (!genre_counts[genre] || genre_counts[genre] < 1) {
        genre_counts[genre] = 1;
    } else {
        genre_counts[genre] += 1;
    }
}

function getCurrentTracks() {
    return $.ajax({
        url: "https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=50&offset=0",
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + _token);
        },
        success: function (data) {
        }
    });
}

function getCurrentArtists() {

    return $.ajax({
        url: "https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=5&offset=0",
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + _token);
        },
        success: function (data) {
            let i;
            let artist_counts = [];
            for (i = 0; i < data.items.length; i++) {
                let artist = data.items[i].name;
                artist_counts[artist] = 10-i;
                artists_dict.set("2020", artist_counts);
            }
        }
    });

}

function getAudioFeatures() {

    let audioFeatures;
    for (const [year, value] of song_id_dict.entries()) {

        let danceability_sum = 0, valence_sum = 0, energy_sum = 0, acousticness_sum = 0, count = 0;
        let songstr = "", songstr2 = "";
        let i;
        for (i = 0; i < 50; i++) {
            try {
                songstr += value[i];
                songstr += ",";
            } catch (e) {
                console.log(e);
            }
        }
        if (value.length > 50) {
            for (i = 0; i < 50; i++) {
                try {
                    songstr2 += value[i + 50];
                    songstr2 += ",";
                } catch (e) {
                    console.log(e);
                }
            }
        }

        songstr = songstr.slice(0, -1);
        songstr2 = songstr2.slice(0, -1);

        audioFeaturesRequest(songstr).done(function (data) {
            let i;
            for (i = 0; i < 50; i++) {
                count += 1;
                danceability_sum += data.audio_features[i].danceability;
                valence_sum += data.audio_features[i].valence;
                energy_sum += data.audio_features[i].energy;
                acousticness_sum += data.audio_features[i].acousticness;
            }
            if(songstr2.length > 1) {
                audioFeaturesRequest(songstr2).done(function (data) {
                    let i;
                    for (i = 0; i < 50; i++) {
                        count += 1;
                        danceability_sum += data.audio_features[i].danceability;
                        valence_sum += data.audio_features[i].valence;
                        energy_sum += data.audio_features[i].energy;
                        acousticness_sum += data.audio_features[i].acousticness;
                    }
                });
            }
            audioFeatures = {'danceability':danceability_sum/count,'valence':valence_sum/count,'energy':energy_sum/count,'acousticness':acousticness_sum/count};
            audio_dict.set(year, audioFeatures);
        });
    }
    return(audio_dict);
}

function audioFeaturesRequest(str) {
    return $.ajax({
        url: "https://api.spotify.com/v1/audio-features/?ids=" + str,
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + _token);
        },
        success: function (data) {
        }
    });
}

function buttonChanges(button1, button2) {

    let var1 = document.getElementById(button1);
    let var2 = document.getElementById(button2);

    var1.classList.add("btn-success");
    var1.classList.remove("btn-outline-success");
    var2.classList.remove("btn-success");
    var2.classList.add("btn-outline-success");
    var1.setAttribute("disabled", "disabled");
    var2.removeAttribute("disabled");

}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function getTime(time) {
    time = time/1000;
    let minutes = Math.round(Math.floor(time / 60));
    let seconds = Math.round(time % 60);

    if (minutes < 10 && seconds < 10) {
        return "0" + minutes + ":0" + seconds
    } else if (minutes < 10) {
        return "0" + minutes + ":" + seconds
    } else if (seconds < 10) {
        return minutes + ":0" + seconds
    } else {
        return minutes + ":" + seconds
    }

}


