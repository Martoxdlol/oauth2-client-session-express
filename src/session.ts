import session from 'express-session'
import { Router } from 'express'
import express from 'express'
import { User } from './index'

import cookieSession from 'cookie-session'

import { createClient } from 'redis'
import connectRedis from 'connect-redis'

interface CreateSessionSettings {
    storedUserToUserObject?: (userJSON: any) => User,
    useMiddlewareFunction?: (req: any, res: any, next: Function) => void
    useRedis?: boolean,
    redisUrl?: string,
    sessionSecret: string,
    expires?: Date | number | null,
    extraSessionSettings?: Object,
}

export function createSessionMiddleware({ storedUserToUserObject, redisUrl, useRedis, expires, sessionSecret, extraSessionSettings, useMiddlewareFunction }: CreateSessionSettings) {

    const router = Router()

    router.use(express.json())

    const cookie = { expires: expires === undefined ? new Date(253402300000000) : new Date(expires) }

    if (useRedis === undefined || useRedis === true) {

        const redisClient = createClient({
            legacyMode: true,
            url: redisUrl,
        })

        const RedisStore = connectRedis(session)

        redisClient.connect()

        router.use(
            session({
                store: new RedisStore({ client: redisClient }),
                saveUninitialized: false,
                secret: sessionSecret,
                resave: false,
                cookie,
                ...extraSessionSettings,
            })
        )
    } else {
        router.use(
            cookieSession({
                secret: sessionSecret,
                signed: true,
                cookie,
                ...extraSessionSettings,
            })
        )

    }



    router.use((req, res, next) => {
        const d = '[' + Date.now() + ']'

        console.log(d, 'New request', req.method, req.url, 'session:', JSON.stringify(req.session).substring(0, 100))

        if (req.session && req.session.user) {

            req.logged_in = true
            req.admin = req.session.admin

            try {
                if (storedUserToUserObject) {
                    req.session.user = storedUserToUserObject(req.session.user)
                }
            } catch (error) {
                console.error(error)
            }

        } else {
            req.logged_in = false
        }

        console.log(d, 'logged_in:', req.logged_in, 'admin:', req.admin)
        if (req.logged_in) {
            console.log(d, 'user', JSON.stringify(req.session.user).substring(0, 120))
        }

        next()
    })

    if (useMiddlewareFunction) router.use(useMiddlewareFunction)

    return router
}