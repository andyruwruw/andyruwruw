import React from 'react';

import ReadMeImg from '../ReadMeImg';
import Text from '../Text';
// import './TopPlayed.css';

export interface Props {
  trackLists: Array<Object>,
}

/**
 * Top Played
 * Displays three lists of tracks.
 * @param trackLists 
 */
export const TopPlayed: React.FC<Props> = ({
  trackLists,
}) => {
  return (
    <ReadMeImg
      width="800"
      height="413">
      <style>
        {`
          @import url(\'/components/spotify/TopPlayed.css\');
        `} 
      </style>
      <div className="top-played-wrapper">
        {trackLists.map((list, term) => (
          <div
            key={term}
            className="top-played-container">
            <Text
              className="title"
              weight="bold"
              size="title"
              color="grey">
              {term === 0 ? 'all time favorites' : term === 1 ? 'monthly favorites' : 'current favorites'}
            </Text>

            {list.map((track, trackIndex) => (
              <a
                key={`${term}-${trackIndex}`}
                className="track"
                href={track.href}>
                <img
                  className="cover"
                  src={track.cover ?? null}
                  width="48"
                  height="48" />
                <div className="details">
                  <Text 
                    className="name"
                    weight="bold">
                    {`${track.track ?? ""} `.trim()}
                  </Text>

                  <Text
                    className="artist"
                    color="grey">
                    {track.artist}
                  </Text>  
                </div>
              </a>
            ))}
          </div>
        ))}
      </div>
    </ReadMeImg>
  );
};