const fetch = require('node-fetch');

function logToSpoor(data) {
	if(!data){
		return Promise.resolve({'status' : 'Failed. Invalid data passed.'});
	}

	return fetch('https://spoor-api.ft.com/ingest', {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'Content-Length': new Buffer(JSON.stringify(data)).length,
				'User-Agent': 'ft-labs/v1.0'
			},
			body: JSON.stringify(data)
		})
		.then(res => {
			if(res.ok){
				return res.json();
			} else {
				throw res;
			}
		})
		.then(r => {
			console.log('Data successfully submitted to Spoor', r);
			return r;
		})
		.catch(err => {
			console.log('Request to Spoor failed:', err);
		});
}

function logToSplunk(message) {
	//NOTE: a log drain needs to be set up on the prod instance for this to work
	console.log(message);
}

module.exports = {
	spoor: logToSpoor,
	splunk: logToSplunk
}