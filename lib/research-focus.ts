export const researchChallenges = ["Scaling my team", "Lead generation", "Automating workflows", "Competitive positioning", "Product-market fit", "Fundraising"] as const;

export const researchFocuses = [
  { challenge: "Lead generation", title: "Find a stronger route to customers", description: "Investigate the company’s public positioning and acquisition approach.", prompt: "Which customer segment are you trying to reach, and where are enquiries dropping off?" },
  { challenge: "Automating workflows", title: "Spot work worth simplifying", description: "Look for documented workflows and opportunities to investigate.", prompt: "Which recurring task takes the most time? Describe the current process and its bottleneck." },
  { challenge: "Competitive positioning", title: "Understand the company’s position", description: "Review public product claims, differentiation, and gaps in the evidence.", prompt: "Which alternatives do customers consider, and what do you want to understand about your positioning?" },
] as const;

export function researchChallenge(value: string | null) {
  return researchChallenges.find(challenge => challenge === value);
}
