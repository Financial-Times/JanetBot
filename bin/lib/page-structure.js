const pageStructure = [
{
	isConcept: false,
	uk:process.env.UK_TOP_STORIES,
	international: process.env.INT_TOP_STORIES,
	checkHeadshots: null
}, 
{
	isConcept: false,
	uk: process.env.MID_SECTION_LIST,
	international: process.env.MID_SECTION_LIST,
	layout: 'midsection',
	checkHeadshots: 6
},
{ 
	isConcept: false,
	uk: process.env.UK_REG_NEWS,
	international: process.env.EU_REG_NEWS,
	layout: 'regionalnews',
	checkHeadshots: 4
}, 
{
	isConcept: false,
	uk: process.env.UK_OPINION,
	international: process.env.INT_OPINION,
	layout: 'opinion',
	checkHeadshots: 9
}, 
{
	isConcept: false,
	uk: process.env.VIDEO_LIST,
	international: process.env.VIDEO_LIST,
	layout: 'video',
	checkHeadshots: null
},  
{
	isConcept: false,
	uk: process.env.UK_HIGHLIGHTS,
	international: process.env.INT_HIGHLIGHTS,
	layout: 'highlights',
	checkHeadshots: 6
},
{
	isConcept: false,
	uk: process.env.MARKET_LIST,
	international: process.env.MARKET_LIST,
	layout: 'market',
	checkHeadshots: 6
},  
{
	isConcept: true,
	uk: process.env.TECH_CONCEPT,
	international: process.env.TECH_CONCEPT,
	layout: 'technology',
	checkHeadshots: 6
},  
{
	isConcept: false,
	uk: process.env.LIFE_AND_ARTS,
	international: process.env.LIFE_AND_ARTS,
	layout: 'lifearts',
	checkHeadshots: 5
}];

function getPositionsForLayout(layout) {
	let images;

	switch (layout) {
		case 'assassination':
			images = [0, 5, 6, 7, 8, 9, 12, 13, 14];
		break;

		case 'bigstory':
			images = [0, 4, 5, 6, 7, 8, 11, 12, 13, 14];
		break;

		case 'landscape':
			images = [0, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13];
		break;

		case 'standaloneimage':
			images = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13];
		break;

		case 'video':
			images = [0, 1, 2, 3];
		break;

		case 'lifearts':
			images = [0, 1, 2, 3, 4];
		break;

		case 'midsection':
		case 'regionalnews':
		case 'opinion':
		case 'highlights':
		case 'market':
		case 'technology':
		default:
			images = [0];
	}

	return images;
}

module.exports = {
	sections: pageStructure,
	getPositions: getPositionsForLayout
}