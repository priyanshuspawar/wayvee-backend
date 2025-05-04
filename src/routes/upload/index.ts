import { Hono } from "hono";
import { nanoid } from "nanoid";
import { UTApi } from "uploadthing/server";
import { getAuthenticatedUser } from "../auth/functions";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const utapi = new UTApi();

const uploadRoute = new Hono()
  .post("/", async (c) => {
    try {
      const body = await c.req.parseBody({ all: true });

      let files = body["files"];

      // 🔁 Normalize to array
      if (!files) {
        return c.json({ message: "No files uploaded" }, 400);
      }

      if (!Array.isArray(files)) {
        files = [files];
      }

      const validatedFiles: File[] = [];

      for (const file of files) {
        if (!(file instanceof File)) {
          console.warn("Skipping invalid file:", file);
          continue;
        }

        if (!file.type?.startsWith("image/")) {
          return c.json({ message: "Please upload images only" }, 400);
        }

        validatedFiles.push(file);
      }

      const uploadResult = await Promise.all(
        validatedFiles.map(async (file) => {
          const id = nanoid(8);
          const fileObj = new File([file], id); // Optional: Wrap again for naming
          const upload = await utapi.uploadFiles(fileObj);
          return upload.data;
        })
      );

      const uploadedImages = uploadResult.map((v) => ({
        imgUrl: v?.ufsUrl || "",
        id: v?.key,
      }));

      return c.json({ message: "Finished upload", data: uploadedImages });
    } catch (err) {
      console.error(err);
      return c.json({ message: "Error uploading" }, 500);
    }
  })
  .delete(
    "/",
    getAuthenticatedUser,
    zValidator("json", z.object({ keys: z.array(z.string()) })),
    async (c) => {
      try {
        const { keys } = c.req.valid("json");
        if (keys.length === 0) {
          return c.json({ message: "No files found" }, 403);
        }
        const res = await utapi.deleteFiles(keys);
        return c.json({ message: "Files removed successfully" });
      } catch (error) {
        return c.json(
          { message: "Error occured while removing your files" },
          500
        );
      }
    }
  )
  .post("/government_id", getAuthenticatedUser, async (c) => {
    try {
      const body = await c.req.parseBody();
      const id_file = body["file[]"] as File;
      const uploadResult = await utapi.uploadFiles(
        new File([id_file], `govt-id-user-${c.get("user").id}`)
      );
      const img_url = uploadResult.data?.ufsUrl;
      const key = uploadResult.data?.key;
      if (!img_url) {
        return c.json({ message: "Failed to upload government id" }, 400);
      }
      return c.json({
        message: "Finished upload",
        data: { govtIdUrl: img_url, key },
      });
    } catch (error) {
      return c.json({ message: "Error uploading" }, 500);
    }
  })
  .delete(
    "/government_id",
    zValidator("json", z.object({ key: z.string() })),
    getAuthenticatedUser,
    async (c) => {
      try {
        const { key } = c.req.valid("json");
        await utapi.deleteFiles(key);
        return c.json({ message: "Government ID removed successfully" });
      } catch (error) {
        return c.json({ message: "error removing your government id" }, 500);
      }
    }
  );

export default uploadRoute;
