import app from "./app";

Bun.serve({
  fetch: app.fetch,
  port:5000,
  error:(e)=>{
    console.error("An error occured" + e.cause)
  }
});