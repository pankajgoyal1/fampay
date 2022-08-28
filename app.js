const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { MongoClient } = require("mongodb");
const port = 3000;
const client = new MongoClient("mongodb://localhost:27017");
app.use(bodyParser.json());
const db = client.db("fampay");
const listOfAPIKeys = ["AIzaSyCrdi7T1T7wK26OSO4pfxNn9F2jX8pWGLd", "AIzaSyCrdi7T1T7wK26OSO4pfxNn9F2jX8pWGLc", "AIzaSyCrdi7T1T7wK26OSO4pfxNn9F2jX8pWGLc"];
let currentApiKeyIndex = -1;
const getNextApiKey = () => {
    console.log("getting another api key");
    currentApiKeyIndex++;
    if (currentApiKeyIndex >= listOfAPIKeys.length) {
        throw new Error("No more API key available");
    }
    return listOfAPIKeys[currentApiKeyIndex];
}
let apiKey = getNextApiKey();

const insertToDb = async (data) => {
    try {
        const col = db.collection("videos");
        await col.insertMany(data.items);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}
const startPolling = (token, query) => {
    let nextToken = token;
    fetch(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&type=video&part=snippet&maxResults=30&order=date&q=${query}&pageToken=${token}`)
        .then((res) => res.json())
        .then(async (res) => {
            if (res.nextPageToken) {
                console.log(res.nextPageToken, res.items.length);
                await insertToDb(res);
                nextToken = res.nextPageToken;
            } else {
                apiKey = getNextApiKey();
            }
        })
        .catch((err) => {
            console.log(err);
            if (err !== "No more API key available") {
                apiKey = getNextApiKey();
                return startPolling(token, query);
            }
        }).finally(() => {
            setTimeout(() => {
                startPolling(nextToken, query);
            }, 10000);
        })
}

const fetchFirstPageVideos = (query) => {
    fetch(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&type=video&part=snippet&order=date&maxResults=30&q=${query}`)
        .then((res) => res.json())
        .then(async (res) => {
            if (res?.nextPageToken) {
                await insertToDb(res);
                startPolling(res.nextPageToken, query);
            } else {
                apiKey = getNextApiKey();
                return fetchFirstPageVideos(query);
            }
            return "Started fetching videos for pre-defined query";
        })
        .catch((err) => {
            console.log(err);
            if (err.message !== 'No more API key available') {
                apiKey = getNextApiKey();
                return fetchFirstPageVideos(query);
            }
            return "Unable to start fetching videos for pre-defined query";
        })
}

const getVideosData = async (page) => {
    const pageSize = 5;
    try {
        page--;
        const cursor = await db.collection("videos").find().skip(page * pageSize).limit(pageSize);

        let items = [];
        await cursor.forEach(function (doc) {
            items.push(doc);
        });
        return items;
    } catch (err) {
        console.log(err);
        return [];
    }
}
app.get('/search/:query', async (req, res) => {
    const query = req?.params?.query || "india";
    try {
        res.send(fetchFirstPageVideos(query));
    } catch (err) {
        res.send("unable to start fetching videos ");
    }
})

app.get('/videos', async (req, res) => {
    try {
        const page = req.query?.page || 1;
        const data = await getVideosData(page);
        res.send(data);
    } catch (err) {
        console.log(err);
        res.send("unable to get videos for this page");
    }
});

app.get('/title', async (req, res) => {
    try {
        const title = req.query.q;
        let items = [];
        const cursor = await db.collection("videos").find({ "snippet.title": { $regex: new RegExp(title, 'i') } }).sort({ "snippet.publishedAt": -1 });
        await cursor.forEach(function (doc) {
            items.push(doc);
        });
        res.send(items);
    } catch (err) {
        console.log(err);
        res.send("unable to get video");
    }
})

app.get('/desc', async (req, res) => {
    try {
        const desc = req.query.q;
        let items = [];
        const cursor = await db.collection("videos").find({ "snippet.description": { $regex: new RegExp(desc, 'i') } }).sort({ "snippet.publishedAt": -1 });
        await cursor.forEach(function (doc) {
            items.push(doc);
        });
        console.log(desc + " is contained in " + items.length);
        res.send(items);
    } catch (err) {
        console.log(err);
        res.send("unable to get video");
    }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})