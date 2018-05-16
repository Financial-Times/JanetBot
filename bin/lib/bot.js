if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const slackbot = require('slackbots');
const scheduler = require('./scheduler');

const botSettings = formatSettings();
const bots = [];
const botParams = {
    icon_url: 'https://www.ft.com/__origami/service/image/v2/images/raw/http%3A%2F%2Fcdn.spoutable.com%2Fimg%2F329d16f0-7148-4f92-9cdd-5c97e50ed3c3%2FJanetYellenEd-400x400.jpg?source=janetbot&width=400&height=400',
    as_user: false
};

function initBots() {
	for (i in botSettings) {
		const bot = new slackbot({
			token: botSettings[i].key,
			name: 'JanetBot'
		});

		bots.push({bot: bot, channel: botSettings[i].channels});
	}

	return this;
}

function sendMessage(message) {
	if(scheduler.onSchedule()) {
		for(i in bots) {
			for (j in bots[i].channel) {
				const channel = bots[i].channel[j];

				if(channel !== 'janetbot-dev') {
					bots[i].bot.postMessageToGroup(bots[i].channel[j], message, botParams);	
				}
			}	
		}
	}
}

function sendMessageToDev(message) {
	for(i in bots) {
		for (j in bots[i].channel) {
			const channel = bots[i].channel[j];
			if(channel === 'janetbot-dev') {
				bots[i].bot.postMessageToGroup(bots[i].channel[j], message, botParams);	
			}
		}	
	}
}

function formatSettings() {
	const settings = [];
	const envSettings = process.env.SLACK.split(';');

	for(i in envSettings) {
		settings.push(JSON.parse(envSettings[i]));
	}

	return settings;
}

module.exports = {
	init: initBots,
	warn: sendMessage,
	dev: sendMessageToDev
}