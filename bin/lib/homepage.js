if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const fetch = require('node-fetch');
const { sections } = require('./page-structure');
const structure = require('./page-structure');
const Utils = require('./utils');


async function getAllImages(edition = 'uk') {
	let allSectionImages = [];
	
	for(let i = 0; i < sections.length; ++i) {
		if(sections[i][edition] !== 'hidden') {
			const sectionData = await getList(sections[i][edition], sections[i].isConcept);
			let layout = sectionData.hasOwnProperty('layoutHint')?sectionData.layoutHint:sections[i].layout;

			if(edition === 'international' && i === 0) {
				Utils.saveBase(sectionData.items);
			}
			
			const sectionImages = await getImagesFor(sectionData.items, layout, i, edition);
			allSectionImages = allSectionImages.concat(sectionImages);

			if(i === 0 && layout === 'landscape') {
				//Special accommodation for when landscape piece is opinion
				const sectionHeadshots = await getHeadshotsFor(sectionData.items, 2, layout, i, edition);
				allSectionImages = allSectionImages.concat(sectionHeadshots);	
			} else if(sections[i].checkHeadshots !== null) {
				const sectionHeadshots = await getHeadshotsFor(sectionData.items, sections[i].checkHeadshots, layout, i, edition);
				allSectionImages = allSectionImages.concat(sectionHeadshots);
			}
		} else if( edition === 'international' && sections[i].hasOwnProperty('internationalVariants')) {
			const variants = sections[i].internationalVariants;

			for (let j = 0; j < variants.length; ++j) {
				const sectionData = await getList(variants[j].listID, sections[i].isConcept);
				sectionData.items = Utils.dedupe(sectionData.items);

				let layout = sections[i].layout;
				
				const sectionImages = await getImagesFor(sectionData.items, layout, i, `${edition}__${variants[j].region}`);
				allSectionImages = allSectionImages.concat(sectionImages);

				if(sections[i].checkHeadshots !== null) {
					const sectionHeadshots = await getHeadshotsFor(sectionData.items, sections[i].checkHeadshots, layout, i, `${edition}__${variants[j].region}`);
					allSectionImages = allSectionImages.concat(sectionHeadshots);
				}
			}
		}
	}

	return allSectionImages;
}

async function getImagesFor(list, layout, sectionID, edition) {
	const links = [];
	const indices = structure.getPositions(layout);

	if(list !== undefined) {
		for(let i = 0; i < indices.length; ++i) {
			let imageData = await getTeaser(Utils.extractUUID(list[indices[i]]));

			if(imageData.images.length) {
				const formattedURL = await Utils.formatUrl(imageData.images[0].binaryUrl);
				const image = {
					timestamp: new Date().getTime(),
					edition: edition,
					sectionLayout: layout,
					sectionId: sectionID,
					articleUUID: Utils.extractUUID(list[indices[i]]),
					articleUrl: Utils.getArticleURL(imageData.webUrl),
					sectionPos: indices[i],
					imageType: imageData.type,
					originalUrl: imageData.images[0].binaryUrl,
					formattedURL: formattedURL,
					isTopHalf: (sectionID === 0)?structure.isTopHalf(layout, indices[i]):false

				}
				links.push(image);	
			}
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

					return {type: 'promo', images: new Array(data.alternativeImages.promotionalImage), webUrl: data.webUrl};
				}

				if(data.mainImage) {
					return {type: 'main', images: data.mainImage.members, webUrl: data.webUrl};	
				}

				return {type: 'main', images: []};
				
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

async function getHeadshotsFor(list, itemCount, layout, sectionID, edition) {
	const headShots = [];

	if(list !== undefined) {
		for(let i = 1; i < itemCount; ++i) {
			const authorData = await getAuthor(Utils.extractUUID(list[i]));

			if(authorData !== undefined && authorData.find(Utils.isOpinion)) {
				for(let j = 0; j < authorData.length; ++j) {
					if(authorData[j].predicate === 'http://www.ft.com/ontology/annotation/hasAuthor') {
						const imageData = await getHeadshot(authorData[j].apiUrl);
						if(imageData._imageUrl) {
							const image = {
								timestamp: new Date().getTime(),
								edition: edition,
								sectionLayout: layout,
								sectionId: sectionID,
								articleUUID: Utils.extractUUID(list[i]),
								articleUrl: null,
								sectionPos: i,
								imageType: 'headshot',
								originalUrl: imageData._imageUrl,
								formattedURL: imageData._imageUrl.replace('?source=next', '').concat('?source=janetbot&width=500'),
								isTopHalf: (sectionID === 0)?structure.isTopHalf(layout, i):false
							}

							headShots.push(image);
						}
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