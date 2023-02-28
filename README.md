# oauth2-client-session-express

```ts
import { createAuthMiddleware, createSessionMiddleware } from 'oauth2-client-session-express'

const app = express()

// Manage express-session
const sessionMiddleware = createSessionMiddleware()

// Manage authentication
const authMiddleware = createAuthMiddleware({
    endpoints_prefix: '/auth',
    oauth_login_url: 'https://oauth.some-server.com/oauth2/login/authorize',
    access_token_url: 'https://oauth.some-server.com/oauth2/login/access_token',
    account_url: 'https://oauth.some-server.com/api/account/info',
    client_id: 'fedcba0987654321',
    client_secret: 'abcdef123467890abcdef123467890',
    redirect_uri: 'https://mysite/auth/callback',
    account_username_key: 'user_account_name_identifier',
    auth_ok_uri: '/app',
    auth_err_uri: '/login',
    signout_next_url: '/',
    onFetchedUser: (rawUserData) => {
        if(rawUserData.age < 18) throw new AuthError('User is under 18')

        const isAdmin = userRawData.id == 100

        const user = new User(rawUserData.id, rawUserData.name, {
            admin: isAdmin
        })

        return user
    },
    userIsAdmin: (user) => user.isAdmin
})

app.use(sessionMiddleware)
app.use(authMiddleware)

app.get('/login', (req, res) => {
    res.render('login', {
        login_button_url: '/auth/login'
    })
})

app.get('/signout', (req, res) => {
    res.render('signout', {
        signout_button_url: '/auth/signout'
    })
})


app.listen(8080)

```