if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const Rekognition = new AWS.Rekognition();
const janetBot = require('./bot');
const Utils  = require('./utils');

const imageSizeLimit = 5242880; //5MB
const MAX_RETRIES = 2;
const confidenceThreshold = 90;
const widthThreshold = 0.1;

//TODO: add JB warnings

async function getClassification(imageUrl) {
	console.log('IMAGE::', imageUrl);
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

	const results = await rekognise(params);
	return Object.assign({formattedUrl: imageToAnalyse.url}, results);
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
	const image = img.url?img.url:img;

	if(img.retries === MAX_RETRIES) {
		//TODO: warn about this image in JB dev
		console.log(`Image is too big ${image}`);
		return new Error(`Image is too big ${image}`);
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