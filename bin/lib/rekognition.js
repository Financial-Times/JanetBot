if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const Rekognition = new AWS.Rekognition();
const janetBot = require('./bot');

const confidenceThreshold = 90;
const widthThreshold = 0.1;

//TODO: add JB warnings

async function getClassification(imageUrl) {
	console.log('IMAGE::', imageUrl);
	const imageToAnalyse = await getImage(imageUrl);

	const params = {
		Image: {
			Bytes: imageToAnalyse
		},
		Attributes: ['ALL']
	};

	const results = await rekognise(params);
	return results;
}

async function rekognise(params) {
	return new Promise((resolve, reject) => {
		Rekognition.detectFaces(params, (err, data) => {
			if(err) {
				console.log(err);
				reject(err);
			}

			else {
				const details = data.FaceDetails;
				const genders = { man: 0, woman: 0 };
				const result = { rawResults: JSON.stringify(details)};

				//TODO: check Bounding box ratio.

				for(let i = 0; i < details.length; ++i) {
					if(details[i].Gender.Confidence > confidenceThreshold) {
						if(details[i].Gender.Value === 'Male') {
							++ genders.man;
						} else if(details[i].Gender.Value === 'Female') {
							++ genders.woman;
						} else {
							console.log('Unhandled gender:', details[i].Gender);
						}
					} else {
						console.log('Low confidence gender', details[i].Gender);
						//TODO: analyse logs, but warn of low ratio, low confidence.
					}
				}

				result.classification = extractClassification(genders);
				console.log(result.classification);

				resolve(result);
			}
		});
	});
}

async function getImage(img) {
	return fetch(img)
			.then(res => {
				if(res.status === 200) {
					return res.buffer();
				} else {
					throw Error(res.status);
				}
			})
			.then(buffer => {
				return buffer;
			})
			.catch(err => {
				janetBot.dev(`<!channel> There was an issue retrieving the image ${img} -- ERROR: ${err}`);
				throw err;
			});
}

function extractClassification(genders) {
	if(genders.woman > 0) {
		return 'woman';
	} else if(genders.man > 0){
		return 'man';
	}

	return 'undefined';
}

module.exports = {
	classify: getClassification
};