"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
var qs_1 = __importDefault(require("qs"));
var dotenv_1 = __importDefault(require("dotenv"));
//import packagejson from "./../../../package.json";
dotenv_1.default.config();
var packagejson = { name: "wr-latest-daily-redirect", version: "1.7.0" };
var CLIENT_ID = (_a = process.env.CLIENT_ID) !== null && _a !== void 0 ? _a : "";
var CLIENT_SECRET = (_b = process.env.CLIENT_SECRET) !== null && _b !== void 0 ? _b : "";
var USER_AGENT = "nodejs:".concat(packagejson.name, ":").concat(packagejson.version, " (by /u/murrtu)");
var getAccessToken = function (username, password) { return __awaiter(void 0, void 0, void 0, function () {
    var response;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, axios_1.default)({
                    method: "POST",
                    url: "https://www.reddit.com/api/v1/access_token",
                    data: qs_1.default.stringify({ grant_type: "client_credentials" }),
                    auth: {
                        username: username,
                        password: password,
                    },
                    headers: { "User-Agent": USER_AGENT },
                })];
            case 1:
                response = _a.sent();
                return [2 /*return*/, response.data.access_token];
        }
    });
}); };
var getNewPosts = function (subreddit) { return function (accessToken) { return __awaiter(void 0, void 0, void 0, function () {
    var subredditPosts;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, axios_1.default)({
                    method: "get",
                    url: "https://oauth.reddit.com/r/".concat(subreddit, "/"),
                    headers: {
                        Authorization: "bearer " + accessToken,
                        "User-Agent": USER_AGENT,
                    },
                })];
            case 1:
                subredditPosts = _a.sent();
                return [2 /*return*/, subredditPosts.data.data.children];
        }
    });
}); }; };
var findLatestDaily = function (posts) {
    var titleMatch = function (post) { return post.data.title.match(/daily/i); };
    var selfMatch = function (post) { return post.data.is_self; };
    var dailies = posts.filter(function (post) { return selfMatch(post) && titleMatch(post); });
    return dailies[0];
};
var getDailyUrl = function (subreddit, clientId, clientSecret) { return __awaiter(void 0, void 0, void 0, function () {
    var accessToken, newPosts, latestDaily, url;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getAccessToken(clientId, clientSecret)];
            case 1:
                accessToken = _a.sent();
                return [4 /*yield*/, getNewPosts(subreddit)(accessToken)];
            case 2:
                newPosts = _a.sent();
                return [4 /*yield*/, findLatestDaily(newPosts)];
            case 3:
                latestDaily = _a.sent();
                url = latestDaily.data.url;
                return [2 /*return*/, url];
        }
    });
}); };
function main(args) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var subreddit, url, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    subreddit = (_a = args.subreddit) !== null && _a !== void 0 ? _a : "weightroom";
                    return [4 /*yield*/, getDailyUrl(subreddit, CLIENT_ID, CLIENT_SECRET)];
                case 1:
                    url = _b.sent();
                    return [2 /*return*/, {
                            headers: {
                                location: url,
                                "x-subreddit": subreddit,
                            },
                            statusCode: 302,
                        }];
                case 2:
                    e_1 = _b.sent();
                    console.error(e_1);
                    if (axios_1.default.isAxiosError(e_1)) {
                        return [2 /*return*/, {
                                statusCode: 501,
                                body: e_1.message,
                            }];
                    }
                    return [2 /*return*/, { statusCode: 500, body: e_1 }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
