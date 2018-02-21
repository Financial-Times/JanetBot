const Utils = require('./utils');
const { editions } = require('./page-structure');

function getJanetBotMessage(contents, totals) {
	const now = new Date();
	let message = `At ${Utils.padTime(now.getHours())}:${Utils.padTime(now.getMinutes())}`;

	for(i in editions) {
		const edition = editions[i];
		message += getMessageForEdition(edition, contents[edition], totals[edition]);	
	}

	return message;
}

function getMessageForEdition(edition, content, total) {
	const message = `
	on the ${edition.toUpperCase()} home page, it seems the ${getTotals(content, true)} images in the Top Half feature ${total['topHalfWomen']} wom${(total['topHalfWomen'] === 1)?'a':'e'}n. 
	It seems the ${getTotals(content)} images on the rest of the ${edition.toUpperCase()} home page feature ${diffWomen(total)} wom${(diffWomen(total) === 1)?'a':'e'}n.
	`;

	return message;
}

function getTotals(data, topHalf = false) {
	let total = 0;
	for(i in data) {
		if(topHalf) {
			if(data[i].isTopHalf) {
				++total;
			}
		} else {
			if(!data[i].isTopHalf) {
				++total;
			}
		}
	}

	return total;
}

function diffWomen(total) {
	return total['women'] - total['topHalfWomen'];
}

module.exports = {
	message: getJanetBotMessage
}