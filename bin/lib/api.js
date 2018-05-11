if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const fetch = require('node-fetch');
const janetBot = require('./bot');
const { msToMinSec } = require('./utils');

const apiThresholds = {
	analysis: 10,
	request: 30000
};

async function getClassification(imageUrl) {
	const postData = `image=${imageUrl}`;

	const options = {
		headers: {
			'Accept': 'application/json',
	    	'Content-Type': 'application/x-www-form-urlencoded'
	  	},
		method: 'POST',
		mode: 'cors',
		body: postData
	};

	const startTime = new Date();

	return fetch(`${process.env.JANETBOT_API}/classifyImage`, options)
			.then(res => {
				if(res.ok) {
					return res.json();
				} else {
					janetBot.dev(`<!channel> There was an issue with the API for ${imageUrl} -- ERROR: ${res.status}`);
				}

				return undefined;
			})
			.then(data => {
				const classification = extractClassification(data);
				const stopTime = new Date();
				const requestTime = stopTime - startTime;

				if(data.analysis_time > apiThresholds.analysis) {
					janetBot.dev(`<!channel> The analysis took over ${data.analysis_time.toFixed(2)}s for ${imageUrl}`);
				}

				if(requestTime > apiThresholds.request) {
					janetBot.dev(`<!channel> The API request took ${msToMinSec(requestTime)} for ${imageUrl}`);
				}

				return { classification : classification, rawResults: JSON.stringify(data)};
			})
			.catch(err => { console.log(err) });
}

function extractClassification(results) {
	if(results !== undefined) {
		if(results.gender_counts.female > 0) {
			return 'woman';
		} else if(results.gender_counts.male > 0){
			return 'man';
		}	
	}

	return 'undefined';
}


module.exports = {
	classify: getClassification
}