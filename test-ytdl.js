const ytdl = require("@distube/ytdl-core");

async function main() {
  const info = await ytdl.getInfo("lYBUbBu4W08");
  const format = ytdl.chooseFormat(info.formats, { quality: "highestaudio" });
  console.log("Stream URL:", format.url);
}
main().catch(console.error);
