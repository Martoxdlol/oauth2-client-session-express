import { Router } from 'express'
import { createSessionMiddleware } from './session'
import axios from 'axios'

export interface RawUser {
    [key: string]: any
}

export type User = any

export class AuthError extends Error {
    constructor(error_message) {
        super(error_message)
        this.message = error_message
    }
}

export type AuthSettings = {
    endpoints_prefix?: string,
    oauth_login_url: string,
    access_token_url: string,
    account_url: string,
    client_id: string,
    client_secret: string,
    redirect_uri: string,
    account_username_key?: string,
    auth_ok_uri?: string,
    auth_err_uri?: string,
    signout_next_url?: string,
    onFetchedUser: (user: RawUser) => User | AuthError | false | null | Promise<User | AuthError | false | null>,
    userIsAdmin: (user: User) => boolean
}

export function createAuthMiddleware(settings: AuthSettings) {
    const authRouter = Router()

    let endpoints_prefix = settings.endpoints_prefix || '/auth'

    authRouter.get(endpoints_prefix + '/login', (req, res) => {
        const u = new URL(settings.oauth_login_url)
        u.searchParams.set('client_id', settings.client_id)
        u.searchParams.set('redirect_uri', settings.redirect_uri)
        res.redirect(u.href)
    })

    authRouter.get(endpoints_prefix + '/callback', async (req, res) => {
        const d = '[' + Date.now() + ']'

        console.log(d, "Oauth callback with code:", req.query.code)


        try {
            //Get access token
            let response = await axios.post(settings.access_token_url, null, {
                params: {
                    code: req.query.code + "",
                    ...settings
                }
            })

            const access_token = response.data.access_token
            console.log(d, "Fetched access token", access_token)

            // Get account info
            response = await axios.get(settings.account_url, { params: { access_token } })
            console.log(d, "Fetched account info", JSON.stringify(response.data).substring(0, 100))


            // Convert raw account info into a useful User object
            const userRawData = response.data
            let user
            let error
            if (settings.onFetchedUser) {
                // Use user function to convert raw to user
                try {
                    const r = await settings.onFetchedUser(userRawData)
                    if (r instanceof Error) {
                        error = r
                    } else {
                        user = r
                    }
                } catch (err) {
                    if (err instanceof AuthError) {
                        error = err
                    } else {
                        error = new AuthError('Internal error')
                    }
                }
            } else {
                // Use raw as user. Set username key
                user = userRawData
                if (settings.account_username_key) user.username = userRawData[settings.account_username_key]
            }

            if (user && !error) {
                // Redirect user if auth ok
                req.session.user = user
                req.session.access_token = access_token
                req.session.admin = settings.userIsAdmin(req.session.user)

                console.log(d, 'User OK', 'setting session', JSON.stringify(req.session).substring(0, 100))

                res.redirect(settings.auth_ok_uri ?? '/')
            } else {
                throw error
            }
        } catch (error) {
            console.log("AUTH ERROR", error + '')
            const u = new URL(settings.auth_err_uri ?? '/', 'https://localhost/')
            if (error instanceof AuthError) {
                // Show error if not internal
                u.searchParams.set('error', 'login')
                u.searchParams.set('login_error_message', error.message)
            }
            res.redirect(u.pathname + u.search + u.hash)
        }
    })

    authRouter.get(endpoints_prefix + '/signout', (req, res) => {
        req.session?.destroy ? req.session.destroy() : req.session = {}
        res.redirect(settings.signout_next_url ?? '/')
    })

    authRouter.get(endpoints_prefix + '/session', (req, res) => {
        if (req.session && req.session.user) {
            res.json({
                user: req.session.user,
                admin: settings.userIsAdmin(req.session.user),
            })
        } else {
            res.json(null)
        }
    })

    return authRouter
}

export { createSessionMiddleware }