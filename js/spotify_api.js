// Config
const CLIENT_ID = '54d26b92340c44bdaa4b0f54b09a858f';
const SCOPES = ['user-read-email', 'user-read-private', 'user-top-read', 'playlist-read-private'];
const REDIRECT_URI = `${window.location.origin}/spotify.html`;

// State
let ACCESS_TOKEN = localStorage.getItem('spotify_access_token');
const yearData = new Map(); // year -> { trackIds, artists, audioFeatures, artistImages }

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Check for authorization code in URL (PKCE callback)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    history.replaceState(null, '', window.location.pathname);
    await exchangeCodeForToken(code);
  }

  updateUI();
  document.getElementById('btnConnect')?.addEventListener('click', startSpotifyAuth);
  document.getElementById('btnLoadData')?.addEventListener('click', showData);
});

function updateUI() {
  const btnSpotify = document.getElementById('btnSpotify');
  const blogDescription = document.getElementById('blog-description');

  if (ACCESS_TOKEN) {
    btnSpotify.style.display = 'none';
    blogDescription.style.display = 'block';
  } else {
    btnSpotify.style.display = 'block';
    blogDescription.style.display = 'none';
  }
}

// PKCE helpers
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Spotify OAuth PKCE flow
async function startSpotifyAuth() {
  if (ACCESS_TOKEN) return;

  const codeVerifier = generateRandomString(64);
  localStorage.setItem('spotify_code_verifier', codeVerifier);

  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  });

  window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

async function exchangeCodeForToken(code) {
  const codeVerifier = localStorage.getItem('spotify_code_verifier');
  if (!codeVerifier) return;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier
    })
  });

  if (response.ok) {
    const data = await response.json();
    ACCESS_TOKEN = data.access_token;
    localStorage.setItem('spotify_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
  }
  localStorage.removeItem('spotify_code_verifier');
}

// Spotify API fetch wrapper with token refresh
async function spotifyFetch(url) {
  let response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
  });

  // If token expired, try refreshing
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
      });
    }
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return response.json();
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return false;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (response.ok) {
    const data = await response.json();
    ACCESS_TOKEN = data.access_token;
    localStorage.setItem('spotify_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
    return true;
  }

  // Refresh failed - clear tokens and force re-auth
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  ACCESS_TOKEN = null;
  return false;
}

