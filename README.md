# dorbel-shared library
> Shared library for use in dorbel services.

## How to add to project :
- In package.json :
```js
"dependencies": {
    "dorbel-shared": "file:../dorbel-shared",
```
- Then run ``yarn install``

## How to use
```js
const shared = require('dorbel-shared');
```
### Logger
```js
const logger = shared.logger.getLogger(module);
// Variables come first, in an object
// Messages are constant (no variables)
logger.info({ userId: user.id, apartmentId: apartment.id }, 'added apartment');
```
- bunyan logs in JSON format. For human readable logs start your application using ``yarn start | bunyan``
### Config
```js
// Config folder should hold json files with environment names (e.g. development.json)
shared.config.setConfigFileFolder(__dirname + '/config');
shared.config.get('CONFIG_KEY_NAME');
```

## Koa middleware

### Error handler
```js
const app = koa();
// Should come first so it catches all error
app.use(shared.middleware.errorHandler());
```

### Request logger
```js
// Should come right after error handler so it logs all requests and times the entire flow
app.use(shared.middleware.requestLogger());
```

### Swagger Model Validator
- For use with fleek-router
- Adds validation according to models defined in swagger file
```js
fleekRouter(app, {
  ...
  middleware: [ shared.middleware.swaggerModelValidator() ]
});
```

## Utils

### waitForConnection
- Returns a promise that will be resolved when host is available
- Rejected after all the retries have been exhausted
```
shared.utils.waitForConnection({ host: 'http://www.api.com', port: 8080 }, [retries=6]);
// or
shared.utils.waitForConnection({ path: 'http://www.api.com:8080' }, [retries=6]);
```

### messageBus
- Allows to Publish a single message to AWS SNS topic:
```
yield messageBus.publish(notifications.eventType.APARTMENT_CREATED, { apartment_id: 1, user_uuid: '211312-4123123-5344-234234-2343' });
```
- Allows to consume messages from AWS SQS queue which is subscriber of AWS SNS topic.
- Start queue consumer:
```
let consumer = yield messageBus.consume.start(function (message, done) {
  logger.debug('Message content', message);
  // do some work with `message`
  done();
}); 
``` 
- Stop queue consumer:
```
yield consumer.stop();
``` 

### userManagement
- Allows to get user details object from auth0 API:
```
let userDetails = yield userManagement.getUserDetails(message.dataPayload.uuid);
```

## How to test
- Run unit tests using ``yarn test``
