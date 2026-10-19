import { z } from "zod";

// Stage 01 and 02 of the Story-to-Scale Method: who buys, and why they choose.
export const BrandProfileSchema = z.object({
  summary: z.string().describe("Two or three sentences on what the business does and for whom."),
  voice: z.object({
    description: z.string(),
    sayLike: z.array(z.string()).describe("Short example phrases in the brand's voice."),
    avoid: z.array(z.string()).describe("Words, tones or claims to avoid."),
  }),
  values: z.array(z.string()),
  promise: z.string().describe("One sentence a customer could repeat: why choose this business."),
  proofPoints: z.array(z.string()).describe("Evidence that makes the promise credible."),
  segments: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      whyTheyBuy: z.string(),
      valueToBusiness: z.enum(["high", "medium", "low"]),
      channels: z.array(z.string()).describe("Where this segment is best reached."),
    }),
  ),
  offers: z.array(
    z.object({
      name: z.string(),
      forSegment: z.string(),
      description: z.string(),
    }),
  ),
  competitors: z.array(
    z.object({
      name: z.string(),
      promise: z.string(),
      weakness: z.string(),
    }),
  ),
  openQuestions: z
    .array(z.string())
    .describe("Gaps the source material could not answer, to confirm with the client."),
});
export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export const CHANNELS = ["instagram", "facebook", "linkedin", "tiktok", "whatsapp", "email", "x"] as const;
export const PROOF_TYPES = ["photography", "film", "testimonial", "ai-visual", "design"] as const;

// Stage 03 and 04: a month of content, planned against the profile.
export const ContentPlanSchema = z.object({
  items: z.array(
    z.object({
      date: z.string().describe("Publish date, YYYY-MM-DD, within the requested month."),
      channel: z.enum(CHANNELS),
      segment: z.string().describe("The customer segment this post is for, by name."),
      title: z.string().describe("A short internal title."),
      caption: z.string().describe("The publishable caption or message, in the brand's voice."),
      visualBrief: z.string().describe("What to shoot or produce, in one or two sentences."),
      proofType: z.enum(PROOF_TYPES),
      cta: z.string().describe("The single action the reader should take."),
    }),
  ),
});
export type ContentPlan = z.infer<typeof ContentPlanSchema>;

// Stage 05: the written part of the monthly review.
export const CommentarySchema = z.object({
  headline: z.string().describe("One sentence on the month."),
  whatChanged: z.array(z.string()).describe("What moved and the likely reason, one point each."),
  nextSteps: z.array(z.string()).describe("What we will adjust next month."),
});
export type Commentary = z.infer<typeof CommentarySchema>;
