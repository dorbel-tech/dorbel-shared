// Publishes messages to SNS and consumes them from SQS.
'use strict';
const logger = require('../logger').getLogger(module);
const SNS = require('sns.js');
const SQS = require('sqs-consumer');
const generic = require('./generic');

const eventType = {
  APARTMENT_CREATED: 'APARTMENT_CREATED',
  APARTMENT_CREATED_FOR_MANAGEMENT: 'APARTMENT_CREATED_FOR_MANAGEMENT',
  APARTMENT_LISTED: 'APARTMENT_LISTED',
  APARTMENT_UNLISTED: 'APARTMENT_UNLISTED',
  APARTMENT_RENTED: 'APARTMENT_RENTED',
  LISTING_EDITED: 'LISTING_EDITED',
  LISTING_LIKED: 'LISTING_LIKED',
  LISTING_UNLIKED: 'LISTING_UNLIKED',
  OHE_CREATED: 'OHE_CREATED',
  OHE_UPDATED: 'OHE_UPDATED',
  OHE_DEACTIVATED: 'OHE_DEACTIVATED',
  OHE_DELETED: 'OHE_DELETED',
  OHE_REGISTERED: 'OHE_REGISTERED',
  OHE_UNREGISTERED: 'OHE_UNREGISTERED',
  SEND_MONTHLY_REPORT: 'SEND_MONTHLY_REPORT'
};

// Publish a single message to AWS SNS topic.
function publish(snsTopicArn, eventType, dataPayload) {
  // Auto adding listing url based on provided listing_id.
  if(dataPayload.apartment_id) {
    dataPayload.listing_url = generic.getPropertyUrl(dataPayload.apartment_id);
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
