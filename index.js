const express = require('express');
const app = express();
const axios = require('axios');
const qs = require('qs');
const R = require('ramda');
const dotenv = require('dotenv');
const packagejson = require('./package.json');

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PORT = process.env.PORT;
const ORIGIN = process.env.ORIGIN;
const USER_AGENT = `nodejs:${packagejson.name}:${packagejson.version} (by /u/murrtu)`;
const PINTIFIER_KEY = process.env.PINTIFIER_KEY;
const CACHE_AGE = 23 * 60 * 60 * 1e3;
const SUBREDDITS = ['weightroom', 'fitness'];

const createCache = () => {
  let storage = SUBREDDITS.reduce(
    (cache, subreddit) => ({
      ...cache,
      [subreddit]: {
        timestampUtc: 0,
        url: '',
      },
    }),
    {},
  );

  return {
    get: subreddit => storage[subreddit],
    update: subreddit => url =>
      (storage = {
        ...storage,
        [subreddit]: {
          timestampUtc: Date.now(),
          url,
        },
      }),
  };
};

const cache = createCache();

const getAccessToken = R.pipeP(
  (username, password) =>
    axios({
      method: 'POST',
      url: 'https://www.reddit.com/api/v1/access_token',
      data: qs.stringify({grant_type: 'client_credentials'}),
      auth: {
        username,
        password,
      },
      headers: {'User-Agent': USER_AGENT},
    }),
  R.path(['data', 'access_token']),
);

const getNewPosts = subreddit =>
  R.pipeP(
    accessToken =>
      axios({
        method: 'get',
        url: `https://oauth.reddit.com/r/${subreddit}/`,
        headers: {
          Authorization: 'bearer ' + accessToken,
          'User-Agent': USER_AGENT,
        },
      }),
    R.path(['data', 'data', 'children']),
  );

const findLatestDaily = R.pipe(
  R.filter(
    R.pipe(
      R.path(['data', 'title']),
      R.test(/daily/i),
    ),
  ),
  R.head,
);

const addDailyToCache = subreddit => async (clientId, clientSecret) => {
  try {
    R.pipeP(
      await getAccessToken,
      await getNewPosts(subreddit),
      findLatestDaily,
      R.path(['data', 'url']),
      R.ifElse(
        R.equals(getDailyFromCache(cache.get())),
        R.identity,
        cache.update(subreddit),
      ),
    )(clientId, clientSecret);
  } catch (e) {
    console.error(e);
  }
};

const getDailyFromCache = R.path(['url']);
const getTimestampfromCache = R.path(['timestampUtc']);

const logVisit = (subreddit, dailyUrl, userAgent) =>
  axios({
    method: 'GET',
    url: 'https://pintifier.herokuapp.com/api/v1/notification',
    params: {
      key: PINTIFIER_KEY,
      domain: USER_AGENT,
      payload: JSON.stringify({subreddit, url: dailyUrl, ua: userAgent}),
    },
  });

SUBREDDITS.map(subreddit => {
  setInterval(
    () => addDailyToCache(subreddit)(CLIENT_ID, CLIENT_SECRET),
    1 * 60 * 1e3,
  );
  addDailyToCache(subreddit)(CLIENT_ID, CLIENT_SECRET);
});

app.get('/r/:subreddit', (req, res) => {
  try {
    const subreddit = req.params.subreddit;
    if (!SUBREDDITS.includes(subreddit)) {
      throw new Error(`Subreddit /r/${subreddit} not supported`);
    }
    const cachedSubreddit = cache.get(subreddit);
    const daily = getDailyFromCache(cachedSubreddit);
    const cacheTimestamp = getTimestampfromCache(cachedSubreddit);
    logVisit(subreddit, daily, req.get('User-Agent'));
    res
      .append(
        'Cache-Control',
        `max-age=${Math.floor(
          (cacheTimestamp + CACHE_AGE - Date.now()) / 1e3,
        )}`,
      )
      .status(302)
      .set('Location', daily)
      .end();
  } catch (e) {
    console.error(e);
    res
      .status(501)
      .send('Error: ' + e.message)
      .end();
  }
});

app.get('/', (_, res) => {
  res
    .status(301)
    .set('Location', `${ORIGIN}:${PORT}/r/weightroom`)
    .end();
});

app.listen(PORT);
