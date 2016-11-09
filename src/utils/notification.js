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

/* Publish a single message to AWS SNS topic.
 * Work example:  yield notifications.publish(notifications.eventType.APARTMENT_CREATED, 
 *                  { apartment_id: 1, user_uuid: '211312-4123123-5344-234234-2343' });
 */
function* publish(eventType, dataPayload) {
  let message = {
    eventType,
    dataPayload
  };

  logger.debug('Publishing message', message);
  const topicArn = config.get('NOTIFICATIONS_SNS_TOPIC_ARN');
  return SNS.publish(topicArn, message);
}

/* Consume messages from AWS SQS queue which is subscriber of AWS SNS topic those message were published to.
 * Work example: yield notifications.receive(function (message, done) {
 *                 logger.debug('Message content', message);
 *                 // do some work with `message`
 *                 done();
 *                }); 
 */
function* consume(handleMessage) {
  var app = SQS.create({
    queueUrl: config.get('NOTIFICATIONS_SQS_QUEUE_URN'),
    handleMessage
  });

  app.on('error', function (err) {
    logger.err(err);
  });

  logger.debug('SQS consumer to long poll messages starting');
  app.start();
}

module.exports = {
  eventType,
  publish,
  consume
};
