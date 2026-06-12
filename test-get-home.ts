import YTMusic from 'ytmusic-api';
const ytmusic = new YTMusic();
ytmusic.initialize().then(() => ytmusic.getHomeSections()).then(res => console.log(JSON.stringify(res[0].contents.slice(0, 2), null, 2)));
