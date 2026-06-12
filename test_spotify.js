const spotifyUrlInfo = require('spotify-url-info');
const { getTracks } = spotifyUrlInfo(fetch);

async function run() {
  const tracks = await getTracks("https://open.spotify.com/album/42Q4vIqC1ySrn5gKOfmGZq"); // Just some Spotify URL
  console.log(JSON.stringify(tracks[0], null, 2));
}
run();
