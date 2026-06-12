const trackName = "Never Gonna Give You Up";
const artistName = "Rick Astley";

async function test() {
  const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data.slice(0, 1), null, 2));
}
test();
