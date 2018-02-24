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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.post('/feedback', (req, res) => {
	const update = Utils.sanitiseNull(req.body);

	feedbackStore.write(update, process.env.AWS_TABLE)
	.then(response => {
		updateResults(update);
		return res.status(200).end();
	})
	.catch(err => {
		console.log('Saving failed', err);
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
	let score = 0;
	let scoreTopHalf = 0;

	results[edition].forEach( item => {
		if(item.classification === 'woman') {
			++score;

			if(item.isTopHalf) {
				++scoreTopHalf;
			}
		}
	});

	totals[edition]['women'] = score;
	totals[edition]['topHalfWomen'] = scoreTopHalf;
}

async function getContent() {
	for(let i = 0; i < editions.length; ++ i) {	
		const edition = editions[i];
		const imageData =  await homepagecontent.frontPage(edition);
		// console.log(`${edition.toUpperCase()} HOMEPAGE', imageData.length, imageData);
		totals[edition]['women'] = 0;
		totals[edition]['topHalfWomen'] = 0;	
		totals[edition]['images'] = imageData.length;
		results[edition] = await analyseContent(imageData, edition);
		//TODO: check against current data
	}

	console.log(totals);

	// janetBot.warn(message(results, totals));

	latestCheck = new Date();
}

async function analyseContent(content, editionKey) {
	for(let i = 0; i < content.length; ++i) {

		const checkDB = await feedbackStore.scan({formattedURL: content[i].formattedURL}, process.env.AWS_TABLE)
		.then(async function (res) {
			if(res.Count > 0) {
				const items = Utils.sort(res.Items, 'correctionTime', 'desc');
				content[i].classification = items[0].classification;
				content[i].originalResult = items[0].originalResult;
				content[i].resultFromAPI = false;

				if((content[i].edition !== items[0].edition) || (content[i].sectionId !== items[0].sectionId) || (content[i].articleUUID !== items[0].articleUUID)) {
					content[i].syncedResult = true;
				}

				if(items[0].previousResult) {
					content[i].previousResult = items[0].previousResult;
				}

			} else {
				const APIResult = await janetBotAPI.classify(content[i].formattedURL);

				content[i].classification = APIResult.classification;
				content[i].rawResults = APIResult.rawResults;
				content[i].resultFromAPI = true;
			}

			if(content[i].classification === 'woman') {
				totals[editionKey]['women'] += 1;
				
				if(content[i].isTopHalf) {
					totals[editionKey]['topHalfWomen'] += 1;
				}
			}
		})
		.catch(err => console.log(err));
	}

	return content;
}

getContent();
setInterval(getContent, pollInterval);
