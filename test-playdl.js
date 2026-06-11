const play = require('play-dl');

async function main() {
  const stream = await play.stream("https://www.youtube.com/watch?v=lYBUbBu4W08");
  console.log("Stream URL:", stream.url);
}
main().catch(console.error);
