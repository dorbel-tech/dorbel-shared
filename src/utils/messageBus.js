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
  OHE_UPDATED: 'OHE_UPDATED',
  OHE_DELETED: 'OHE_DELETED',
  OHE_REGISTERED: 'OHE_REGISTERED',
  OHE_UNREGISTERED: 'OHE_UNREGISTERED',
  OHE_FOLLOWED: 'OHE_FOLLOWED',
  OHE_UNFOLLOWED: 'OHE_UNFOLLOWED'
};

// Publish a single message to AWS SNS topic. 
function publish(snsTopicArn, eventType, dataPayload) {
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
