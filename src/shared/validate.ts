import { z } from "zod";

export const extractorSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("domTextRegex"),
    key: z.string(),
    pattern: z.string(),
    scope: z.enum(["header", "nav", "body"]).optional(),
    firstMatchOnly: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("meta"),
    key: z.string(),
    name: z.string(),
  }),
  z.object({
    type: z.literal("titleRegex"),
    key: z.string(),
    pattern: z.string(),
  }),
  z.object({
    type: z.literal("selectorText"),
    key: z.string(),
    selector: z.string(),
  }),
]);

export const matchExprSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("exists"), key: z.string() }),
  z.object({ op: z.literal("eq"), key: z.string(), value: z.string() }),
  z.object({ op: z.literal("regex"), key: z.string(), pattern: z.string() }),
  z.object({
    op: z.literal("in"),
    key: z.string(),
    values: z.array(z.string()),
  }),
]);

export const ruleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  priority: z.number().int(),
  target: z.object({
    host: z.union([z.string(), z.array(z.string())]).optional(),
    urlPattern: z.string().optional(),
  }),
  detection: z.object({
    mode: z.enum(["urlOnly", "signals"]),
    extractors: z.array(extractorSchema).optional(),
    match: z.array(matchExprSchema).optional(),
  }),
  display: z.object({
    labelTemplate: z.string(),
    color: z.string(),
    position: z.enum([
      "topLeft",
      "topRight",
      "bottomLeft",
      "bottomRight",
      "headerBar",
    ]),
    opacity: z.number().min(0).max(1).optional(),
    extras: z
      .object({
        tintPage: z.boolean().optional(),
        titlePrefix: z.string().optional(),
      })
      .optional(),
  }),
});

export const rulesSchema = z.array(ruleSchema);

export type Extractor = z.infer<typeof extractorSchema>;
export type MatchExpr = z.infer<typeof matchExprSchema>;
export type Rule = z.infer<typeof ruleSchema>;
