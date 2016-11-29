// Publishes messages to SNS and consumes them from SQS.
'use strict';
const logger = require('../logger').getLogger(module);
const SNS = require('sns.js');
const SQS = require('sqs-consumer');

const eventType = {
  APARTMENT_CREATED: 'APARTMENT_CREATED',
  APARTMENT_LISTED: 'APARTMENT_LISTED',
  APARTMENT_UNLISTED: 'APARTMENT_UNLISTED',
  APARTMENT_RENTED: 'APARTMENT_RENTED',
  OHE_CREATED: 'OHE_CREATED',
  OHE_DELETED: 'OHE_DELETED',
  OHE_REGISTERED: 'OHE_REGISTERED',
  OHE_UNREGISTERED: 'OHE_UNREGISTERED'
};

// Publish a single message to AWS SNS topic. https://github.com/matthewmueller/sns.js
function publish(snsTopicArn, eventType, dataPayload) {
  let message = {
    environemnt: process.env.NODE_ENV,
    eventType,
    dataPayload
  };

  logger.debug(message, 'Publishing message');
  return SNS.publish(snsTopicArn, message);
}

// Consume messages from AWS SQS queue which is subscriber of AWS SNS topic. https://github.com/BBC/sqs-consumer
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

module.exports = {
  eventType,
  publish,
  consume: {
    start
  }
};
