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
          className={isPlaying ? 'disabled' : ''}
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingTop: 8,
            paddingLeft: 4,
            background: 'rgb(255,255,255,.8)',
            borderRadius: '.3rem',
            margin: '.5rem 0',
            padding: '.6rem',
            border: '1px solid rgba(125, 125, 125, .3)',
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
              color={!track ? "gray" : undefined}
              size="small">
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

      <style>
        {`
          .now-playing-wrapper {
            display: flex;
            justify-content: center;
            mix-blend-mode: difference;
          }
          
          p {
            display: block;
            opacity: 0;
          }
          
          img:not([src]) {
            content: url("data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==");
            border-radius: 6px;
            background: #FFF;
            border: 1px solid #e1e4e8;
            mix-blend-mode: normal;
          }
          
          .progress-bar,
          #track,
          #artist,
          #cover,
          #title {
            opacity: 0;
            animation: appear 300ms ease-out forwards;
          }
          
          #track,
          #artist {
            width: 170px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          #title {
            animation-delay: 0ms;
            text-align: center;
            margin: .5rem;
          }
          
          #track {
            animation-delay: 400ms;
          }
          
          #artist {
            animation-delay: 500ms;
          }
          
          #cover {
            animation-name: cover-appear;
            animation-delay: 300ms;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 3px 10px rgba(0,0,0,0.05);
          }
          
          #cover:not([src]) {
            box-shadow: none;
          }
          
          .bar-container {
            width: 111px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .bar-container.right {
            align-items: flex-start;
          }
          
          .bar-container.left {
            align-items: flex-end;
          }
          
          .bar {
            --offset: 0;
            height: 10px;
            width: 50px;
            margin: 2px 0;
            background: rgba(${audioFeatures ? audioFeatures.energy * 255 : 255}, ${audioFeatures ? audioFeatures.valence * 255 : 255}, ${audioFeatures ? audioFeatures.danceability * 255 : 255}, .7);
            animation: bars ${audioFeatures ? (audioFeatures.tempo / 60) * 1 : 1}s ease calc(var(--offset) * -.5s) infinite;
          }
          
          .progress-bar {
            position: relative;
            width: 100%;
            height: 4px;
            margin: -1px;
            border: 1px solid #e1e4e8;
            border-radius: 4px;
            overflow: hidden;
            padding: 2px;
            z-index: 0;
            animation-delay: 550ms;
            margin-top: 4px;
          }
          
          #progress {
            position: absolute;
            top: -1px;
            left: 0;
            width: 100%;
            height: 6px;
            transform-origin: left center;
            background-color: #24292e;
            animation: progress ${duration}ms linear;
            animation-delay: -${progress}ms;
          }
          
          .paused { 
            animation-play-state: paused !important;
            background: #e1e4e8 !important;
          }
          
          @keyframes cover-appear {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          @keyframes appear {
            from {
              opacity: 0;
              transform: translateX(-8px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes progress {
            from {
              transform: scaleX(0)
            }
            to {
              transform: scaleX(1)
            }
          }
          
          @keyframes bars {
            0% {
              width: 25%;
            }
            50% {
              width: 90%;
            }
            100% {
              width: 25%;
            }
          }
        `}
      </style>
    </ReadMeImg>
  );
};