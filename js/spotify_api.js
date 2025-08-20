// ---- Config ----
const CLIENT_ID = '54d26b92340c44bdaa4b0f54b09a858f'; // your app id
const SCOPES = ['user-read-email','user-read-private','user-top-read','playlist-read-private'];
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';

// computed so it works both locally and on cbrennan.ie
const REDIRECT_URI = encodeURIComponent(`${window.location.origin}/spotify.html`);

// ---- State ----
let ACCESS_TOKEN = null;

// Year-keyed maps
const songIdMap   = new Map(); // year -> [trackIds]
const artistsMap  = new Map(); // year -> { artistName: {name,count,id} }
const genresMap   = new Map(); // year -> { genre_counts: {genre:count} }
const audioMap    = new Map(); // year -> { danceability,valence,energy,acousticness }

// ---- DOM helpers ----
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const show = el => el && (el.style.display = 'block');
const hide = el => el && (el.style.display = 'none');

// ---- Token parsing / UI gate ----
document.addEventListener('DOMContentLoaded', () => {
  // Parse fragment for token (implicit grant)
  const hash = window.location.hash.replace(/^#/, '');
  const params = Object.fromEntries(new URLSearchParams(hash));
  if (params.access_token) {
    ACCESS_TOKEN = params.access_token;
    // Clear fragment for cleaner URL
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  // Toggle sections
  if (ACCESS_TOKEN) {
    show($('#blog-description'));
    hide($('#btnSpotify'));
  } else {
    hide($('#blog-description'));
    show($('#btnSpotify'));
  }

  // Buttons
  $('#btnConnect')?.addEventListener('click', startSpotifyAuth);
  $('#btnLoadData')?.addEventListener('click', showData);
});

// ---- Auth ----
function startSpotifyAuth() {
  if (ACCESS_TOKEN) return;
  const url = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES.join('%20')}&response_type=token&show_dialog=false`;
  window.location.assign(url);
}

// ---- Fetch wrapper ----
async function sFetch(url) {
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    cache: 'no-store'
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} for ${url}: ${text}`);
  }
  return res.json();
}

// ---- Core flow ----
async function showData() {
  hide($('#btnLoadData'));
  show($('#spinner'));
  hide($('#artists-display'));
  hide($('#audio-features'));

  try {
    // 1) Find "Your Top Songs {YEAR}" playlists made by Spotify
    const playlists = await searchTopSongsPlaylists();

    // 2) For each playlist: get tracks (IDs) + artist IDs + year
    await Promise.all(playlists.map(processPlaylist));

    // 3) Also add "current" snapshot (top tracks & artists)
    const currentYear = String(new Date().getFullYear());
    await addCurrentSnapshot(currentYear);

    // 4) Compute audio features per year (avg)
    await computeAudioFeatures();

    // 5) Build charts + yearly artist sections
    const final_dict = {
      audio_features: new Map([...audioMap.entries()].sort()),
      artists:        new Map([...artistsMap.entries()].sort()),
      genres:         new Map([...genresMap.entries()].sort())
    };

    buildCharts(final_dict);
    await buildYearlyArtists(final_dict);

    // 6) Reveal sections
    hide($('#spinner'));
    show($('#artists-display'));
    show($('#audio-features'));

    // smooth scroll to headline
    const target = $('#scroll-icon');
    if (target) {
      window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 20, behavior: 'smooth' });
    }

  } catch (err) {
    console.error('Spotify render error:', err);
    hide($('#spinner'));
    show($('#btnLoadData'));
    alert('Sorry, there was a problem fetching your Spotify data. Try reconnecting and reloading.');
  }
}

// ---- Spotify API helpers ----
async function searchTopSongsPlaylists() {
  // The search API is limited; we’ll fetch 50 results and filter by owner + name prefix
  const data = await sFetch('https://api.spotify.com/v1/search?q=%22Your%20Top%20Songs%22&type=playlist&limit=50');
  const items = data?.playlists?.items || [];
  return items.filter(p => {
    const ownerOk = p?.owner?.external_urls?.spotify === 'https://open.spotify.com/user/spotify';
    const nameOk  = typeof p?.name === 'string' && p.name.startsWith('Your Top Songs');
    return ownerOk && nameOk;
  });
}

