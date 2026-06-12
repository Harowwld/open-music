import YTMusic from 'ytmusic-api';
const ytmusic = new YTMusic();
ytmusic.initialize().then(() => ytmusic.searchSongs('Uptown Funk')).then(res => ytmusic.getUpNexts(res[0].videoId)).then(res => console.log(JSON.stringify(res.slice(0, 3), null, 2))).catch(console.error);
