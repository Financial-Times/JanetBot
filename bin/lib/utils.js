let topStories;

function minutesToMs(mn) {
	return mn*60*1000;
}

function extractUUID(link) {
	if(link !== undefined) {
		return link.apiUrl.replace('http://api.ft.com/content/', '');	
	}

	return undefined;
}

function isOpinion(annotation) {
	return (annotation.predicate === 'http://www.ft.com/ontology/classification/isClassifiedBy' && annotation.prefLabel === 'Opinion');
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

module.exports = {
	minutesToMs: minutesToMs,
	extractUUID: extractUUID,
	isOpinion: isOpinion,
	dedupe: removeDuplicatesFromSection,
	saveBase: setComparisonBase
};