async function processPlaylist(playlist) {
  const playlistId = (playlist?.uri || '').split(':').pop();
  if (!playlistId) return;

  const details = await sFetch(`https://api.spotify.com/v1/playlists/${playlistId}`);
  const year = (details?.name || '').split(' ').pop();
  if (!/^\d{4}$/.test(year)) return;

  const items = details?.tracks?.items || [];
  const trackIds = [];
  const artistIds = [];
  const artistCounts = {};

  for (const it of items) {
    const track = it?.track;
    if (!track) continue;
    const tId = track.id;
    const a = track.album?.artists?.[0];
    if (tId) trackIds.push(tId);
    if (a?.id) artistIds.push(a.id);

    const artistName = a?.name;
    if (artistName) {
      if (!artistCounts[artistName]) {
        artistCounts[artistName] = { name: artistName, count: 1, id: a.id || '' };
      } else {
        artistCounts[artistName].count += 1;
      }
    }
  }

  songIdMap.set(year, trackIds);
  artistsMap.set(year, artistCounts);

  // genres for the year (via artists endpoint)
  const genreCounts = await getGenreCountsForArtists(artistIds);
  genresMap.set(year, { genre_counts: genreCounts });
}

async function addCurrentSnapshot(yearLabel) {
  // top tracks -> ids
  const topTracks = await sFetch('https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=50&offset=0');
  const tItems = topTracks?.items || [];
  const curTrackIds = [];
  const curArtistIds = [];
  for (const t of tItems) {
    if (t?.id) curTrackIds.push(t.id);
    const a = t?.album?.artists?.[0];
    if (a?.id) curArtistIds.push(a.id);
  }
  songIdMap.set(yearLabel, curTrackIds);

  // top artists -> counts 10..6 for top 5 (like old code)
  const topArtists = await sFetch('https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=5&offset=0');
  const aItems = topArtists?.items || [];
  const artistCounts = {};
  aItems.forEach((a, i) => {
    if (!a?.name) return;
    artistCounts[a.name] = { name: a.name, count: 10 - i, id: a.id || '' };
  });
  artistsMap.set(yearLabel, artistCounts);

  const genreCounts = await getGenreCountsForArtists(curArtistIds);
  genresMap.set(yearLabel, { genre_counts: genreCounts });
}

async function getGenreCountsForArtists(artistIds) {
  const counts = {};
  const chunks = chunk(artistIds, 50);

  for (const ids of chunks) {
    if (!ids.length) continue;
    const data = await sFetch('https://api.spotify.com/v1/artists?ids=' + ids.join(','));
    for (const art of data?.artists || []) {
      for (const g of (art?.genres || [])) {
        const genre = toTitleCase(g === 'pop' ? 'Pop' : g);
        counts[genre] = (counts[genre] || 0) + 1;
      }
    }
  }
  return counts;
}

async function computeAudioFeatures() {
  for (const [year, trackIds] of songIdMap.entries()) {
    if (!trackIds?.length) continue;
    let sum = { danceability:0, valence:0, energy:0, acousticness:0 }, n = 0;
    const chunks = chunk(trackIds, 100);

    for (const ids of chunks) {
      const data = await sFetch('https://api.spotify.com/v1/audio-features/?ids=' + ids.join(','));
      for (const f of data?.audio_features || []) {
        if (!f || f.danceability == null) continue;
        sum.danceability += +f.danceability;
        sum.valence      += +f.valence;
        sum.energy       += +f.energy;
        sum.acousticness += +f.acousticness;
        n++;
      }
    }
    if (n > 0) {
      audioMap.set(year, {
        danceability: sum.danceability / n,
        valence:      sum.valence / n,
        energy:       sum.energy / n,
        acousticness: sum.acousticness / n
      });
    }
  }
}

