import { createClient } from "redis"

const client = createClient ({
  url : "rediss://default:AdcQAAIjcDFhYWE3NjcxNTk5MjY0MmE0YjM4MzRlOGY3MzgzMmJiN3AxMA@adapting-yak-55056.upstash.io:6379"
});

client.on("error", function(err) {
  console.log("Failed to connect redis store");
});

export default client;