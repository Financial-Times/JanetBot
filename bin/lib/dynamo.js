const AWS   = require('aws-sdk');
const utils = require('./utils')
AWS.config.update({region: process.env.AWS_REGION || 'eu-west-1'});

const Dynamo       = new AWS.DynamoDB();                // for basic table accesses
const DynamoClient = new AWS.DynamoDB.DocumentClient(); // for metadata about a table

function describeTable(table){
	return new Promise( (resolve, reject) => {
		if(table === undefined || table === null){
			reject(`'table' argument is ${table}`);
		} else {
			Dynamo.describeTable({
				TableName : table
			}, (err, result) => {
				if(err){
					reject(err);
				} else {
					resolve(result);
				}
			});
		}
	});
}

function writeToDatabase(item, table){

	return new Promise( (resolve, reject) => {

		if(table === undefined || table === null){
			reject(`'table' argument is ${table}`);
		} else {

			DynamoClient.put({
				TableName : table,
				Item : item
			}, (err, result) => {

				if(err){
					reject(err);
				} else {
					resolve(result);
				}
			});
		}
	});
}

function readFromDatabase(item, table){
	return new Promise( (resolve, reject) => {

		if(table === undefined || table === null){
			reject(`'table' argument is ${table}`);
		} else {

			DynamoClient.get({
				TableName : table,
				Key : item
			}, function(err, data) {

				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		}
	});
}

async function scanDatabase(options, table, index) {
	const query = formatQuery(options, table, index);

	const results = await scan(query);

	return scan(query)
		.then(function(){

			const totalItems = [];

			results.forEach(result => {
				result.Items.forEach(Item => {
					totalItems.push(Item);
				})
			});

			return {
				Items : totalItems,
				Count: totalItems.length
			};
		});
}

async function scan(query){
	const results = [];

	return new Promise( (resolve, reject) => {

		if(query.TableName === undefined || query.TableName === null){
			reject(`'TableName' argument is ${query.TableName}`);
		} else {

			DynamoClient.query(query, function(err, data){

				if(err){
					reject(err);
				} else {
					results.push(data);
					if(data.LastEvaluatedKey !== undefined){
						query.ExclusiveStartKey = data.LastEvaluatedKey;
						return scan(query)
							.then(function(){
								resolve(results);
							})
						;
					} else {
						resolve(results);
					}
				}
			})
		}
	});
}

async function queryItemsInDatabase(options, table){
	/*NOTE* FORMATQUERY NEEDS TO ACCOMMODATE FOR PARTITION KEY IF THIS FUNCTION IS TO BE USED*/
	const query = formatQuery(options, table);

	return new Promise( (resolve, reject) => {

		DynamoClient.query(query, (err, data) => {

			if(err){
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

function updateItemInDatabase(item, updateExpression, expressionValues, table){

	return new Promise( (resolve, reject) => {

			DynamoClient.update({
				TableName : table,
				Key : item,
				UpdateExpression : updateExpression,
				ExpressionAttributeValues : expressionValues
			}, function(err, data){

				if(err){
					reject(err);
				} else {
					resolve(data);
				}
			});
	});
}

function formatQuery(item, table, index = '') {
	const formattedQuery = {
		TableName: table,
		IndexName: index,
		KeyConditionExpression: `articleUUID = ${Object.entries(item)[0][1]}`
	}

	const filter = `${Object.entries(item)[0][0]} = :a`;
	const values =  {
		":a": Object.entries(item)[0][1]
	};

	formattedQuery.FilterExpression = filter;
	formattedQuery.ExpressionAttributeValues = values;

	return formattedQuery;
}

module.exports = {
	write    : writeToDatabase,
	read     : readFromDatabase,
	scan     : scanDatabase,
	query    : queryItemsInDatabase,
	update   : updateItemInDatabase,
	describe : describeTable
};
