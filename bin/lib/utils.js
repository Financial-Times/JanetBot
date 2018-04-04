if (process.env.NODE_ENV !== 'production') require('dotenv').config();
let topStories;

function minutesToMs(mn) {
	return mn*60*1000;
}

function extractUUID(link) {
	if(link !== undefined) {
		return link.apiUrl.replace('http://api.ft.com/content/', '').replace('http://api.ft.com/things/', '');	
	}

	return undefined;
}

function isOpinion(annotation) {
	return (((annotation.predicate === 'http://www.ft.com/ontology/classification/isClassifiedBy' && annotation.type === 'GENRE') || annotation.predicate === 'http://www.ft.com/ontology/classification/isPrimarilyClassifiedBy') && annotation.prefLabel === 'Opinion');
}

function setComparisonBase(base) {
	topStories = base;
}

function removeDuplicatesFromSection(section) {
	const tempDupes = [];
	
	for (let i = 0; i < topStories.length; ++i) { 
        for (let j = 0;  j < section.length; ++j) { 
            if (topStories[i].apiUrl === section[j].apiUrl) {
            	tempDupes.push(section[j]);
                section.splice(j, 1);
            }
        }
    }

    section = section.concat(tempDupes);
	//Re-adds duplicates at the end of the array, in case content is too short
	
	return section;
}

function setPlaceholderURL(url) {
	if(!url.startsWith('http://www.ft.com/cms/') && !url.startsWith('https://www.ft.com/video/') && !url.startsWith('http://www.ft.com/fastft/')) {
		
		if(url.startsWith('https://www.ft.com/content/')) {
			return url.split('https://www.ft.com')[1]
		}
		
		return url;
	}

	return null;
}

async function formatImageUrl(url) {
	const isUPPImage = checkUrl(url.binaryUrl);
	let format;
	
	if(isUPPImage) {
		const uuid = extractUUID(url);
		format = `${process.env.IMAGE_SERVICE_URL}${process.env.REPLACE_IMG_URL}${uuid}?source=janetbot&width=800`;
	} else {
		format = `${process.env.IMAGE_SERVICE_URL}${encodeURIComponent(url.binaryUrl)}?source=janetbot`;
	}

	return format;
}

function checkUrl(url) {
	const ftcmsImageRegex = /^https?:\/\/(?:(?:www\.)?ft\.com\/cms|im\.ft-static\.com\/content\/images|com\.ft\.imagepublish\.(?:prod|upp-prod-eu|upp-prod-us)\.s3\.amazonaws\.com|prod-upp-image-read\.ft\.com)\/([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})/g;
	return ftcmsImageRegex.test(url);
}

function sanitiseNullValues(object) {
	for (key in object) {
		if(object.hasOwnProperty(key)) {
			if(object[key] === null) {
				object[key] = 'null';
			}
		}
	}

	return object;
}

function parseNullValues(object) {
	for (key in object) {
		if(object.hasOwnProperty(key)) {
			if(object[key] === 'null') {
				object[key] = null;
			}
		}
	}

	return object;
}

function sortTime(arr, prop, dir = 'desc') {
	if(dir === 'asc') {
		arr.sort(function(a, b) {
		    return parseInt(a[prop]) - parseInt(b[prop]);
		});
	} else {
		arr.sort(function(a, b) {
		    return parseInt(b[prop]) - parseInt(a[prop]);
		});
	}
	
	return arr;
}

function padTime (time) {
	return time.toString().padStart(2,'0');
}

module.exports = {
	minutesToMs: minutesToMs,
	extractUUID: extractUUID,
	isOpinion: isOpinion,
	dedupe: removeDuplicatesFromSection,
	saveBase: setComparisonBase,
	getArticleURL: setPlaceholderURL,
	formatUrl: formatImageUrl,
	sanitiseNull: sanitiseNullValues,
	parseNull: parseNullValues,
	sort: sortTime,
	padTime: padTime
};