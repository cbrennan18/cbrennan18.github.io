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

    if (typeof _token === 'undefined') {
        document.getElementById('blog-description').style.display = 'none';
        document.getElementById('btnSpotify').style.display = 'inline';
    } else {
        document.getElementById('blog-description').style.display = 'inline';
        document.getElementById('btnSpotify').style.display = 'none';
    }

});

function getSpotify() {

    const authEndpoint = 'https://accounts.spotify.com/authorize';

    // Replace with your app's client ID, redirect URI and desired scopes
    const clientId = '54d26b92340c44bdaa4b0f54b09a858f';
    const redirectUri = 'https%3A%2F%2Fcbrennan.ie%2Fspotify.html';
    // const redirectUri = 'http%3A%2F%2Flocalhost%3A8080%2Fcbrennan18.github.io%2Fspotify.html';
    const scopes = [
        'user-read-email',
        'user-read-private',
        'user-top-read',
        'playlist-read-private'
    ];
    const showDialog = 'false';

    // If there is no token, redirect to Spotify authorization
    if (!_token) {
        window.location = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join('%20')}&show_dialog=${showDialog}&response_type=token`;
    }
}

let song_id_dict = new Map();
let artists_dict = new Map();
let genres_dict = new Map();
let audio_dict = new Map();
let final_dict = new Map();

async function showData() {
    document.getElementById('btnLoadData').style.display = 'none';
    document.getElementById('spinner').style.display = 'inline-block';
    document.getElementById('artists-display').style.display = 'none';
    document.getElementById('audio-features').style.display = 'none';

    $(document).unbind('audio_features_complete');
    await getSpotifyPlaylists().done(function(data) {
        getPlaylists(data);
    });
    await getCurrentTracks().done(function(data) {
        let track_ids = [];
        let artist_ids = [];
        let genre_counts = {};
        let i;
        let tracks = data.items;
        for (i = 0; i < tracks.length; i++) {

            track_ids.push(tracks[i].id);
            artist_ids.push(tracks[i].album.artists[0].id);
        }
        song_id_dict.set("2021", track_ids);
        genres_dict.set("2021", getSpotifyArtistIds(artist_ids, genre_counts));
    });
    await getAudioFeatures();
    await $(document).bind('audio_features_complete',
        await getCurrentArtists().done(function() {
            final_dict = {
                'audio_features': new Map([...audio_dict.entries()].sort()),
                'artists': new Map([...artists_dict.entries()].sort()),
                'genres': new Map([...genres_dict.entries()].sort())
            };
        })
    );

    await getCharts(final_dict);
    await getYearlyArtists(final_dict);
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('artists-display').style.display = 'block';
    document.getElementById('audio-features').style.display = 'block';

    await softScrollClickSpotify();
}

function getSpotifyPlaylists() {
    return $.ajax({
        url: "https://api.spotify.com/v1/search?q=%22Your%20Top%20Songs%22&type=playlist&limit=50",
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + _token);
        },
        success: function (data) {
        }
    });
}

async function getYearlyArtists(final_dict) {
     console.log(final_dict);
    let y = [], a = [], top_five = [];
    for (let [year, value] of final_dict.artists.entries()) {
        y.push(year);
        a.push(value);
    }

    for (let i = 0; i < a.length; i++) {
        let values = Object.values(a[i]);
        values.sort((a, b) => parseFloat(b.count) - parseFloat(a.count));
        for (let j = 0; j < values.length; j++) {
            if(values[j].name === "Various Artists") {
                values.splice(j, 1);
            }
        }
        values.length = 5;
        let str1 = "";
        for (let k = 0; k < values.length; k++) {
            str1 = str1.concat(values[k].id);
            str1 += ",";
        }
        str1 = str1.slice(0, -1);
        await getSpotifyArtists(str1).done(function(data) {
            for (let l = 0; l < values.length; l++) {
                if(values[l].name === data.artists[l].name) {
                    Object.assign(values[l], {url: data.artists[l].images[0].url});

                }
            }
        });
        await top_five.push({year: y[i], artist: values});
    }
    $(".spotify-history").empty();

    for (let i = 0; i < top_five.length; i++) {
        let item_name_group = '';
        for (let j = 0; j < top_five[i].artist.length; j++) {
            let rank = j + 1;
            let item_name =
                '<div data-aos="fade-up"' +
                    ' data-aos-delay="50"' +
                    ' data-aos-duration="1000"' +
                    ' data-aos-easing="ease-in-out"' +
                    ' data-aos-anchor-placement="top-bottom">' +
                    '<div class="card card-spotify border-0 mt-3 m-md-3" style="border-radius: 45px;"> ' +
                        '<div class="row "> ' +
                            '<div class="col-5"> ' +
                                '<img src="' + top_five[i].artist[j].url + '" class="crop" style="border-top-left-radius: 45px; border-bottom-left-radius: 45px;" alt="image"/> ' +
                            '</div> ' +
                            '<div class="col-7 px-3"> ' +
                                '<div class="card-block d-flex"> ' +
                                    '<h3 class="float-left card-title mr-3 mr-md-5 pr-5 align-self-center infront" style="font-family: ' + 'Lato' + ',sans-serif">' + top_five[i].artist[j].name + '</h3> ' +
                                    '<h1 class="display-4 behind ml-auto pr-3 mt-3">' + rank + '</h1>' +
                                '</div> ' +
                            '</div> ' +
                        '</div>' +
                    '</div>' +
                '</div>';
            item_name_group += item_name;
        }

        let item1 = $(
            '<section>' +
                '<div class="display-4 text-center normal-bg sticky">' +
                    top_five[i].year +
                '</div> ' +
                '<div class="p-5-xl"> ' +
                    '<span class="artists" style="font-weight: 400; font-size: 40px">' +
                        item_name_group +
                    '</span>' +
                '</div>' +
            '</section>');

        item1.appendTo($('.spotify-history'));
    }


    let $sticky = $('.sticky');
    let $artists = $('.artists');
    let $tasteSticky = $('.taste-sticky');
    let $taste = $('.taste');
    let num = $('#data-display .spotify-history .sticky').length;

    $(window).scroll(function(){

        AOS.init();
        AOS.refresh();
        for (let i = 0; i < num; i++) {
            let rem = parseInt(getComputedStyle(document.documentElement).fontSize);
            if ($sticky.eq(i).offset().top + $sticky.eq(i).outerHeight() > ($artists.eq(i).offset().top) - (8 * rem)) {
                $sticky.eq(i).removeClass('normal-bg');
                $sticky.eq(i).addClass('green-bg');
            } else {
                $sticky.eq(i).removeClass('green-bg');
                $sticky.eq(i).addClass('normal-bg');
            }
        }
        if ($tasteSticky.offset().top + $tasteSticky.outerHeight() > ($taste.offset().top)) {
            $tasteSticky.removeClass('normal-bg');
            $tasteSticky.addClass('green-bg');
        } else {
            $tasteSticky.removeClass('green-bg');
            $tasteSticky.addClass('normal-bg');
        }
    });

    getYearlyGenres(top_five, final_dict);

}

function getYearlyGenres(top_five, final_dict) {
    let y = [], a = [];
    for (let [year, value] of final_dict.genres.entries()) {
        y.push(year);
        a.push(value.genre_counts);
    }

    for (let i = 0; i < a.length; i++) {
        let obj = a[i];

        // Get an array of the keys:
        let keys = Object.keys(obj);
        // Then sort by using the keys to lookup the values in the original object:
        keys.sort(function(a, b) { return obj[b] - obj[a] });

        keys.length = 5;
        top_five[i].genres = keys;
    }

    getYearlyFeatures(top_five, final_dict);


}

function getYearlyFeatures(top_five, final_dict) {

    let y = [], a = [];
    for (let [year, value] of final_dict.audio_features.entries()) {
        y.push(year);
        a.push(value);
    }

    for (let i = 0; i < a.length; i++) {
        let values = Object.values(a[i]);
        for (let j = 0; j < values.length; j++) {
            values[j] = Math.round(values[j] * 100);
        }

        top_five[i].features = values;
    }

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
    // original averages
    // acousticness_average = 0.1672, energy_average = 0.6739, danceability_average = 0.6585, valence_average = 0.4991;

    let acousticness_average = ['0.1660', '0.1588', '0.1660', '0.1278', '0.2174', '0.2558'];
    let danceability_average = ['0.6366', '0.6333', '0.6537', '0.6720', '0.6971', '0.7174'];
    let energy_average = ['0.7034', '0.6724', '0.6917', '0.6547', '0.6474', '0.6098'];
    let valence_average = ['0.5253', '0.4515', '0.5228', '0.4877', '0.5081', '0.5562'];


    populateChart('acousticChart', y, a, 'rgb(29,185,84)', 'rgba(29,185,84,0.5)', 'Acousticness', acousticness_average);
    populateChart('danceChart', y, d, 'rgb(0,155,137)',  'rgba(0,155,137,0.5)', 'Danceability', danceability_average);
    populateChart('energyChart', y, e, 'rgb(0,120,173)', 'rgba(0,120,173,0.5)', 'Energy', energy_average);
    populateChart('valenceChart', y, v, 'rgb(0,80,169)', 'rgba(0,80,169, 0.5)', 'Valence', valence_average);
}

function populateChart(element, labels, data, color, bgColor, title, average) {
    let ctx = document.getElementById(element).getContext('2d');
    let chart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',

        // The data for our dataset
        data: {
            labels: labels,
            datasets: [
                {
                    label: title,
                    borderColor: color,
                    pointBackgroundColor: color,
                    data: data,
                    backgroundColor: bgColor
                },
                {
                    label: 'Global Users Average',
                    borderColor: 'rgba(0,0,0,0.5)',
                    pointBackgroundColor: 'rgb(0,0,0, 0.5)',
                    data: average
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    boxWidth: 10
                }
            },
            title: {
                display: true,
                text: title,
                fontSize: 24,
                fontFamily: 'Roboto-Light, sans-serif'
            },
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Percentage'
                    },
                    ticks: {
                        callback: function(value) {
                            let percentage = (value * 100).toFixed(0);
                            return percentage + "%"
                        }
                    }
                }],
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Year'
                    }
                }]
            },
            tooltips : {
                mode : 'index',
                position: 'nearest'
            },
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
    console.log(playlist_ids);

    let i;

    for (i = 0; i < playlist_ids.length; i++) {

        let track_ids = [];
        let artist_ids = [];
        let genre_counts = {};
        let artist_counts = {};

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
                            artist_counts[artist_name] =  {"name": artist_name, "count": 1, "id": tracks[i].album.artists[0].id};

                        } else {
                            artist_counts[artist_name].count += 1;
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

   return {genre_counts};
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
    try {
        let i, j = 0;
        for (i = 0; i < data.artists.length; i++) {
            if (data.artists[i].genres != null) {
                for (j = 0; j < data.artists[i].genres.length; j++) {
                    let genre = toTitleCase(data.artists[i].genres[j]);
                    if (genre !== 'pop') {
                        getGenre(genre_counts, genre);
                    } else {
                        getGenre(genre_counts, 'Pop');
                    }
                }
            }
        }
    } catch(e) {
        console.log(e);
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
            let artist_counts = {};
            for (i = 0; i < data.items.length; i++) {
                let artist = data.items[i].name;
                artist_counts[artist] = {"name": artist, "count": 10-i,"id": data.items[i].id};
                artists_dict.set("2021", artist_counts);
            }
        }
    });

}

async function getAudioFeatures() {

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

        await audioFeaturesRequest(songstr).done(function (data) {
            try {
                let i;
                for (i = 0; i < 50; i++) {
                    if (data.audio_features[i].danceability != null) {
                        count += 1;
                        danceability_sum += data.audio_features[i].danceability;
                        valence_sum += data.audio_features[i].valence;
                        energy_sum += data.audio_features[i].energy;
                        acousticness_sum += data.audio_features[i].acousticness;
                    } else {

                    }
                }
                if(songstr2.length > 1) {
                    audioFeaturesRequest(songstr2).done(function (data) {
                        let i;
                        for (i = 0; i < 50; i++) {
                            if (data.audio_features[i].danceability != null) {
                                count += 1;
                                danceability_sum += data.audio_features[i].danceability;
                                valence_sum += data.audio_features[i].valence;
                                energy_sum += data.audio_features[i].energy;
                                acousticness_sum += data.audio_features[i].acousticness;
                            }
                        }
                    });
                }
                audioFeatures = {'danceability':danceability_sum/count,'valence':valence_sum/count,'energy':energy_sum/count,'acousticness':acousticness_sum/count};
                audio_dict.set(year, audioFeatures);
            } catch(e) {
                console.log(e);
            }
        });
    }
    await $(document).trigger('audio_features_complete');
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

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}


function softScrollClickSpotify() {
    $('html, body').animate({
        scrollTop: $("#scroll-icon").offset().top
    }, 100);
    softScroll();
}


