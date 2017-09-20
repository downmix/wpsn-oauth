require('dotenv').config()

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const csurf = require('csurf')
const flash = require('connect-flash')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const GitHubStrategy = require('passport-github').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy
const KakaoStrategy = require('passport-kakao').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const InstagramStrategy = require('passport-instagram').Strategy
const bcrypt = require('bcrypt')

const util = require('./util')
const query = require('./query')
const mw = require('./middleware')

const PORT = process.env.PORT || 3000

const app = express()

app.set('view engine', 'pug')
app.set('trust proxy')

app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieSession({
  name: 'oasess',
  keys: [
    process.env.SECRET
  ]
}))
app.use(flash())
app.use(csurf())
app.use(mw.insertReq)
app.use(mw.insertToken)
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
  done(null, `${user.provider}:${user.provider_user_id}`)
})

passport.deserializeUser((str, done) => {
  const [provider, provider_user_id] = str.split(':')
  query.firstOrCreateUserByProvider(provider, provider_user_id)
    .then(user => {
      if (user) {
        done(null, user)
      } else {
        done(new Error('해당 정보와 일치하는 사용자가 없습니다.'))
      }
    })
})

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  const avatar_url = profile.photos[0] ? profile.photos[0].value : null;
  const user_name = profile.username ? profile.username : null;
  query.firstOrCreateUserByProvider(
    'github',
    profile.id,
    accessToken,
    avatar_url,
    user_name
  ).then(user => {
    done(null, user)
  }).catch(err => {
    done(err)
  })
}))

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  const avatar_url = profile.photos[0] ? profile.photos[0].value : null;
  const user_name = profile.displayName ? profile.displayName : null;
  query.firstOrCreateUserByProvider(
    'google',
    profile.id,
    accessToken,
    avatar_url,
    user_name
  ).then(user => {
    done(null, user)
  }).catch(err => {
    done(err)
  })
}))

passport.use(new KakaoStrategy({
  clientID: process.env.KAKAO_CLIENT_ID,
  clientSecret: process.env.KAKAO_CLIENT_SECRET,
  callbackURL: process.env.KAKAO_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  const avatar_url = profile._json.properties.profile_image ? profile._json.properties.profile_image : null;
  const user_name = profile.displayName ? profile.displayName : null;
  query.firstOrCreateUserByProvider(
    'kakao',
    profile.id,
    accessToken,
    avatar_url,
    user_name
  ).then(user => {
    done(null, user)
  }).catch(err => {
    done(err)
  })
}))

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  const avatar_url = profile.profileURl ? profile.profileURl : null;
  const user_name = profile.displayName ? profile.displayName : null;
  query.firstOrCreateUserByProvider(
    'facebook',
    profile.id,
    accessToken,
    avatar_url,
    user_name
  ).then(user => {
    done(null, user)
  }).catch(err => {
    done(err)
  })
}))

passport.use(new LocalStrategy((username, password, done) => {
  console.log(username, '<< [ userid ]');
  query.getLocalUserById(username)
    .then(matched => {
      console.log(matched, '<< [ matched ]');
      if(matched && bcrypt.compareSync(password, matched.access_token)){
        done(null, matched);
      }else{
        done(new Error('사용자 이름 혹은 비밀번호가 일치하지 않습니다.'));
      }
    })
}))

app.get('/', mw.loginRequired, (req, res) => {
  res.render('index.pug', req.user)
})

app.get('/login', (req, res) => {
  res.render('login.pug', {errors: req.flash('error'), csrfToken: req.csrfToken()})
})

app.post('/logout', (req, res) => {
  req.logout()
  res.redirect('/login')
})

app.get('/register', (req, res) => {
  res.render('register.pug', {csrfToken: req.csrfToken()})
})

app.post('/register', (req, res) => {
  query.createUser(req.body.id, bcrypt.hashSync(req.body.password, 10), req.body.username)
    .then(() => {
      req.session.id = req.body.id;
      res.redirect('/');
    })
})

app.get('/auth/github', passport.authenticate('github'))

app.get('/auth/github/callback', passport.authenticate('github', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/auth/kakao', passport.authenticate('kakao'));

app.get('/auth/kakao/callback', passport.authenticate('kakao', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.post('/auth/local', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.listen(PORT, () => {
  console.log(`listening ${PORT}...`)
})
