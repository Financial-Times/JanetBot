if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const slackbot = require('slackbots');
const bot = new slackbot({
    token: process.env.SLACK_TOKEN,
    'name': 'JanetBot'
});

const botParams = {
    icon_url: 'https://www.ft.com/__origami/service/image/v2/images/raw/http%3A%2F%2Fcdn.spoutable.com%2Fimg%2F329d16f0-7148-4f92-9cdd-5c97e50ed3c3%2FJanetYellenEd-400x400.jpg?source=janetbot&width=400&height=400',
    as_user: false
};

function sendMessage(message) {
	bot.postMessageToGroup(process.env.SLACK_CHANNEL, message, botParams);
}

module.exports = {
	warn: sendMessage
}