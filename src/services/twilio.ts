import twilio from "twilio"
import z from "zod"

const twillo_credentials = z.object({
    TWILIO_ACCOUNT_SID:z.string(),
TWILIO_AUTH_TOKEN:z.string(),
TWILIO_SERVICE_SID:z.string()
}).safeParse(process.env)

if(!twillo_credentials.success){
    console.error("❌ Invalid environment variables:", twillo_credentials.error.format());
    process.exit(1); // Stop execution if validation fails
}


const client = twilio(twillo_credentials.data.TWILIO_ACCOUNT_SID,twillo_credentials.data.TWILIO_AUTH_TOKEN)

client.verify.v2.services(twillo_credentials.data.TWILIO_SERVICE_SID)
      .verificationChecks
      .create({to:"",code:'[Code]'})