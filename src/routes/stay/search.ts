// src/routes/stay/search.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { eq, ilike, or, sql } from "drizzle-orm";
import db from "../../db";
import { stays } from "../../db/schema";

const searchStaySchema = z.object({
  query: z.string().min(1).optional(),
  page: z.string().min(1).default("1").optional(),
  limit: z.string().min(1).default("10").optional(),
});

const searchRoute = new Hono().get(
  "/",
  zValidator("query", searchStaySchema),
  async (c) => {
    try {
      console.log("Search endpoint called with query:", c.req.query());

      const { query, page, limit } = c.req.valid("query");
      const pageNumber = parseInt(page || "1");
      const limitNumber = parseInt(limit || "10");
      const offset = (pageNumber - 1) * limitNumber;

      // If no query is provided, return all stays with pagination
      if (!query || query.trim() === "") {
        console.log("No query provided, returning all stays");
        const allStays = await db.query.stays.findMany({
          columns: {
            id: true,
            perks: true,
            title: true,
            rating: true,
            pricePerNight: true,
            baseGuest: true,
            displayImages: true,
            discount: true,
            location: true,
          },
          where: (stays) => eq(stays.isPublished, true),
          limit: limitNumber,
          offset: offset,
        });

        const totalCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(stays)
          .where(eq(stays.isPublished, true));

        console.log(`Found ${allStays.length} stays`);

        return c.json({
          message: "Fetched stays",
          data: allStays || [], // Ensure we always return an array
          pagination: {
            total: totalCount[0]?.count || 0,
            page: pageNumber,
            limit: limitNumber,
            pages: Math.ceil((totalCount[0]?.count || 0) / limitNumber),
          },
        });
      }

      console.log(`Searching for stays with query: "${query}"`);

      // Search by title or perks
      let searchResults;
      try {
        searchResults = await db.query.stays.findMany({
          columns: {
            id: true,
            perks: true,
            title: true,
            rating: true,
            pricePerNight: true,
            baseGuest: true,
            displayImages: true,
            discount: true,
            location: true,
          },
          where: (staysTable, { and, or, eq, ilike }) =>
            and(
              eq(staysTable.isPublished, true),
              or(
                ilike(staysTable.title || "", `%${query}%`),
                // Safer approach to array search
                sql`EXISTS (SELECT 1 FROM unnest(${
                  staysTable.perks
                }) AS perk WHERE perk ILIKE ${`%${query}%`})`
              )
            ),
          limit: limitNumber,
          offset: offset,
        });

        console.log(`Search found ${searchResults.length} results`);
      } catch (dbError) {
        console.error("Database search error:", dbError);
        searchResults = [];
      }

      // Get total count for pagination
      let totalCount;
      try {
        totalCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(stays)
          .where(
            or(
              ilike(stays.title || "", `%${query}%`),
              sql`EXISTS (SELECT 1 FROM unnest(${
                stays.perks
              }) AS perk WHERE perk ILIKE ${`%${query}%`})`
            )
          );
      } catch (countError) {
        console.error("Count query error:", countError);
        totalCount = [{ count: 0 }];
      }

      return c.json({
        message: "Search results",
        data: searchResults || [], // Ensure we always return an array
        pagination: {
          total: totalCount[0]?.count || 0,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil((totalCount[0]?.count || 0) / limitNumber),
        },
      });
    } catch (error) {
      console.error("Search error:", error);
      // Return a proper error response with valid JSON
      return c.json(
        {
          message: "Failed to search stays",
          error: error?.message || "Unknown error",
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            pages: 0,
          },
        },
        500
      );
    }
  }
);

export default searchRoute;
