import YTMusic from 'ytmusic-api';

async function test() {
  const ytmusic = new YTMusic();
  await ytmusic.initialize();
  const upNexts = await ytmusic.getUpNexts('dQw4w9WgXcQ');
  console.log('upNexts[0]:', upNexts[0]);
  
  const homeSections = await ytmusic.getHomeSections();
  console.log('homeSections[0].contents[0]:', homeSections[0].contents[0]);
}

test();
