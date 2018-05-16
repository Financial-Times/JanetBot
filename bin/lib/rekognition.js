if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const Rekognition = new AWS.Rekognition();
const janetBot = require('./bot');
const Utils  = require('./utils');
const Tracker = require('./tracking');

const imageSizeLimit = 5242880; //5MB
const MAX_RETRIES = 2;
const confidenceThreshold = 90;
const widthThreshold = 0.04;

async function getClassification(imageUrl) {
	const imageToAnalyse = await getImage(imageUrl);

	if(imageToAnalyse instanceof Error) {
		return {};
	}

	const params = {
		Image: {
			Bytes: imageToAnalyse.buffer
		},
		Attributes: ['ALL']
	};

	const results = await rekognise(params, imageToAnalyse.url);
	return results;
}

async function rekognise(params, imageUrl) {
	return new Promise((resolve, reject) => {
		Rekognition.detectFaces(params, (err, data) => {
			if(err) {
				Tracker.splunk(`error="Rekognition error ${JSON.stringify(err)}"`);
				reject(err);
			}

			else {
				const details = data.FaceDetails;
				const genders = { man: 0, woman: 0 };
				const result = { formattedUrl: imageUrl, rawResults: JSON.stringify(details)};

				for(let i = 0; i < details.length; ++i) {
					if(details[i].BoundingBox.Width > widthThreshold) {
						if(details[i].Gender.Value === 'Male') {
							++ genders.man;
						} else if(details[i].Gender.Value === 'Female') {
							++ genders.woman;
						} else {
							janetBot.dev(`<!channel> Unhandled gender ${JSON.stringify(details[i].Gender)} for ${imageUrl}`);
							Tracker.splunk(`error="Unhandled gender ${JSON.stringify(details[i].Gender)} for ${imageUrl}"`);
						}
					} else {
						Tracker.splunk(`rekognition="Small face ratio ${details[i].BoundingBox.Width}, skipped for ${imageUrl}"`);
					}

					if(details[i].Gender.Confidence < confidenceThreshold) {
						Tracker.splunk(`rekognition="Low confidence classification ${JSON.stringify(details[i].Gender)} for ${imageUrl}"`);
					}
				}

				result.classification = extractClassification(genders);
				Tracker.splunk(`classification="IMAGE::${imageUrl} >> ${result.classification}"`);

				resolve(result);
			}
		});
	});
}

async function getImage(img) {
	const image = img.url?img.url:img;

	if(img.retries === MAX_RETRIES) {
		janetBot.dev(`<!channel> Image is still too big after retries ${image}`);
		Tracker.splunk(`error="Image too big for analysis" image=${image}`);
		return new Error();
	}

	return fetch(image)
			.then(res => {
				if(res.status === 200) {
					return res.buffer();
				} else {
					throw Error(res.status);
				}
			})
			.then(buffer => {
				if(buffer.byteLength < imageSizeLimit) {
					return {buffer: buffer, url: image};
				} else {
					const smallImg = Utils.getSmallerImage(image, img.retries | 0);
					return getImage(smallImg);
				}
			})
			.catch(err => {
				janetBot.dev(`<!channel> There was an issue retrieving the image ${image} -- ERROR: ${err}`);
				Tracker.splunk(`error="There was an issue retrieving the image ${err}" image=${image}`);
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