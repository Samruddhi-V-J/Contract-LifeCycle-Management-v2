
export interface Placeholder {
  key: string;
  label: string;
  selected?: boolean; // Added for selection logic
}

export interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  placeholders: Placeholder[];
  createdAt: string;
  industry?: string;
  contractType?: string; // Added contractType
}

export const INDUSTRIES = [
  "Technology",
  "Real Estate",
  "Healthcare",
  "Finance",
  "Legal",
  "General Business"
];

export const CONTRACT_TYPES: Record<string, string[]> = {
  "Technology": ["Software License Agreement", "SaaS Terms of Service", "Data Processing Agreement", "Service Level Agreement"],
  "Real Estate": ["Commercial Lease Agreement", "Residential Lease Agreement", "Property Management Agreement", "Purchase Agreement"],
  "Healthcare": ["HIPAA Business Associate Agreement", "Medical Services Agreement", "Clinical Trial Agreement"],
  "Finance": ["Loan Agreement", "Investment Agreement", "Promissory Note", "Shareholder Agreement"],
  "Legal": ["Non-Disclosure Agreement", "Power of Attorney", "Partnership Agreement"],
  "General Business": ["Employment Contract", "Independent Contractor Agreement", "Consulting Agreement", "Sales Agreement"]
};

export interface ContractDraft {
  id: string;
  templateId: string;
  name: string;
  content: string;
  values: Record<string, string>;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
