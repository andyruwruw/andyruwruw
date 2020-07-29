# About

Hello! Hope you like the profile page README.md.

100% inpsired by [natemoo-re](https://github.com/natemoo-re). The implementation of generating and inserting functional React components into the markdown is based on his design. I thought what he did was awesome.

I had been working with Spotify's API for a few months and thought what he did was awesome! Read through is code to figure out what he did, and implemented it here.

## How it works

The README.md is made dynamic by creating a back-end that returns images. By linking our `<img>` tags in the README.md to this back-end, each time the page is loaded, a new image is requested.

```
<!-- README.md -->

<img src="https://andyruwruw.vercel.app/api/top-played">
```

From the server, each function requests the data it needs, builds a react component, and returns it as an SVG.

The server is hosted on Vercel. By creating a folder called `api`, each file is treated as an endpoint.

## Making your own

Most important file is [ReadMeImg.tsx](https://github.com/andyruwruw/andyruwruw/blob/0dc9e8286bbdb3cc582b984121f9738fbe6c9f3f/components/ReadMeImg.tsx), which takes any children components and wraps them in `<svg>` and `<foreignObject>` tags. 

Each React component is wrapped in a `<ReadMeImg>`.
```
// Some Component File
import ReadMeImg from '../ReadMeImg';

...

export const ReactComponent: React.FC<Props> = ({}) => {
  return (
    <ReadMeImg
      width="800"
      height="212">
      
    </ReadMeImg>
  );
};
```

We can then use `renderToString` from `react-dom/server` to return the component.

```
// API Endpoint
import { renderToString } from 'react-dom/server';

...

const text = renderToString(
  ReactComponent({ ...props })
);
return res.status(200).send(text);
```

## Images

Another important note, images need to be turned into Buffers and then into a string.
```
// API Endpoint
const buff = await (await fetch(imageURL)).arrayBuffer();
const imageSrc = `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;

// Component
<img src="imageSrc" />
```

## Using the Same APIs

If you're looking to use some of this same code, you'll need a `refresh_token` from Spotify connected to your account, and a registered application.

Create a .env with these fields:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
```

Chess.com's Public Data API does not require any specific authentication.