// Main data loading flow
async function showData() {
  const btnLoadData = document.getElementById('btnLoadData');
  const spinner = document.getElementById('spinner');
  const artistsDisplay = document.getElementById('artists-display');
  const audioFeatures = document.getElementById('audio-features');

  btnLoadData.style.display = 'none';
  spinner.style.display = 'block';
  artistsDisplay.style.display = 'none';
  audioFeatures.style.display = 'none';

  try {
    const playlists = await searchTopSongsPlaylists();
    await Promise.all(playlists.map(processPlaylist));

    const currentYear = String(new Date().getFullYear());
    await addCurrentSnapshot(currentYear);

    const sortedYears = Array.from(yearData.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    buildCharts(sortedYears);
    buildYearlyArtists(sortedYears);

    spinner.style.display = 'none';
    artistsDisplay.style.display = 'block';
    audioFeatures.style.display = 'block';

    const scrollTarget = document.getElementById('scroll-icon');
    if (scrollTarget) {
      window.scrollTo({
        top: scrollTarget.getBoundingClientRect().top + window.pageYOffset - 20,
        behavior: 'smooth'
      });
    }

  } catch (err) {
    console.error('Error loading Spotify data:', err);
    spinner.style.display = 'none';
    btnLoadData.style.display = 'block';
    alert('Sorry, there was a problem fetching your Spotify data. Try reconnecting and reloading.');
  }
}

// Spotify API helpers
async function searchTopSongsPlaylists() {
  const data = await spotifyFetch('https://api.spotify.com/v1/search?q=%22Your%20Top%20Songs%22&type=playlist&limit=50');
  const items = data?.playlists?.items || [];
  return items.filter(p => {
    const ownerOk = p?.owner?.external_urls?.spotify === 'https://open.spotify.com/user/spotify';
    const nameOk = typeof p?.name === 'string' && p.name.startsWith('Your Top Songs');
    return ownerOk && nameOk;
  });
}

async function processPlaylist(playlist) {
  const playlistId = (playlist?.uri || '').split(':').pop();
  if (!playlistId) return;

  const details = await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}`);
  const year = (details?.name || '').split(' ').pop();
  if (!/^\d{4}$/.test(year)) return;

  const items = details?.tracks?.items || [];
  const trackIds = [];
  const uniqueArtistIds = new Set();
  const artistCounts = {};

  for (const it of items) {
    const track = it?.track;
    if (!track) continue;

    if (track.id) trackIds.push(track.id);

    const artist = track.album?.artists?.[0];
    if (artist?.id) {
      uniqueArtistIds.add(artist.id);
      if (artist.name) {
        if (!artistCounts[artist.name]) {
          artistCounts[artist.name] = { name: artist.name, count: 1, id: artist.id };
        } else {
          artistCounts[artist.name].count += 1;
        }
      }
    }
  }

  // Batch fetch: audio features + artist details (genres & images) in parallel
  const [audioData, artistsData] = await Promise.all([
    fetchAudioFeatures(trackIds),
    fetchArtistDetails(Array.from(uniqueArtistIds))
  ]);

  yearData.set(year, {
    trackIds,
    artists: artistCounts,
    audioFeatures: audioData,
    artistImages: extractImages(artistsData)
  });
}

async function addCurrentSnapshot(yearLabel) {
  const [topTracks, topArtists] = await Promise.all([
    spotifyFetch('https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=50&offset=0'),
    spotifyFetch('https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=5&offset=0')
  ]);

  const trackItems = topTracks?.items || [];
  const trackIds = [];
  const uniqueArtistIds = new Set();

  for (const track of trackItems) {
    if (track?.id) trackIds.push(track.id);
    const artist = track?.album?.artists?.[0];
    if (artist?.id) uniqueArtistIds.add(artist.id);
  }

  const artistCounts = {};
  const artistImages = {};

  // Top artists response includes images - extract them directly
  (topArtists?.items || []).forEach((artist, i) => {
    if (artist?.name) {
      artistCounts[artist.name] = { name: artist.name, count: 10 - i, id: artist.id || '' };
      if (artist.id) {
        uniqueArtistIds.add(artist.id);
        if (artist.images?.[0]?.url) {
          artistImages[artist.id] = artist.images[0].url;
        }
      }
    }
  });

  const [audioData, artistsData] = await Promise.all([
    fetchAudioFeatures(trackIds),
    fetchArtistDetails(Array.from(uniqueArtistIds))
  ]);

  // Merge images from artist details with images from top artists
  const allImages = { ...extractImages(artistsData), ...artistImages };

  yearData.set(yearLabel, {
    trackIds,
    artists: artistCounts,
    audioFeatures: audioData,
    artistImages: allImages
  });
}

// Batch fetch artist details (genres + images)
async function fetchArtistDetails(artistIds) {
  if (!artistIds.length) return [];

  const allArtists = [];
  const chunks = chunk(artistIds, 50);

  for (const ids of chunks) {
    const data = await spotifyFetch('https://api.spotify.com/v1/artists?ids=' + ids.join(','));
    allArtists.push(...(data?.artists || []));
  }

  return allArtists;
}

// Batch fetch and compute audio features
async function fetchAudioFeatures(trackIds) {
  if (!trackIds.length) return { danceability: 0, valence: 0, energy: 0, acousticness: 0 };

  let sum = { danceability: 0, valence: 0, energy: 0, acousticness: 0 };
  let count = 0;
  const chunks = chunk(trackIds, 100);

  for (const ids of chunks) {
    const data = await spotifyFetch('https://api.spotify.com/v1/audio-features/?ids=' + ids.join(','));
    for (const feature of data?.audio_features || []) {
      if (!feature || feature.danceability == null) continue;
      sum.danceability += feature.danceability;
      sum.valence += feature.valence;
      sum.energy += feature.energy;
      sum.acousticness += feature.acousticness;
      count++;
    }
  }

  return count > 0 ? {
    danceability: sum.danceability / count,
    valence: sum.valence / count,
    energy: sum.energy / count,
    acousticness: sum.acousticness / count
  } : sum;
}

function extractImages(artists) {
  const images = {};
  for (const artist of artists) {
    if (artist?.id && artist?.images?.[0]?.url) {
      images[artist.id] = artist.images[0].url;
    }
  }
  return images;
}

// Global Spotify averages by year (source: Spotify aggregate data)
const GLOBAL_AVERAGES_BY_YEAR = {
  '2017': { acousticness: 0.1660, danceability: 0.6366, energy: 0.7034, valence: 0.5253 },
  '2018': { acousticness: 0.1588, danceability: 0.6333, energy: 0.6724, valence: 0.4515 },
  '2019': { acousticness: 0.1660, danceability: 0.6537, energy: 0.6917, valence: 0.5228 },
  '2020': { acousticness: 0.1278, danceability: 0.6720, energy: 0.6547, valence: 0.4877 },
  '2021': { acousticness: 0.2174, danceability: 0.6971, energy: 0.6474, valence: 0.5081 },
  '2022': { acousticness: 0.2558, danceability: 0.7174, energy: 0.6098, valence: 0.5562 },
  '2023': { acousticness: 0.2486, danceability: 0.6899, energy: 0.6334, valence: 0.5147 },
  '2024': { acousticness: 0.2358, danceability: 0.6884, energy: 0.6728, valence: 0.4914 },
  '2025': { acousticness: 0.2320, danceability: 0.6850, energy: 0.6680, valence: 0.4950 }
};

// Fallback average for years without data
const DEFAULT_AVERAGE = { acousticness: 0.20, danceability: 0.68, energy: 0.66, valence: 0.50 };

// Rendering
function buildCharts(sortedYears) {
  const years = [];
  const acoustic = [], dance = [], energy = [], valence = [];
  const acousticAvg = [], danceAvg = [], energyAvg = [], valenceAvg = [];

  for (const [year, data] of sortedYears) {
    const features = data.audioFeatures;
    const globalAvg = GLOBAL_AVERAGES_BY_YEAR[year] || DEFAULT_AVERAGE;

    years.push(year);
    acoustic.push(+features.acousticness.toFixed(4));
    dance.push(+features.danceability.toFixed(4));
    energy.push(+features.energy.toFixed(4));
    valence.push(+features.valence.toFixed(4));

    acousticAvg.push(globalAvg.acousticness);
    danceAvg.push(globalAvg.danceability);
    energyAvg.push(globalAvg.energy);
    valenceAvg.push(globalAvg.valence);
  }

  makeLine('acousticChart', years, acoustic, 'rgb(29,185,84)', 'rgba(29,185,84,0.5)', 'Acousticness', acousticAvg);
  makeLine('danceChart', years, dance, 'rgb(0,155,137)', 'rgba(0,155,137,0.5)', 'Danceability', danceAvg);
  makeLine('energyChart', years, energy, 'rgb(0,120,173)', 'rgba(0,120,173,0.5)', 'Energy', energyAvg);
  makeLine('valenceChart', years, valence, 'rgb(0,80,169)', 'rgba(0,80,169,0.5)', 'Valence', valenceAvg);
}

function makeLine(canvasId, labels, data, color, bg, title, avg) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  const ctx = el.getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: title, borderColor: color, pointBackgroundColor: color, data, backgroundColor: bg },
        { label: 'Global Users Average', borderColor: 'rgba(0,0,0,0.5)', pointBackgroundColor: 'rgba(0,0,0,0.5)', data: avg }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 10 } },
      title: { display: true, text: title, fontSize: 24, fontFamily: 'Roboto-Light, sans-serif' },
      scales: {
        yAxes: [{
          scaleLabel: { display: true, labelString: 'Percentage' },
          ticks: {
            callback: (v) => (v * 100).toFixed(0) + '%'
          }
        }],
        xAxes: [{ scaleLabel: { display: true, labelString: 'Year' } }]
      },
      tooltips: { mode: 'index', position: 'nearest' }
    }
  });
}

function buildYearlyArtists(sortedYears) {
  const container = document.querySelector('.spotify-history');
  if (!container) return;
  container.innerHTML = '';

  for (const [year, data] of sortedYears) {
    const topArtists = Object.values(data.artists || {})
      .filter(x => x.name !== 'Various Artists')
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Use cached images from the initial fetch
    topArtists.forEach(artist => {
      artist.url = data.artistImages[artist.id] || '';
    });

    const cards = topArtists.map((a, idx) => `
      <div data-aos="fade-up" data-aos-delay="50" data-aos-duration="1000" data-aos-easing="ease-in-out" data-aos-anchor-placement="top-bottom">
        <div class="card card-spotify border-0 mt-3 m-md-3" style="border-radius:45px;">
          <div class="row g-0">
            <div class="col-5">
              <img src="${a.url || './img/music.jpg'}" class="img-fluid" style="object-fit:cover;height:100%;width:100%;border-top-left-radius:45px;border-bottom-left-radius:45px" alt="${a.name}" />
            </div>
            <div class="col-7 px-3">
              <div class="card-body d-flex">
                <h3 class="card-title me-4 align-self-center" style="font-family:Lato,sans-serif">${a.name}</h3>
                <h1 class="display-4 ms-auto pe-3 mt-3">${idx + 1}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>`).join('');

    const section = document.createElement('section');
    section.innerHTML = `
      <div class="display-4 text-center normal-bg sticky">${year}</div>
      <div class="p-5-xl">
        <div class="artists" style="font-weight:400;font-size:40px">${cards}</div>
      </div>
    `;
    container.appendChild(section);
  }

  setupStickyScrollEffect();
}

// Track scroll handler to prevent duplicates
let scrollHandler = null;

function setupStickyScrollEffect() {
  // Remove previous handler if exists (prevents accumulation on re-load)
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
  }

  const stickies = Array.from(document.querySelectorAll('.sticky'));
  const artistBlocks = Array.from(document.querySelectorAll('.artists'));
  const tasteSticky = document.querySelector('.taste-sticky');
  const taste = document.querySelector('.taste');
  const rem = parseInt(getComputedStyle(document.documentElement).fontSize, 10) || 16;

  scrollHandler = function onScroll() {
    stickies.forEach((sticky, i) => {
      const artistBlock = artistBlocks[i];
      if (!sticky || !artistBlock) return;

      const stickyRect = sticky.getBoundingClientRect();
      const artistRect = artistBlock.getBoundingClientRect();
      const trigger = artistRect.top - (8 * rem);

      if (stickyRect.top + stickyRect.height > trigger) {
        sticky.classList.replace('normal-bg', 'green-bg');
      } else {
        sticky.classList.replace('green-bg', 'normal-bg');
      }
    });

    if (tasteSticky && taste) {
      const tsRect = tasteSticky.getBoundingClientRect();
      const tRect = taste.getBoundingClientRect();
      if (tsRect.top + tsRect.height > tRect.top) {
        tasteSticky.classList.replace('normal-bg', 'green-bg');
      } else {
        tasteSticky.classList.replace('green-bg', 'normal-bg');
      }
    }
  };

  window.addEventListener('scroll', scrollHandler, { passive: true });
  scrollHandler();

  // Refresh AOS once after DOM updates (not on every scroll)
  if (window.AOS) {
    AOS.refresh();
  }
}

// Utility functions
function chunk(arr = [], size = 50) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}