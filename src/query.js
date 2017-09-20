const knex = require('./knex')
const bcrypt = require('bcrypt')
const validator = require('validator')

module.exports = {
  firstOrCreateUserByProvider(provider, provider_user_id, access_token=null, avatar_url, user_name) {
    return knex('user')
      .where({
        provider,
        provider_user_id
      })
      .first()
      .then(user => {
        if (user) {
          return user
        } else {
          return knex('user')
            .insert({
              provider,
              provider_user_id,
              access_token,
              avatar_url,
              user_name
            })
            .then(([id]) => {
              return knex('user')
                .where({id})
                .first()
            })
        }
      })
  },
  getUserById(id) {
    return knex('user')
      .where({id})
      .first()
  },
  getLocalUserById(provider_user_id){
    return knex('user')
      .where({'provider': 'local', provider_user_id})
      .first()
  },
  createUser(id, password, username){
    return knex('user')
      .insert({
        'provider': 'local',
        'provider_user_id': id,
        'access_token': password,
        'user_name': username
      })
  }
}
