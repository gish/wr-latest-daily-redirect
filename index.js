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
const USER_AGENT = `nodejs:${packagejson.name}:${packagejson.version} (by /u/murrtu)`;
const PINTIFIER_KEY = process.env.PINTIFIER_KEY;
const CACHE_AGE = 23 * 60 * 60 * 1e3;

const createCache = () => {
  let storage = {
    timestampUtc: 0,
    url: '',
  };

  return {
    get: R.always(storage),
    update: url =>
      (storage = {
        timestampUtc: Date.now(),
        url,
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

const getNewPosts = R.pipeP(
  accessToken =>
    axios({
      method: 'get',
      url: 'https://oauth.reddit.com/r/weightroom/',
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

const addDailyToCache = async (clientId, clientSecret) => {
  try {
    R.pipeP(
      await getAccessToken,
      await getNewPosts,
      findLatestDaily,
      R.path(['data', 'url']),
      R.ifElse(
        R.equals(getDailyFromCache(cache.get())),
        R.identity,
        cache.update,
      ),
    )(clientId, clientSecret);
  } catch (e) {
    console.error(e);
  }
};

const getDailyFromCache = R.path(['url']);

const logVisit = (dailyUrl, userAgent) =>
  axios({
    method: 'GET',
    url: 'https://pintifier.herokuapp.com/api/v1/notification',
    params: {
      key: PINTIFIER_KEY,
      domain: USER_AGENT,
      payload: JSON.stringify({url: dailyUrl, ua: userAgent}),
    },
  });

setInterval(() => addDailyToCache(CLIENT_ID, CLIENT_SECRET), 1 * 60 * 1e3);
addDailyToCache(CLIENT_ID, CLIENT_SECRET);

app.get('/', (req, res) => {
  try {
    const daily = getDailyFromCache(cache.get());
    const cacheTimestamp = R.path(['timestampUtc'], cache.get());
    logVisit(daily, req.get('User-Agent'));
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
app.listen(PORT);
