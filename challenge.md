# Noteful Challenge - Integration Testing

In this challenge you will re-implement testing on the Noteful app, this time we a real database. So first, you'll create a new separate database, then you'll re-implement the tests. Along the way well set up `beforeEach` and `afterEach` hooks to clear and re-seed the database. And you'll update the tests to cross-check the API results against the database.

## Requirements

* Update server.js to prevent `app.listen` from running during tests
* Install NPM Dev-Dependencies for testing
* Add a `test` property to knexfile.js
* Create a test database
* Create Seed Data

## Setup Mocha/Chai tests

### Install NPM Dev-Dependencies for testing

```sh
npm install mocha chai chai-http chai-spies
```

### Configure NPM script to run tests

```json
  "scripts": {
    "start": "node server.js",
    "test": "mocha --exit"
  },
```

### Update server.js

#### Prevent `app.listen` execution and export `app`

```js
// Listen for incoming connections
if (require.main === module) {
  app.listen(PORT, function () {
    console.info(`Server listening on ${this.address().port}`);
  }).on('error', err => {
    console.error(err);
  });
}

module.exports = app; // Export for testing
```

### Create `/test/server.test.js` file

Copy [this gist](https://gist.github.com/cklanac/ead56e13159c7729f4cf9d0bcba70af8) into `server.test.js`. The tests are essentially the same as the previous challenges, with just a few minor tweaks to account for database persistence.

### Run Test Suite

```sh
npm test
```

Depending on the state of your application you may need to make adjustments to the tests or the endpoints to get the tests to run properly.

### Create a test database

```sh
createdb -u dev noteful-test
```

### Create a `seedData` module

Create a folder named `seed` in the `/db` directory and create an `index.js` file. The entire path should look like `./db/seed/index.js`. In the file, copy the following.

```js
const knex = require('../../knex');

function seedDataFolders() {
  const folders = require('./folders');
  return knex('folders').del()
    .then(() => knex('folders').insert(folders));
}

function seedDataTags() {
  const tags = require('./tags');
  return knex('tags').del()
    .then(() => knex('tags').insert(tags));
}

function seedDataNotes() {
  const notes = require('./notes');
  return knex('notes').del()
    .then(() => knex('notes').insert(notes));
}

function seedDataNotesTags() {
  const notes_tags = require('./notes_tags');
  return knex('notes_tags').del()
    .then(() => knex('notes_tags').insert(notes_tags));
}

function seedData() {
  return Promise.all([seedDataFolders(), seedDataTags()])
    .then(() => seedDataNotes())
    .then(() => seedDataNotesTags());
}

module.exports = seedData;
```

Now copy in each of the `.json` files from this [gist](https://gist.github.com/cklanac/10fafd70722e6f67f580883a5464810f)

In a scratch file, run the seed data script to get an understanding of the implementation.


## Set up Environments

Before proceeded we should discuss environments and environment variables.

Environments refer to where the application is running and the purpose they server. Generally, there are 3 primary environments: "development", "testing" and "production". Each environment has its own set of resources like web servers and databases which are isolated from the others. You don't want your development or testing environment to accidentally change your production environment.

* The "development" environment typically refers to your local programming environment like you laptop along with other resources you use for development like a development database. It could also refer to cloud resources like Cloud-9 or mLab and ElephantSQL when used for development. The development environment is usually is continuous flux as new feature are added and requirements change.

* The "testing" (or "test") environment refers to a relatively stable environment where tests can be run. A true "testing" environment has its own set of resources like web servers and databases and is isolated from development and production.

* The "production" environment refers to the live application and database. This is the server your customers interact with when accessing your application. This is a very stable environment where changes are cautiously applied so bugs are not introduced to your users.

In-the-wild, you may also encounter "QA" and "Staging" environments where quality assurance testers check features before be approved and changes are "staged" for deployment to Production. Each business has its own requirements so each has its own set of environments.

Generally, the separation between environments is clear, except for testing. Before you push your code to source control you should test your in order to prevent bugs from distributed to your co-workers or to production. This means running the application in test mode on your development machine. And this is where `process.env.NODE_ENV` comes into play.

Your shell has several environment variables. Each time node starts, it sets the name and value of these variables to the  `process.env` object. And by convention, the `NODE_ENV` environment variable is set to the name of the environment ('development', 'test' or 'production'). 

Each OS and shell sets and uses environment variable differently. Luckily, the `cross-env` NPM package to solves the problem. Let's install and use it now.

### Install cross-env to help configure environments

In your shell type the following:

```sh
npm install cross-env --save-dev
```

### Update `npm test` script in `package.json`

Update your `test` script command in `package.json` to match the following. This will set the `NODE_ENV` to test everytime you run your test suite using the `npm test` command.

```json
...
  "scripts": {
      "start": "node server.js",
      "test": "cross-env NODE_ENV=test mocha"
    },
  ...
```

### Add a `test` property to knexfile.js

Update the `knexfile.js` to include a `test` property with a `TEST_DATABASE_URL` which defaults to your local test database.

The complete `knexfile.js` will look like this.

```js
module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://localhost/noteful',
    debug: true, // http://knexjs.org/#Installation-debug
    pool: {min : 1 , max : 2}
  },
  test: {
    client: 'pg',
    connection: process.env.TEST_DATABASE_URL || 'postgres://localhost/noteful-test',
    pool: {min : 1 , max : 2}
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL
  }
};
```

### Update `server.test.js` to verify environment

Add the following `describe` block after the "Reality Check" block

```js
describe('Environment', () => {

  it('NODE_ENV should be "test"', () => {
    expect(process.env.NODE_ENV).to.equal('test');
  });

  it('connection should be test database', () => {
    expect(knex.client.connectionSettings.database).to.equal('noteful-test');
  });

});
```

Run your tests using `npm test` to confirm the setup is correct.

### Configure the Tests Hooks to seed the database before each test

Add the following to `server.test.js`

```js
const knex = require('../knex');
const seedData = require('../db/seed');

/// REMOVED FOR BREVITY

before(function () {
  // noop
});

beforeEach(function () {
  return seedData();
});

afterEach(function () {
  // noop
});

after(function () {
  // destroy the connection
  return knex.destroy();
});
```

Let's break it down:

* `npm test` runs ==>> `cross-env NODE_ENV=test mocha --exit`
  * `cross-env NODE_ENV=test` sets the `process.env.NODE_ENV` to 'test'
  * `mocha --exit` finds and executes the test files.
* The first line of the test file is `const app = require('../server');`
  * That loads the `server.js` which in-turn loads all the routes
  * And requires in `app` which we'll connect to using chai-http`
* Then it calls `const knex = require('../knex');`
  * The `knex.js`...
    * Loads `knexfile.js` which contains 3 environments
    * Grabs the current `const environment = process.env.NODE_ENV || 'development';`
    * Connects to the correct DB based on the environment
      * `require('knex')(knexConfig[environment]);`
* Load, but don't execute, yet. `const seedData = require('../db/seed');`
* The test suite is ready to run
  * `before` all tests run. We don't need it this time so `noop`
    * `beforeEach` test runs, execute `seedData`
      * `seedData` runs the 4 seed methods you built earlier. Each:
        * Loads a `.json` file with seed data
        * Runs `.insert()` with the seed data
        * Returns a promise
    * A **single** test runs...
    * `afterEach` is called which deletes all the data
    * Go back to `beforeEach` until all tests are completed
  * `after` all tests run, `.destroy()` the database connection
* Test Suite run is finished, output results to terminal :-)

### Update your tests to cross-check the DB

Now you are ready to update your test suite to to cross check the API results against the database. Below are 3 examples which show common approaches. Use these are guides to implement your own integrations tests

First query the database to get the count of notes, then call the API and verify the response length is the same as the database count

```js
  it('should return the default of 10 Notes ', function () {
    let count;
    return knex.count()
      .from('notes')
      .then(([result]) => {
        count = Number(result.count);
        return chai.request(app).get('/v2/notes');
      })
      .then(function (res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(count);
      });
  });
```

In the example you'll call to the API with a `searchTerm` and then perform the same query against the database. And compare the results. You'll chain these requests using `.then()`

```js
  it('should return correct search results for a searchTerm query', function () {
    let res;
    return chai.request(app).get('/v2/notes?searchTerm=gaga')
      .then(function (_res) {
        res = _res;
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(1);
        expect(res.body[0]).to.be.an('object');
        return knex.select().from('notes').where('title', 'like', '%gaga%');
      })
      .then(data => {
        expect(res.body[0].id).to.equal(data[0].id);
      });
  });
```

In the example you'll query the database and call the api then compare the results. But this time you'll use `Promise.all()` so the async requests can be made simultaneously, and you can compare the results with create a variable at a higher scope.

```js
  it('should search by folder id', function () {
    const dataPromise = knex.select()
      .from('notes')
      .where('folder_id', 103)
      .orderBy('notes.id');

    const apiPromise = chai.request(app)
      .get('/v2/notes?folderId=103');

    return Promise.all([dataPromise, apiPromise])
      .then(function ([data, res]) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(2);
        expect(res.body[0]).to.be.an('object');
      });
  });
```

When creating, you will `.post()` the new document to the endpoint, then using the id returned, query the database and verify it was saved correctly

```js
  it('should create and return a new item when provided valid data', function () {
    const newItem = {
      'title': 'The best article about cats ever!',
      'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...',
      'tags': []
    };
    let body;
    return chai.request(app)
      .post('/v2/notes')
      .send(newItem)
      .then(function (res) {
        body = res.body;
        expect(res).to.have.status(201);
        expect(res).to.have.header('location');
        expect(res).to.be.json;
        expect(body).to.be.a('object');
        expect(body).to.include.keys('id', 'title', 'content');
        return knex.select().from('notes').where('id', body.id);
      })
      .then(([data]) => {
        expect(body.title).to.equal(data.title);
        expect(body.content).to.equal(data.content);
      });
  });
```