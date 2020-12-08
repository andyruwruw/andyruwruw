import {
  NowRequest,
  NowResponse,
} from '@vercel/node';
import { renderToString } from 'react-dom/server';
import { decode } from 'querystring';

import { Player } from '../src/components/spotify/NowPlaying';
import {
  nowPlaying,
  trackAudioFeatures,
} from '../src/services/spotify';

/**
 * Now Playing
 * Returns an image displaying my current playback state, with nice music bars
 * @param {NowRequest} req Request for Image
 * @param {NowResponse} res Response to request.
 */
export default async function (req: NowRequest, res: NowResponse) {
  // Retrieving top played tracks from spotify.
  const {
    Authorization,
    item = {},
    is_playing: isPlaying = false,
    progress_ms: progress = 0,
  } = await nowPlaying();

  // If the link was clicked, reroute them to the href.
  const params = decode(req.url.split('?')[1]) as any;
  if (params && typeof params.open !== 'undefined') {
    if (item && item.external_urls) {
      res.writeHead(302, {
        Location: item.external_urls.spotify,
      });
      return res.end();
    }
    return res.status(200).end();
  }

  // The music bars are colored based on the songs danceability, energy and happiness
  // And they move to the beat of the song :)
  let audioFeatures = null;
  if (Object.keys(item).length) {
    audioFeatures = await trackAudioFeatures(item.id, Authorization);
  }

  // Hey! I'm returning an image!
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

  // Cleaning up some data
  const { duration_ms: duration, name: track } = item;
  const { images = [] } = item.album || {};

  const cover = images[images.length - 1]?.url;
  let coverImg = null;
  if (cover) {
    const buff = await (await fetch(cover)).arrayBuffer();
    coverImg = `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;
  }

  const artist = (item.artists || []).map(({ name }) => name).join(', ');

  // Generating the component and rendering it
  const text = renderToString(
    Player({ cover: coverImg, artist, track, isPlaying, progress, duration, audioFeatures })
  );
  return res.status(200).send(text);
}