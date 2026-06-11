const YTMusic = require("ytmusic-api");

async function main() {
  const ytmusic = new YTMusic();
  await ytmusic.initialize();

  // Search for a song
  const songs = await ytmusic.searchSongs("Never Gonna Give You Up");
  const firstSong = songs[0];
  console.log("Song:", firstSong.name, firstSong.videoId);

  try {
    const lyrics = await ytmusic.getLyrics(firstSong.videoId);
    console.log("Lyrics:");
    console.log(lyrics);
  } catch (err) {
    console.error("Error getting lyrics:", err.message);
  }
}

main();
