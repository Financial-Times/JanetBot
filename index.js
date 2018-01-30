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
const janetBot = require('./bin/lib/bot');
const feedbackStore = require('./bin/lib/dynamo');

const pollInterval = Utils.minutesToMs(process.env.POLLING_INTERVAL_MINUTES);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.post('/feedback', (req, res) => {
	console.log('POST came through', req.body);
	const update = Utils.sanitiseNull(req.body);

	feedbackStore.write(update, process.env.AWS_TABLE)
	.then(response => {
		updateResults(req.body);
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
	} else if(req.params.version === 'all'){
		res.json({'status': 200, 'content': results, 'total': totals, 'date': latestCheck});	
	} else {
		res.json({'status': 404});
	}
});

app.listen(process.env.PORT || 2018);

function updateResults(image) {
	console.log('Feedback completed', image);

	const edition = image.edition;
	const toUpdate = results[edition].findIndex(img => {
		return img.articleUUID === image.articleUUID && img.formattedURL === image.formattedURL;
	});

	//TODO: update resultFromAPI here
	results[edition][toUpdate] = Utils.parseNull(image);

	updateTotals(edition);
}

function updateTotals(edition) {
	//TODO: what if the same image is on the international edition??
	let score = 0;
	let scoreTopHalf = 0;

	results[edition].forEach( item => {
		if(item.isWoman) {
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
	const imageData =  await homepagecontent.frontPage();
	// console.log('UK HOMEPAGE', imageData.length, imageData);
	totals['uk']['women'] = 0;
	totals['uk']['topHalfWomen'] = 0;	
	totals['uk']['images'] = imageData.length;
	results['uk'] = await analyseContent(imageData, 'uk');


	const internationalImageData =  await homepagecontent.frontPage('international');
	totals['international']['women'] = 0;
	totals['international']['topHalfWomen'] = 0;	
	totals['international']['images'] = internationalImageData.length;
	results['international'] = await analyseContent(internationalImageData, 'international');

	latestCheck = new Date();
	// console.log(results);
	// console.log('INT HOMEPAGE', internationalImageData.length, internationalImageData);

	// janetBot.warn(`There are ${imageData.length} images on the UK Homepage & ${internationalImageData.length} on the International homepage, including local variations.`);
}

async function analyseContent(content, editionKey) {
	for(let i = 0; i < content.length; ++i) {
		//Add mock result until API ready
		const mockResult = content[i].articleUUID.slice(-1);
		content[i].isWoman = (mockResult === 'b');

		if(content[i].isWoman) {
			totals[editionKey]['women'] += 1;
			
			if(content[i].isTopHalf) {
				totals[editionKey]['topHalfWomen'] += 1;
			}
		}
	}

	return content;
}

getContent();
setInterval(getContent, pollInterval);