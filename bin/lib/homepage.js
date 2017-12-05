if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const fetch = require('node-fetch');
const { sections } = require('./page-structure');
const structure = require('./page-structure');
const Utils = require('./utils');


async function getAllImages(edition = 'uk') {
	let allSectionImages = [];
	
	for(let i = 0; i < sections.length; ++i) {
		const sectionData = await getList(sections[i][edition], sections[i].isConcept);
		let layout = sectionData.hasOwnProperty('layoutHint')?sectionData.layoutHint:sections[i].layout;
		
		const sectionImages = await getImagesFor(sectionData.items, structure.getPositions(layout));
		allSectionImages = allSectionImages.concat(sectionImages);

		if(i === 0 && layout === 'landscape') {
			/*Special accomodation for when landscape piece is opinion*/
			const sectionHeadshots = await getHeadshotsFor(sectionData.items, 2);
			allSectionImages = allSectionImages.concat(sectionHeadshots);	
		} else if(sections[i].checkHeadshots !== null) {
			const sectionHeadshots = await getHeadshotsFor(sectionData.items, sections[i].checkHeadshots);
			allSectionImages = allSectionImages.concat(sectionHeadshots);
		}
	}

	console.log(allSectionImages.length);
	return allSectionImages;
}

async function getImagesFor(list, indices) {
	const links = [];
	for(let i = 0; i < indices.length; ++i) {
		const imageData = await getTeaser(Utils.extractUUID(list[indices[i]]));

		if(imageData.length) {
			links.push(imageData[0].binaryUrl.replace(process.env.API_IMG_URL, process.env.REPLACE_IMG_URL).concat('?source=janetbot'));	
		}
	}

	return links;
}

async function getTeaser(uuid) {
	console.log('getTeaser::', uuid);
	return fetch(`http://api.ft.com/enrichedcontent/${uuid}?apiKey=${process.env.FT_API_KEY}`)
			.then(res => res.json())
			.then(data => {
				if(data.alternativeImages && data.alternativeImages.promotionalImage) {

					return new Array(data.alternativeImages.promotionalImage);
				}

				if(data.mainImage) {
					return data.mainImage.members;	
				}

				return [];
				
			})
			.catch(err => { throw err });
}

async function getAuthor(uuid) {
	console.log('getAuthor::', uuid);
	return fetch(`http://api.ft.com/enrichedcontent/${uuid}?apiKey=${process.env.FT_API_KEY}`)
			.then(res => res.json())
			.then(data => { return data.annotations })
			.catch(err => { throw err });
}

async function getHeadshot(url) {
	console.log('getHeadshot::', url);
	return fetch(`${url}?apiKey=${process.env.FT_API_KEY}`)
			.then(res => res.json())
			.then(data => { return data })
			.catch(err => { throw err });
}

async function getHeadshotsFor(list, itemCount) {
	const headShots = [];
	for(let i = 1; i < itemCount; ++i) {
		const authorData = await getAuthor(Utils.extractUUID(list[i]));

		if(authorData.find(Utils.isOpinion)) {
			for(let j = 0; j < authorData.length; ++j) {
				if(authorData[j].predicate === 'http://www.ft.com/ontology/annotation/hasAuthor') {
					const imageData = await getHeadshot(authorData[j].apiUrl);
					if(imageData._imageUrl) {
						headShots.push(imageData._imageUrl.replace('?source=next', '').concat('?source=janetbot'));
					}
				}
			}
		}
	}
	return headShots;
}

async function getList(listID, isConcept = false) {
	const url = isConcept?`http://api.ft.com/content?isAnnotatedBy=${listID}&apiKey=${process.env.FT_API_KEY}`:`http://api.ft.com/lists/${listID}?apiKey=${process.env.FT_API_KEY}`;
	
	return fetch(url)
			.then(res => res.json())
			.then(data => {
				if(isConcept) {
					let filteredArray = [];
					filteredArray.push(data[0]);

					for(let i = 1; i < data.length; ++i) {
						if(data[i-1].id !== data[i].id) {
							filteredArray.push(data[i]);
						}
					}

					return { items: filteredArray.slice(0, 6) };
				}

				return data;
			})
			.catch(err => { throw err });
}

module.exports = {
	frontPage: getAllImages
}