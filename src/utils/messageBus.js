// Publishes messages to SNS and consumes them from SQS.
'use strict';
const logger = require('../logger').getLogger(module);
const SNS = require('sns.js');
const SQS = require('sqs-consumer');
const generic = require('./generic');

const eventType = {
  APARTMENT_CREATED: 'APARTMENT_CREATED',
  APARTMENT_LISTED: 'APARTMENT_LISTED',
  APARTMENT_UNLISTED: 'APARTMENT_UNLISTED',
  APARTMENT_RENTED: 'APARTMENT_RENTED',
  LISTING_LIKED: 'LISTING_LIKED',
  LISTING_UNLIKED: 'LISTING_UNLIKED',
  OHE_CREATED: 'OHE_CREATED',
  OHE_UPDATED: 'OHE_UPDATED',
  OHE_DEACTIVATED: 'OHE_DEACTIVATED',
  OHE_DELETED: 'OHE_DELETED',
  OHE_REGISTERED: 'OHE_REGISTERED',
  OHE_UNREGISTERED: 'OHE_UNREGISTERED',
  OHE_FOLLOWED: 'OHE_FOLLOWED',
  OHE_UNFOLLOWED: 'OHE_UNFOLLOWED'
};

// Publish a single message to AWS SNS topic. 
function publish(snsTopicArn, eventType, dataPayload) {
  // params with "_" prefix are meant to come first for faster finding in Intercom/Customer.io 
  // In addition Intercom is limited to number of variables, so we put it first to be present.
  // Auto adding listing url based on provided listing_id.
  if(dataPayload.listing_id) {
    dataPayload._listing_url = generic.getListingUrl(dataPayload.listing_id);
  }

  let message = {
    environment: process.env.NODE_ENV,
    eventType,
    dataPayload
  };

  logger.debug(eventType, dataPayload, 'Publishing message');
  return SNS.publish(snsTopicArn, message);
}

// Consume messages from AWS SQS queue which is subscriber of AWS SNS topic. 
// To stop consumer: consumer.stop();
function start(sqsQueueUrl, handleMessage) {
  let consumer = SQS.create({
    queueUrl: sqsQueueUrl,
    handleMessage
  });

  consumer.on('error', function (err) {
    logger.error(err);
  });

  logger.debug('SQS consumer starting...');
  consumer.start();

  return consumer;
}

function handleMessageWrapper(handleFunc, message, done) {
  const messageBody = JSON.parse(message.Body);
  const messageDataPayload = JSON.parse(messageBody.Message);
  
  handleFunc(messageDataPayload)
    .then(() => done())
    .catch(err => {
      logger.error(err, 'Handling message error');
      done(err);
    });
}

module.exports = {
  eventType,
  publish,
  consume: {
    start
  },
  handleMessageWrapper
};
