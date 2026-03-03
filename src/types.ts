// src/types.ts

export type ThemeName = 'space' | 'ocean' | 'forest' | 'ember' | 'minimal';

export type LayoutName = 'arc' | 'dock' | 'scattered' | 'orbital';

export type SectionName =
  | 'home'
  | 'projects'
  | 'about'
  | 'skills'
  | 'experience'
  | 'education'
  | 'blog'
  | 'stats'
  | 'lab'
  | 'achievements'
  | 'contact'
  | 'resume';

export type DetailPage = { type: 'project' | 'blog' | 'lab'; id: string } | null;

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable';

export type Identity = {
  id: number;
  name: string;
  titleVariants: string[];
  tagline: string;
  availabilityStatus: AvailabilityStatus;
  availabilityLabel: string;
  aboutStory: string;
  aboutPhotoUrl: string | null;
  resumeUrl: string | null;
  resumeUpdatedAt: string | null;
  values: { icon: string; label: string; description: string }[];
  funFacts: string[];
  socialLinks: { platform: string; url: string; icon: string }[];
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  coverImageUrl: string | null;
  coverVideoUrl: string | null;
  problemText: string | null;
  approachText: string | null;
  buildText: string | null;
  resultText: string | null;
  techStack: { name: string; icon: string; reason: string }[];
  liveUrl: string | null;
  githubUrl: string | null;
  tags: string[];
  featured: boolean;
  sortOrder: number;
  published: boolean;
};

export type Skill = {
  id: string;
  name: string;
  category: string;
  years: number;
  proficiency: number;
  icon: string | null;
  sortOrder: number;
};

export type Experience = {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string;
  techUsed: string[];
  companyUrl: string | null;
  sortOrder: number;
};

export type Education = {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  sortOrder: number;
};

export type Certification = {
  id: string;
  name: string;
  issuer: string;
  issuedDate: string;
  verifyUrl: string | null;
  badgeUrl: string | null;
  sortOrder: number;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  category: string;
  readingTimeMinutes: number;
  content: string;
  excerpt: string;
  published: boolean;
  publishedAt: string | null;
  tags: string[];
  sortOrder: number;
};

export type LabItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  technicalNotes: string | null;
  tags: string[];
  demoUrl: string | null;
  githubUrl: string | null;
  embedType: 'iframe' | 'component' | null;
  embedSrc: string | null;
  published: boolean;
};

export type Achievement = {
  id: string;
  title: string;
  type: 'award' | 'win' | 'publication' | 'speaking' | 'opensource';
  organization: string;
  date: string;
  description: string;
  url: string | null;
  sortOrder: number;
};

export type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AINavigationCommand =
  | { action: 'navigate'; section: SectionName }
  | { action: 'openDetail'; type: 'project' | 'blog' | 'lab'; id: string };