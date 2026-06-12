async function run() {
  const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent("Thunderclouds LSD")}`;
  const res = await fetch(lrclibUrl, {
    headers: { 'User-Agent': 'AuraMusic/1.0.0 (https://github.com/aura-music)' }
  });
  const data = await res.json();
  console.log(data[0]);
}
run();
