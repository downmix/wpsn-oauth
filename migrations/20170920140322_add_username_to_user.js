
exports.up = function(knex, Promise) {
  return knex.schema.alterTable('user', t => {
    t.string('user_name')
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.alterTable('user', t => {
    t.dropColumn('user_name')
  })
};
