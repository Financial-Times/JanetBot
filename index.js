if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');
const authUser = process.env.AUTH_USER;
const credentials = {};
credentials[authUser] = process.env.AUTH_TOKEN;

const results = {};
const totals = {
	'uk': {},
	'international': {}
};

let latestCheck;

const homepagecontent = require('./bin/lib/homepage');
const Utils  = require('./bin/lib/utils');
const janetBot = require('./bin/lib/bot').init();
const feedbackStore = require('./bin/lib/dynamo');
const { editions } = require('./bin/lib/page-structure');
const { message } = require('./bin/lib/messaging');
const janetBotAPI = require('./bin/lib/api');

const pollInterval = Utils.minutesToMs(process.env.POLLING_INTERVAL_MINUTES);
let pollTimeout;
let canPoll = true;
let blockedPoll = false;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.post('/feedback', (req, res) => {
	const update = Utils.sanitiseNull(req.body);
	if(process.env.REPORTING === 'on') {
		janetBot.dev(`Correction received for ${update.formattedURL} Classification:: ${update.classification}, original classification: ${update.originalResult}`);
	}

	feedbackStore.write(update, process.env.AWS_TABLE)
	.then(response => {
		updateResults(update);
		return res.status(200).end();
	})
	.catch(err => {
		console.log('Saving failed', err);
		janetBot.dev(`<!channel> Correction saving error for ${update.articleUUID}`);
		return res.status(400).end();
	});
});

app.get('/results/:version', basicAuth({
		users: credentials
	}), (req, res) => {

	if(results[req.params.version]) {
		res.json({'status': 200, 'content': results[req.params.version], 'total': totals[req.params.version], 'date': latestCheck});	
	} else if(req.params.version === 'all' && results.uk && results.international){
		res.json({'status': 200, 'content': results, 'total': totals, 'date': latestCheck});	
	} else {
		res.json({'status': 404});
	}
});

app.listen(process.env.PORT || 2018);

function updateResults(image) {
	const edition = image.edition;

	for(let i = 0; i < editions.length; ++i) {
		for(let j = 0; j < results[editions[i]].length; ++j) {
			const img = results[editions[i]][j];
			
			if(img.formattedURL === image.formattedURL) {
				results[editions[i]][j].classification = image.classification;
				results[editions[i]][j].originalResult = image.originalResult;
				results[editions[i]][j].resultFromAPI = false;

				if(image.previousResult) {
					results[editions[i]][j].previousResult = image.previousResult;
				}

				if(img.sectionId !== image.sectionId || img.edition !== image.edition) {
					results[editions[i]][j].syncedResult = true;
				}
			}
		}

		updateTotals(editions[i]);
	}

	latestCheck = new Date();
}

function updateTotals(edition) {
	let wScore = 0;
	let wScoreTopHalf = 0;
	let mScore = 0;
	let mScoreTopHalf = 0;

	results[edition].forEach( item => {
		if(item.classification === 'woman') {
			++wScore;

			if(item.isTopHalf) {
				++wScoreTopHalf;
			}
		} else if(item.classification === 'man') {
			++mScore;

			if(item.isTopHalf) {
				++mScoreTopHalf;
			}
		}
	});

	totals[edition]['women'] = wScore;
	totals[edition]['topHalfWomen'] = wScoreTopHalf;
	totals[edition]['men'] = mScore;
	totals[edition]['topHalfMen'] = mScoreTopHalf;
}

async function getContent() {

	if(canPoll) {
		canPoll = false;
		for(let i = 0; i < editions.length; ++i) {	
			const edition = editions[i];
			const imageData =  await homepagecontent.frontPage(edition);
			// console.log(`${edition.toUpperCase()} HOMEPAGE', imageData.length, imageData);
			totals[edition]['women'] = 0;
			totals[edition]['topHalfWomen'] = 0;
			totals[edition]['men'] = 0;
			totals[edition]['topHalfMen'] = 0;	
			totals[edition]['images'] = imageData.length;
			results[edition] = await analyseContent(imageData, edition);
			updateTotals(edition);
		}

		console.log(totals);
		// janetBot.warn(message(results, totals));

		latestCheck = new Date();

		canPoll = true;
		if(blockedPoll) {
			blockedPoll = false;
			startPolling();
		}
	} else {
		blockedPoll = true;
		clearTimeout(pollTimeout);
	}
	
}

async function analyseContent(content, editionKey) {
	for(let i = 0; i < content.length; ++i) {

		const checkExisting = await inferResults(content[i]);

		if(checkExisting) {
			Object.assign(content[i], checkExisting);
		} else {
			const checkDB = await feedbackStore.scan({formattedURL: content[i].formattedURL}, process.env.AWS_TABLE)
				.then(async function (res) {
					if(res.Count > 0) {
						const items = Utils.sort(res.Items, 'correctionTime', 'desc');
						const DBResult = {};
						DBResult.classification = items[0].classification;
						DBResult.originalResult = items[0].originalResult;
						DBResult.resultFromAPI = false;

						if((content[i].edition !== items[0].edition) || (content[i].sectionId !== items[0].sectionId) || (content[i].articleUUID !== items[0].articleUUID)) {
							DBResult.syncedResult = true;
						}

						if(items[0].previousResult) {
							DBResult.previousResult = items[0].previousResult;
						}

						return DBResult;

					} else {
						const APIResult = await janetBotAPI.classify(content[i].formattedURL);

						const resultObject = {};
						resultObject.classification = APIResult.classification;
						resultObject.rawResults = APIResult.rawResults;
						resultObject.resultFromAPI = true;

						return resultObject;
					}
				})
				.catch(err => {
					janetBot.dev(`There is an issue with the DB scan for ${content[i].articleUUID} image: ${content[i].formattedURL}`)
					console.log(err);
				});

			Object.assign(content[i], checkDB);
		}
	}

	return content;
}

async function inferResults(image) {
	if(results.uk !== undefined) {
		let existing = results.uk;

		if(results.international !== undefined) {
			existing = existing.concat(results.international);
		}
		const match = existing.findIndex(img => {
			return img.formattedURL === image.formattedURL;
		});

		if(match !== -1) {
			const result = {};
			const data = existing[match];

			result.classification = data.classification;
			result.resultFromAPI = data.resultFromAPI;
			result.inferredResult = true;

			if(data.originalResult) {
				result.originalResult = data.originalResult;
			}

			if(data.previousResult) {
				result.previousResult = data.previousResult;
			}

			if(data.rawResults) {
				result.rawResults = data.rawResults;
			}

			return result;
		}

		return false;
	}

	return false;
}


function startPolling () {
	getContent();
	pollTimeout = setInterval(getContent, pollInterval);
}

startPolling();


