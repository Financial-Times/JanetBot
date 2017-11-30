if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const homepagecontent = require('./bin/lib/homepage');
const Utils  = require('./bin/lib/utils');

const pollInterval = Utils.minutesToMs(process.env.POLLING_INTERVAL_MINUTES);
console.log(pollInterval);

async function getContent() {
	const imageData =  await homepagecontent.frontPage();
	console.log('UK HOMEPAGE', imageData);
}

// getContent();

setTimeout(getContent, pollInterval);