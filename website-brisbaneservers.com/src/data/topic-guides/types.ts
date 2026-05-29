export interface TopicGuideSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface TopicGuide {
  industrySlug: string;
  topicSlug: string;
  /** One-line value proposition for meta and hero reinforcement. */
  proposition: string;
  sections: TopicGuideSection[];
  nextActions: Array<{ label: string; detail: string }>;
}

export interface IndustryOverviewGuide {
  industrySlug: string;
  proposition: string;
  sections: TopicGuideSection[];
  nextActions: Array<{ label: string; detail: string }>;
}
