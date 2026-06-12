const spotifyUrlInfo = require('spotify-url-info');
const { getTracks, getData } = spotifyUrlInfo(fetch);

async function test() {
  const url = 'https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj';
  try {
    const tracks = await getTracks(url);
    console.log(JSON.stringify(tracks[0], null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
