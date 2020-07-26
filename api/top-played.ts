import { NowRequest, NowResponse } from '@vercel/node';
import { renderToString } from 'react-dom/server';
// import { decode } from 'querystring';
import { TopPlayed } from '../components/spotify/TopPlayed';
import { topPlayed } from '../services/spotify';

export default async function (req: NowRequest, res: NowResponse) {
  const topPlayedTracks = [ await topPlayed('long_term'), await topPlayed('medium_term'), await topPlayed('short_term') ];

  const convertedTracks = await Promise.all(topPlayedTracks.map(async (trackList) => {
    return Promise.all(trackList.map(async (track) => {
      const href = track.external_urls.spotify;
      const artist = (track.artists || []).map(({ name }) => name).join(', ');
      const { images = [] } = track.album || {};
      const url = images[images.length - 1]?.url;
      let cover = null;
      if (url) {
        const buff = await (await fetch(url)).arrayBuffer();
        cover = `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
      }
      return {
        cover,
        artist,
        track: track.name,
        href,
      };
    }));
  }));

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

  const text = renderToString(
    TopPlayed({ trackLists: convertedTracks })
  );
  return res.status(200).send(text);
}