import { type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import type { User } from "../../db/schema/users";


type Env = {
    Variables: {
        user: User;
    };
};

type SessionManager = {
    getSessionItem: (key: string) => Promise<string | undefined>;
    setsessionItem: (key: string, value: unknown) => Promise<void>;
    removeSessionItem: (key: string) => Promise<void>;
    destroySession: () => Promise<void>;
}

const checkAuthIfUserAuthenticated = async()=>{
    try {
        
    } catch (error) {
        
    }
}


export const sessionManager = (c: Context): SessionManager => ({
    async getSessionItem(key: string) {
        const result = getCookie(c, key)
        return result
    },
    async setsessionItem(key: string, value: unknown) {
        const cookieoptions = {
            httpOnly: true,
            secure: process.env?.NODE_ENV === "production",
        }
        if (typeof value === "string") {
            setCookie(c, key, value, cookieoptions)
        }
        else {
            setCookie(c, key, JSON.stringify(value), cookieoptions)
        }
    },
    async removeSessionItem(key: string) {
        deleteCookie(c, key)
    },
    async destroySession() {
        ["id_token", "access_token", "user", "refresh_token"].forEach((key) => {
            deleteCookie(c, key);
        });
    }

})



export const getUser = createMiddleware<Env>(async (c, next) => {
    try {
        const manager = sessionManager(c);
        // const isAuthenticated = await 
    } catch (error) {
        
    }
})