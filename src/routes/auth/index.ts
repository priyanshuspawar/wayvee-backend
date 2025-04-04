import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { userInsertSchema, users } from "../../db/schema/users";
import db from "../../db";
import { generateOtp, getAuthenticatedUser, sessionManager } from "./functions";
import { sendMailOtp } from "../../services/mailer";
import redisClient from "../../redis/index";


const authSchema = z.object({
    email: z.string().email({ message: "is not valid email" })
})
const otpSchema = z.object({
    email: z.string().email({ message: "Please enter valid email address" }),
    otp: z.string().length(6, { message: "not valid otp" })
})

const authRoute = new Hono()
    .post("/",zValidator("json", authSchema), async (c) => {
        try {
            const {
                email
            } = c.req.valid("json");
            const user = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.email, email) })
            if (!user) {
                return c.json({
                    message: "User does not exists",
                })
            }
            const otp = generateOtp()
            await sendMailOtp(email, otp)
            const hashOtp = await Bun.password.hash(otp)
            await redisClient.set(`${email}-otp`, hashOtp, {
                "EX": 600
            })
            return c.json({
                message: "Authentication sucess check your mail for otp verification"
            })
        } catch (error) {
            console.error("failed to load api response")
            return c.json({ message: "failed to authenticate user", error }, 500)
        }
    })
    .post("/verify-otp", zValidator("json", otpSchema), async (c) => {
        try {
            const { otp, email } = c.req.valid("json")
            const hashOtp = await redisClient.get(`${email}-otp`)
            if(!hashOtp){
                return c.json({message:"Otp expired please try again"},401)
            }
            const isValidOtp = Bun.password.verify(otp,hashOtp)
            if(!isValidOtp){
                return c.json({message:"Not valid otp please try again"},400)
            }
            await redisClient.del(`${email}-otp`)
            const logged_in_user = await db.query.users.findFirst({where:(users,{eq})=>eq(users.email,email)})
            if(!logged_in_user){
                return c.json({message:"User not found"},404)
            }
            await sessionManager(c).setsessionItem(logged_in_user.id)
            return c.json({message:"verified"})
        }
        catch (err) {
            return c.json({message:"Failed to verify user"},500)
        }
    })
    .post("/register", zValidator("json", userInsertSchema), async (c) => {
        try {
            const registerFields = c.req.valid("json")
            //check user exits
            const userExists = await db.query.users.findFirst({ where: (users, { eq, and }) => and(eq(users.phoneNumber, registerFields.phoneNumber), eq(users.email, registerFields.email)) })
            if (userExists) {
                return c.json({ message: "User already exists" }, 409)
            }
            const [new_user] = await db.insert(users).values(registerFields).returning({ id: users.id })
            const session_manager = sessionManager(c)
            await session_manager.setsessionItem(new_user.id)
            return c.json({
                message: "User created successfully"
            })
        } catch (error) {
            console.error(error)
            return c.json({
                message: "An unknown error occured"
            }, 500)
        }
    })



export default authRoute;

