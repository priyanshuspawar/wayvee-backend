import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { userInsertSchema } from "../../db/schema/users";
import db from "../../db";

const authSchema = z.object({
    email:z.string().email({message:"is not valid email"})
})

const authRoute = new Hono()
.post("/",zValidator("json",authSchema),async (c)=>{
    try {
        const {
            email
        } = c.req.valid("json");
        return c.json({
            message:"User does not exists",
        })
    } catch (error) {
        console.error("failed to load api response")
    }
})
.post("/register",zValidator("json",userInsertSchema),async(c)=>{
    try {
        const registerFields = c.req.valid("json")
        //check user exits
        const userExists = await db.query.users.findFirst({where:(users,{eq,and})=>and(eq(users.phoneNumber,registerFields.phoneNumber),eq(users.email,registerFields.email))})
        if(userExists){
            return c.json({message:"User already exists"},409)
        }
        return c.json({
            message:"user"
        })
    } catch (error) {
        console.error(error)
    }
})



export default authRoute;

