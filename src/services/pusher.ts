import Pusher from "pusher";
import z from "zod";

const pusherCredentialsSchema = z
  .object({
    PUSHER_APP_ID: z.string(),
    PUSHER_KEY: z.string(),
    PUSHER_SECRET: z.string(),
    PUSHER_CLUSTER: z.string(),
  })
  .safeParse(process.env);

if (!pusherCredentialsSchema.success) {
  console.error(
    "❌ Invalid Pusher environment variables:",
    pusherCredentialsSchema.error.format()
  );
  process.exit(1); // Stop execution if validation fails
}

const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } =
  pusherCredentialsSchema.data;

const pusher = new Pusher({
  appId: PUSHER_APP_ID,
  key: PUSHER_KEY,
  secret: PUSHER_SECRET,
  cluster: PUSHER_CLUSTER,
  useTLS: true,
});

export enum PusherEvents {
  NEW_MESSAGE = "new-message",
  MESSAGE_READ = "message-read",
  TYPING = "typing",
}

export default pusher;
