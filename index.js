if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const basicAuth = require('express-basic-auth');
const authUser = process.env.AUTH_USER;
const credentials = {};
credentials[authUser] = process.env.TOKEN;

const homepagecontent = require('./bin/lib/homepage');
const Utils  = require('./bin/lib/utils');
const janetBot = require('./bin/lib/bot');

const pollInterval = Utils.minutesToMs(process.env.POLLING_INTERVAL_MINUTES);

app.use(basicAuth({
		users: credentials
	})
);
app.get('/results', function(req, res){
	res.json({'ok': 'ok'});
});

app.listen(process.env.PORT || 2018);

async function getContent() {
	const imageData =  await homepagecontent.frontPage();
	// console.log('UK HOMEPAGE', imageData.length, imageData);
	console.log(await analyseContent(imageData));

	// const internationalImageData =  await homepagecontent.frontPage('international');
	// console.log('INT HOMEPAGE', internationalImageData.length, internationalImageData);

	// janetBot.warn(`There are ${imageData.length} images on the UK Homepage & ${internationalImageData.length} on the International homepage, including local variations.`);
}

async function analyseContent(content) {
	for(let i = 0; i < content.length; ++i) {
		//Add mock result until API ready
		content[i].isWoman = (Math.floor(Math.random()*1000)%5 === 0);
	}

	return content;
}

getContent();
// let polling = setInterval(getContent, pollInterval);