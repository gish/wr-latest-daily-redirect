import express, { Request, Response } from "express";
const app = express();
import axios from "axios";
import qs from "qs";
import R from "ramda";
import dotenv from "dotenv";
import packagejson from "./package.json";

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.CLIENT_SECRET ?? "";
const PORT = process.env.PORT ?? "";
const ORIGIN = process.env.ORIGIN ?? "";
const PINTIFIER_KEY = process.env.PINTIFIER_KEY ?? "";
const USER_AGENT = `nodejs:${packagejson.name}:${packagejson.version} (by /u/murrtu)`;
const CACHE_AGE = 23 * 60 * 60 * 1e3;
const SUBREDDITS = ["bodybuilding", "fitness", "weightroom"];
type CachedSubreddit = { timestampUtc: number; url: string };
type RedditPost = {
  data: {
    is_self: boolean;
    title: string;
    url: string;
  };
};

const createCache = () => {
  let storage: { [key: string]: CachedSubreddit } = SUBREDDITS.reduce(
    (cache, subreddit) => ({
      ...cache,
      [subreddit]: {
        timestampUtc: 0,
        url: "",
      },
    }),
    {}
  );

  return {
    get: (subreddit: string) => storage[subreddit],
    update: (subreddit: string) => (url: string) =>
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

const getAccessToken = async (username: string, password: string) => {
  const response = await axios({
    method: "POST",
    url: "https://www.reddit.com/api/v1/access_token",
    data: qs.stringify({ grant_type: "client_credentials" }),
    auth: {
      username,
      password,
    },
    headers: { "User-Agent": USER_AGENT },
  });
  return response.data.access_token;
};

const getNewPosts = (subreddit: string) => async (accessToken: string) => {
  const subredditPosts = await axios({
    method: "get",
    url: `https://oauth.reddit.com/r/${subreddit}/`,
    headers: {
      Authorization: "bearer " + accessToken,
      "User-Agent": USER_AGENT,
    },
  });
  return subredditPosts.data.data.children;
};

const findLatestDaily = (posts: RedditPost[]) => {
  const titleMatch = (post: RedditPost) => post.data.title.match(/daily/i);
  const selfMatch = (post: RedditPost) => post.data.is_self;
  const dailies = posts.filter((post) => selfMatch(post) && titleMatch(post));
  return Promise.resolve(dailies[0]);
};

const addDailyToCache =
  (subreddit: string) => async (clientId: string, clientSecret: string) => {
    try {
      const accessToken = await getAccessToken(clientId, clientSecret);
      const newPosts = await getNewPosts(subreddit)(accessToken);
      const latestDaily = await findLatestDaily(newPosts);
      const url = latestDaily.data.url;
      const cachedDaily = getDailyFromCache(cache.get(subreddit));
      if (url === cachedDaily) {
        return url;
      }
      cache.update(subreddit)(url);
      return url;
    } catch (e) {
      console.error(e);
    }
  };

const getDailyFromCache = (subreddit: CachedSubreddit): string => subreddit.url;
const getTimestampfromCache = (subreddit: CachedSubreddit): number =>
  subreddit.timestampUtc;

SUBREDDITS.map((subreddit) => {
  setInterval(
    () => addDailyToCache(subreddit)(CLIENT_ID, CLIENT_SECRET),
    1 * 60 * 1e3
  );
  addDailyToCache(subreddit)(CLIENT_ID, CLIENT_SECRET);
});

app.get("/r/:subreddit", (req: Request, res: Response) => {
  try {
    const subreddit = req.params.subreddit;
    if (!SUBREDDITS.includes(subreddit)) {
      throw new Error(`Subreddit /r/${subreddit} not supported`);
    }
    const cachedSubreddit = cache.get(subreddit);
    const daily = getDailyFromCache(cachedSubreddit);
    const cacheTimestamp = getTimestampfromCache(cachedSubreddit);
    res
      .append(
        "Cache-Control",
        `max-age=${Math.floor((cacheTimestamp + CACHE_AGE - Date.now()) / 1e3)}`
      )
      .status(302)
      .set("Location", daily)
      .end();
  } catch (e) {
    console.error(e);
    if (axios.isAxiosError(e)) {
      return res
        .status(501)
        .send("Error: " + e.message)
        .end();
    }
    return res.sendStatus(500);
  }
});

app.get("/", (_: express.Request, res: express.Response) => {
  res.status(301).set("Location", `${ORIGIN}/r/weightroom`).end();
});

app.listen(PORT);
