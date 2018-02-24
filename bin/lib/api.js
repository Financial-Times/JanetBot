if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const fetch = require('node-fetch');

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

	//TODO DEV:: get slack alerts for slow requests
	console.log('Fetching', imageUrl);

	return fetch(`${process.env.JANETBOT_API}/classifyImage`, options)
			.then(res => {
				if(res.ok) {
					return res.json();
				}
				//TODO: handle else >> retry
			})
			.then(data => {
				const classification = extractClassification(data);
				return { classification : classification, rawResults: JSON.stringify(data)};
			})
			.catch(err => { console.log(err) });
}

function extractClassification(results) {
	if(results.gender_counts.female > 0) {
		return 'woman';
	} else if( results.gender_counts.male > 0){
		return 'man';
	}

	return 'undefined';
}


module.exports = {
	classify: getClassification
}