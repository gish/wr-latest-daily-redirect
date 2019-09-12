const express = require('express');
const app = express();
const axios = require('axios');
const qs = require('qs');
const R = require('ramda');
const dotenv = require('dotenv');

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

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
    }),
  R.path(['data', 'access_token']),
);

const getNewPosts = R.pipeP(
  accessToken =>
    axios({
      method: 'get',
      url: 'https://oauth.reddit.com/r/weightroom/',
      headers: {Authorization: 'bearer ' + accessToken},
    }),
  R.path(['data', 'data', 'children']),
);

const findLatestDaily = R.pipe(
  R.find(
    R.pipe(
      R.path(['data', 'title']),
      R.test(/daily/i),
    ),
  ),
  R.path(['data', 'url']),
);

const getDaily = async () => {
  try {
    return R.pipeP(
      await getAccessToken,
      await getNewPosts,
      findLatestDaily,
    )(CLIENT_ID, CLIENT_SECRET);
  } catch (e) {
    throw e;
  }
};

app.get('/', async (req, res) => {
  try {
    daily = getDaily();
    res
      .status(301)
      .set('Location', daily)
      .end();
  } catch (e) {
    res
      .status(501)
      .send('Error: ' + e.message)
      .end();
  }
});

app.listen(8080);
