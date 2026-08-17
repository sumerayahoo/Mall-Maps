import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cuesFromText, describeImage, rank, type SearchResult } from "./visual-search.server";

export const visualSearch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        query: z.string().max(200).optional(),
        image: z.string().max(8_000_000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<SearchResult> => {
    const note = data.query?.trim() ?? "";
    let interpretation = note;
    let usedAi = false;

    if (data.image) {
      const described = await describeImage(data.image, note);
      if (described) {
        interpretation = described;
        usedAi = true;
      } else if (!note) {
        interpretation = "pink handbag";
      }
    }

    return { interpretation, matches: rank(cuesFromText(interpretation)), usedAi };
  });