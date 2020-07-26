import { NowRequest, NowResponse } from '@vercel/node';
import { renderToString } from 'react-dom/server';

import { TopPlayed } from '../components/spotify/TopPlayed';
import { topPlayed } from '../services/spotify';

/**
 * Top Played
 * Returns an image displaying top 5 played tracks for 3 various time ranges.
 * @param {NowRequest} req Request for Image
 * @param {NowResponse} res Response to request.
 */
export default async function (req: NowRequest, res: NowResponse) {
  // Retrieving top played tracks from spotify.
  const topPlayedTracks = [
    await topPlayed('long_term'),
    await topPlayed('medium_term'),
    await topPlayed('short_term')
  ];

  // There's a lot of data we don't need!
  // Here we run Array.map on the 3 lists to get the objects to what we need.
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
  
  // Hey! I'm returning an image!
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

  // Generating the component and rendering it
  const text = renderToString(
    TopPlayed({ trackLists: convertedTracks })
  );
  return res.status(200).send(text);
}