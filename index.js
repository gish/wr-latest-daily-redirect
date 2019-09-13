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
const CACHE_AGE = 2 * 60 * 1e3;

let cache = {
  timestampUtc: 0,
  url: '',
};

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

const isCacheValid = R.pipe(
  R.path(['timestampUtc']),
  timestamp => timestamp + CACHE_AGE,
  timestamp => timestamp > Date.now(),
);

const updateCache = dailyPost =>
  (cache = {
    timestampUtc: Date.now(),
    url: R.path(['data', 'url'])(dailyPost),
  });

const getDaily = async () => {
  const getCachedDaily = R.path(['url']);
  const getFreshDaily = async () =>
    R.pipeP(
      await getAccessToken,
      await getNewPosts,
      findLatestDaily,
      R.tap(updateCache),
      R.path(['data', 'url']),
    )(CLIENT_ID, CLIENT_SECRET);

  const dailyUrl = R.ifElse(isCacheValid, getCachedDaily, getFreshDaily)(cache);
  return dailyUrl;
};

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

app.get('/', async (req, res) => {
  try {
    const daily = await getDaily();
    //    logVisit(daily, req.get('User-Agent'));
    res
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
