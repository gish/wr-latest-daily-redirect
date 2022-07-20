import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";
//import packagejson from "./../../../package.json";

dotenv.config();

const packagejson = { name: "wr-latest-daily-redirect", version: "1.7.0" };

const CLIENT_ID = process.env.CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.CLIENT_SECRET ?? "";
const USER_AGENT = `nodejs:${packagejson.name}:${packagejson.version} (by /u/murrtu)`;
const SUBREDDITS = ["bodybuilding", "fitness", "weightroom"];

type RedditPost = {
  data: {
    is_self: boolean;
    title: string;
    url: string;
  };
};

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
  return dailies[0];
};

const getDailyUrl = async (
  subreddit: string,
  clientId: string,
  clientSecret: string
) => {
  const accessToken = await getAccessToken(clientId, clientSecret);
  const newPosts = await getNewPosts(subreddit)(accessToken);
  const latestDaily = await findLatestDaily(newPosts);
  const url = latestDaily.data.url;
  return url;
};

async function main(args: any) {
  try {
    const subreddit = args.subreddit ?? "weightroom";
    if (!SUBREDDITS.includes(subreddit)) {
      throw new Error(`Subreddit /r/${subreddit} not supported`);
    }
    const url = await getDailyUrl(subreddit, CLIENT_ID, CLIENT_SECRET);
    return {
      headers: {
        location: url,
      },
      statusCode: 302,
    };
  } catch (e) {
    console.error(e);
    if (axios.isAxiosError(e)) {
      return {
        statusCode: 501,
        body: e.message,
      };
    }
    return { statusCode: 500, body: e };
  }
}
