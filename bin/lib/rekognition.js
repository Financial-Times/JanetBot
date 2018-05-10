if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const Rekognition = new AWS.Rekognition();
const janetBot = require('./bot');
const Utils  = require('./utils');

const imageSizeLimit = 5242880; //5MB
const MAX_RETRIES = 2;
const confidenceThreshold = 90;
const widthThreshold = 0.04;

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

	const results = await rekognise(params, imageToAnalyse.url);
	return results;
}

async function rekognise(params, imageUrl) {
	return new Promise((resolve, reject) => {
		Rekognition.detectFaces(params, (err, data) => {
			if(err) {
				console.log(err);
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
						}
					} else {
						//TODO: tracking only? -- can be annoying if multiple small faces in image
						janetBot.dev(`Small face ratio ${details[i].BoundingBox.Width}, skipped for ${imageUrl}`);
					}

					if(details[i].Gender.Confidence < confidenceThreshold) {
						janetBot.dev(`Low confidence classification ${JSON.stringify(details[i].Gender)} for ${imageUrl}`);
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
		janetBot.dev(`<!channel> Image is still too big after retries ${image}`);
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