# dorbel-shared library
> Shared library for use in dorbel services.

## How to add to project :
- In package.json :
```js
"dependencies": {
    "dorbel-shared": "file:../dorbel-shared",
```
- Then run ``npm install``

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
- bunyan logs in JSON format. For human readable logs start your application using ``npm start | bunyan``
### Config
```js
// Config folder should hold json files with environment names (e.g. development.json)
shared.config.setConfigFileFolder(__dirname + '/config');
shared.config.get('CONFIG_KEY_NAME');
```

## Koa middleware

### Request logger
```js
const app = koa();
// Should come first so it logs all requests and times the entire flow
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
## How to test
- Run unit tests using ``npm test``