// ---- Rendering ----
function buildCharts(final_dict) {
  const years = [];
  const acoustic = [], dance = [], energy = [], valence = [];

  for (const [y, v] of final_dict.audio_features.entries()) {
    years.push(y);
    acoustic.push(+v.acousticness.toFixed(4));
    dance.push(+v.danceability.toFixed(4));
    energy.push(+v.energy.toFixed(4));
    valence.push(+v.valence.toFixed(4));
  }

  // Averages from your original code (strings)
  const acousticAvg = ['0.1660','0.1588','0.1660','0.1278','0.2174','0.2558','0.2486','0.2358'];
  const danceAvg    = ['0.6366','0.6333','0.6537','0.6720','0.6971','0.7174','0.6899','0.6884'];
  const energyAvg   = ['0.7034','0.6724','0.6917','0.6547','0.6474','0.6098','0.6334','0.6728'];
  const valenceAvg  = ['0.5253','0.4515','0.5228','0.4877','0.5081','0.5562','0.5147','0.4914'];

  makeLine('acousticChart', years, acoustic, 'rgb(29,185,84)',  'rgba(29,185,84,0.5)', 'Acousticness', acousticAvg);
  makeLine('danceChart',    years, dance,    'rgb(0,155,137)',  'rgba(0,155,137,0.5)', 'Danceability', danceAvg);
  makeLine('energyChart',   years, energy,   'rgb(0,120,173)',  'rgba(0,120,173,0.5)', 'Energy',       energyAvg);
  makeLine('valenceChart',  years, valence,  'rgb(0,80,169)',   'rgba(0,80,169,0.5)',  'Valence',      valenceAvg);
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

async function buildYearlyArtists(final_dict) {
  // Build top 5 artists per year (with images)
  const container = $('.spotify-history');
  if (!container) return;
  container.innerHTML = '';

  const yearEntries = [...final_dict.artists.entries()];
  for (const [year, artistsObj] of yearEntries) {
    // sort by count desc
    const arr = Object.values(artistsObj || {}).sort((a,b) => b.count - a.count);
    // remove "Various Artists"
    const filtered = arr.filter(x => x.name !== 'Various Artists').slice(0,5);

    // fetch images for these artists
    const ids = filtered.map(x => x.id).filter(Boolean);
    if (ids.length) {
      const chunks = chunk(ids, 50);
      const imagesById = {};
      for (const c of chunks) {
        const data = await sFetch('https://api.spotify.com/v1/artists?ids=' + c.join(','));
        for (const a of data?.artists || []) {
          imagesById[a.id] = a?.images?.[0]?.url || '';
        }
      }
      filtered.forEach(x => x.url = imagesById[x.id] || '');
    }

    // render cards row
    const cards = filtered.map((a, idx) => {
      const rank = idx + 1;
      return `
        <div data-aos="fade-up" data-aos-delay="50" data-aos-duration="1000" data-aos-easing="ease-in-out" data-aos-anchor-placement="top-bottom">
          <div class="card card-spotify border-0 mt-3 m-md-3" style="border-radius:45px;">
            <div class="row g-0">
              <div class="col-5">
                <img src="${a.url || './img/music.jpg'}" class="img-fluid" style="object-fit:cover;height:100%;width:100%;border-top-left-radius:45px;border-bottom-left-radius:45px" alt="${a.name}" />
              </div>
              <div class="col-7 px-3">
                <div class="card-body d-flex">
                  <h3 class="card-title me-4 align-self-center" style="font-family:Lato,sans-serif">${a.name}</h3>
                  <h1 class="display-4 ms-auto pe-3 mt-3">${rank}</h1>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    const section = document.createElement('section');
    section.innerHTML = `
      <div class="display-4 text-center normal-bg sticky">${year}</div>
      <div class="p-5-xl">
        <div class="artists" style="font-weight:400;font-size:40px">${cards}</div>
      </div>
    `;
    container.appendChild(section);
  }

  // Sticky color swap on scroll (approximate your original)
  const stickies = $$('.sticky');
  const artistBlocks = $$('.artists');
  const tasteSticky = $('.taste-sticky');
  const taste = $('.taste');

  function onScroll() {
    if (window.AOS) { AOS.refreshHard?.(); AOS.refresh(); }
    const rem = parseInt(getComputedStyle(document.documentElement).fontSize, 10) || 16;
    for (let i = 0; i < stickies.length; i++) {
      const s = stickies[i], a = artistBlocks[i];
      if (!s || !a) continue;
      const sRect = s.getBoundingClientRect();
      const aRect = a.getBoundingClientRect();
      const trigger = aRect.top - (8 * rem);
      const sBottom = sRect.top + sRect.height;
      if (sBottom > trigger) {
        s.classList.remove('normal-bg'); s.classList.add('green-bg');
      } else {
        s.classList.remove('green-bg'); s.classList.add('normal-bg');
      }
    }
    if (tasteSticky && taste) {
      const ts = tasteSticky.getBoundingClientRect();
      const t  = taste.getBoundingClientRect();
      if (ts.top + ts.height > t.top) {
        tasteSticky.classList.remove('normal-bg'); tasteSticky.classList.add('green-bg');
      } else {
        tasteSticky.classList.remove('green-bg'); tasteSticky.classList.add('normal-bg');
      }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---- Utils ----
function toTitleCase(str='') {
  return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
}
function chunk(arr=[], size=50) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}