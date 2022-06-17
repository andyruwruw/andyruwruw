# How It Works

Hope you like the profile page README.md.

100% inpsired by [natemoo-re](https://github.com/natemoo-re). The implementation of generating and inserting functional React components into the markdown is based on his design. I thought what he did was awesome.

I had been working with [Spotify's API](https://developer.spotify.com/documentation/web-api/) for a year and thought what he did was awesome! Read through is code to figure out what he did, and implemented it here.

# The Magic

The README.md is made dynamic by creating a back-end API that returns images. By linking our `<img>` tags in the README.md to this back-end, each time the page is loaded, a new image is requested.

```
<!-- README.md -->

<img src="https://andyruwruw.vercel.app/api/top-played">
```

From the server, each function requests the data it needs, builds a react component, and returns it as an SVG.

The server is hosted on [Vercel](https://vercel.com/). By creating a folder called `api`, each file is [treated as an endpoint](https://vercel.com/docs/serverless-functions/introduction).

# Making your own

Most important file is [ConvertSVG.tsx](https://github.com/andyruwruw/andyruwruw/blob/master/components/ConvertSVG.tsx), which takes any children components and wraps them in `<svg>` and `<foreignObject>` tags. 

Each React component is wrapped in a `<ConvertSVG>`.
```
// Some Component File
import ConvertSVG from '../ConvertSVG';

...

export const ReactComponent: React.FC<Props> = ({}) => {
  return (
    <ConvertSVG
      width="800"
      height="212">
      
    </ConvertSVG>
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

# Image Buffers

Another important note, images need to be turned into Buffers and then into a string.
```
// API Endpoint
const buff = await (await fetch(imageURL)).arrayBuffer();
const imageSrc = `data:image/jpeg;base64,${Buffer.from(buff).toString('base64')}`;

// Component
<img src="imageSrc" />
```

# Using Spotify API

If you're looking to use some of this same code, you'll need a `refresh_token` from Spotify connected to your account, and a registered application.

More on getting that refresh token [here](https://developer.spotify.com/documentation/general/guides/authorization-guide/).

I made and endpoint to easily allow you to retrieve your refresh token. Simply clone this repository and register an application with [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/login).

Once you have that, create a `.env` in this repository's root directory ([example](https://github.com/andyruwruw/andyruwruw/blob/master/.env.example)) with these fields:

```
# Spotify Application
SPOTIFY_CLIENT_ID=<your spotify application client id here>
SPOTIFY_CLIENT_SECRET=<your spotify application client secret here>
```

Go to the repository in your console and run the following:

```
$ npm install

$ npm run start
```

Once it's ready, go to *http://localhost:3000/api/login* on a browser, and the API will request a refresh token through your registered application and give it back to you.

You can then take that refresh token and place it in your `.env`.

```
# Spotify User
SPOTIFY_REFRESH_TOKEN=<your token here>
```

All the Spotify endpoints will then work for you!

# Using Chess.com's API

[Chess.com's Public Data API](https://www.chess.com/news/view/published-data-api) does not require any specific authentication.

You'll have to tell the API what your username is by adding it to the `.env`.

```
# Chess.com
CHESS_COM_USERNAME=<chess.com username>
```

Shameless plug, I wrote a little wrapper for their API here: [chess-web-api](https://www.npmjs.com/package/chess-web-api).

# Dark Mode

There were some complications with dark mode.

Some sources say the solution is to utilize Github's `dark-color-mode` property like so:

```
html[data-color-mode='dark'] {
  --text-color-normal: hsl(210, 10%, 62%);
}
```

Sadly, IT DOESN'T WORK with my SVG images.

Best solution is to pick colors that work for dark and light modes, making it arguably look worse for light mode, but at least be viewable for dark mode.

I'll post any updates on this issue [here](https://github.com/andyruwruw/andyruwruw/issues/3), and an official Github issue is posted [here](https://github.community/t/support-theme-context-for-images-in-light-vs-dark-mode/147981).

# Mock Data

This profile README has been awesome and I've loved having it up, however having my Spotify current listening public to all 24/7 and requirement to keep chess games going to have it show anything has become a burden. I added a `.env` variable that informs the server to use mock data instead. So from now on, the data displayed is outdated mock data and serves as more a proof of concept than a legitemate display of my Spotify and Chess.com data.

This is done by setting the following `.env` variable to `true`.

```
# Inside .env
MOCK_DATA=true
```

Any other value besides true will tell the server to request real data.
