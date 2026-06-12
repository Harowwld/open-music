import YTMusic from 'ytmusic-api';
async function run() {
  const ytmusic = new YTMusic();
  await ytmusic.initialize();
  const results = await ytmusic.searchSongs("Thunderclouds");
  console.log(JSON.stringify(results[0], null, 2));
}
run();
