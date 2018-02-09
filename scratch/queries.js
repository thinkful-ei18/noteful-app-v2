'use strict';

const knex = require('../knex');

knex.select()
  .from('notes')
  .where('id', 1005)
  .then(([data]) => {
    console.log(data.id);
    console.log(data.title);
    console.log(data.content);
  })
  .catch(err => {
    console.log(err);
  })
  .then(() => {
    knex.destroy();
  });

