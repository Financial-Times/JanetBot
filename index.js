if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const basicAuth = require('express-basic-auth');
const authUser = process.env.AUTH_USER;
const credentials = {};
credentials[authUser] = process.env.TOKEN;

const results = {};
const totals = {
	'uk': {},
	'international': {}
};

const homepagecontent = require('./bin/lib/homepage');
const Utils  = require('./bin/lib/utils');
const janetBot = require('./bin/lib/bot');

const pollInterval = Utils.minutesToMs(process.env.POLLING_INTERVAL_MINUTES);

// app.use(basicAuth({
// 		users: credentials
// 	})
// );

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/results/:version', (req, res) => {
	if(results[req.params.version]) {
		res.json({'status': 200, 'content': results[req.params.version], 'total': totals[req.params.version]});	
	} else {
		res.json({'status': 404});
	}
});

app.listen(process.env.PORT || 2018);

async function getContent() {
	const imageData =  await homepagecontent.frontPage();
	// console.log('UK HOMEPAGE', imageData.length, imageData);
	totals['uk']['women'] = 0;	
	totals['uk']['images'] = imageData.length;
	results['uk'] = await analyseContent(imageData, 'uk');
	// console.log(results);


	const internationalImageData =  await homepagecontent.frontPage('international');
	totals['international']['women'] = 0;	
	totals['international']['images'] = internationalImageData.length;
	results['international'] = await analyseContent(internationalImageData, 'international');
	// console.log('INT HOMEPAGE', internationalImageData.length, internationalImageData);

	// janetBot.warn(`There are ${imageData.length} images on the UK Homepage & ${internationalImageData.length} on the International homepage, including local variations.`);
}

async function analyseContent(content, editionKey) {
	for(let i = 0; i < content.length; ++i) {
		//Add mock result until API ready
		content[i].isWoman = (Math.floor(Math.random()*1000)%5 === 0);
		if(content[i].isWoman) {
			results[editionKey]['women'] += 1;
		}
	}

	return content;
}

getContent();
setInterval(getContent, pollInterval);