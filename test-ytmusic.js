const YTMusic = require("ytmusic-api");

async function main() {
  const ytmusic = new YTMusic();
  await ytmusic.initialize();
  const results = await ytmusic.searchSongs("Rick Astley");
  console.log(JSON.stringify(results.slice(0, 2), null, 2));
}
main().catch(console.error);
