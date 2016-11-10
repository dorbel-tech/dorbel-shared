// Publishes messages to SNS and consumes them from SQS.
'use strict';
const config = require('../config');
const logger = require('../logger').getLogger(module);
const SNS = require('sns.js');
const SQS = require('sqs-consumer');

const eventType = {
  APARTMENT_CREATED: 'APARTMENT_CREATED',
  APARTMENT_LISTED: 'APARTMENT_LISTED',
  APARTMENT_UNLISTED: 'APARTMENT_UNLISTED',
  APARTMENT_RENTED: 'APARTMENT_RENTED'
};

// Publish a single message to AWS SNS topic. https://github.com/matthewmueller/sns.js
function publish(eventType, dataPayload) {
  let message = {
    eventType,
    dataPayload
  };

  logger.debug('Publishing message', message);
  const topicArn = config.get('NOTIFICATIONS_SNS_TOPIC_ARN');
  return SNS.publish(topicArn, message);
}

// Consume messages from AWS SQS queue which is subscriber of AWS SNS topic. https://github.com/BBC/sqs-consumer
// To stop consumer: consumer.stop();
function start(handleMessage) {
  let consumer = SQS.create({
    queueUrl: config.get('NOTIFICATIONS_SQS_QUEUE_URN'),
    handleMessage
  });

  consumer.on('error', function (err) {
    logger.err(err);
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