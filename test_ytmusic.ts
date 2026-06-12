import YTMusic from 'ytmusic-api';

async function test() {
  const ytmusic = new YTMusic();
  await ytmusic.initialize();
  const results = await ytmusic.searchSongs("Alone Again The Weeknd");
  console.log(JSON.stringify(results[0], null, 2));
}
test();
