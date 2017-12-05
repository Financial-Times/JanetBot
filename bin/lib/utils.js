function minutesToMs(mn) {
	return mn*60*1000;
}

function extractUUID(link) {
	return link.apiUrl.replace('http://api.ft.com/content/', '');
}

function isOpinion(annotation) {
	return (annotation.predicate === 'http://www.ft.com/ontology/classification/isClassifiedBy' && annotation.prefLabel === 'Opinion');
}

module.exports = {
	minutesToMs: minutesToMs,
	extractUUID: extractUUID,
	isOpinion: isOpinion
};