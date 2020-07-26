import React from 'react';

import ReadMeImg from '../ReadMeImg';
import Text from '../Text';

export interface Props {
  cover?: string;
  track: string;
  artist: string;
  progress: number;
  duration: number;
  isPlaying: boolean;
  audioFeatures: Object;
}

/**
 * Player
 * Displays currently playing track.
 * @param trackLists 
 */
export const Player: React.FC<Props> = ({
  cover,
  track,
  artist,
  progress,
  duration,
  isPlaying,
  audioFeatures,
}) => {
  return (
    <ReadMeImg
      width="466"
      height="125">
      <style>
        {`
          @import url(\'/components/spotify/NowPlaying.css\');

          .bar {
            background: rgba(${audioFeatures ? audioFeatures.energy * 255 : 255}, ${audioFeatures ? audioFeatures.valence * 255 : 255}, ${audioFeatures ? audioFeatures.danceability * 255 : 255}, .7);
            animation: bars ${audioFeatures ? (audioFeatures.tempo / 60) * 1 : 1}s ease calc(var(--offset) * -.5s) infinite;
          }

          #progress {
            animation: progress ${duration}ms linear;
            animation-delay: -${progress}ms;
          }
        `}
      </style>
      <Text
        id="title"
        weight="bold"
        size="title">
        currently jamming to
      </Text>
      <div className="now-playing-wrapper">
        {track && <div className="bar-container left">
            {[0, 1, 2].map((bar) => (
              <div className="bar"
                key={`left-bar-${bar}`}
                style={{
                  '--offset': bar,
                }}/>
            ))}
          </div>
        }

        <div
          className={isPlaying ? "disabled" : ""}
          style={{
            display: "flex",
            alignItems: "center",
            paddingTop: 8,
            paddingLeft: 4,
            background: "rgb(0,0,0,.01)",
            borderRadius: ".3rem",
            margin: ".5rem 0",
            padding: ".5rem",
            border: "1px solid rgb(0,0,0,.1)",
          }}>
          <img
            id="cover"
            src={cover ?? null}
            width="48"
            height="48" />

          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              marginTop: -4,
              marginLeft: 8,
            }}>
            <Text
              id="track"
              weight="bold">
              {`${track ?? ""} `.trim()}
            </Text>

            <Text
              id="artist"
              color={!track ? "gray" : undefined}>
              {artist || "Nothing Currently :)"}
            </Text>
            {track && (
              <div className="progress-bar">
                <div
                  id="progress"
                  className={!isPlaying ? "paused" : ""} />
              </div>
            )}
          </div>
        </div>

        {track && <div className="bar-container right">
            {[0, 1, 2].map((bar) => (
              <div className="bar"
                key={`right-bar-${bar}`}
                style={{
                  '--offset': bar,
                }}/>
            ))}
          </div>
        }
      </div>
    </ReadMeImg>
  );
};