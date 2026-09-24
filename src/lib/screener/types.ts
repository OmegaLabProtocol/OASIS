import type { OriCategoryKey, ORIConfidenceLevel } from "@/lib/ori/methodology";

export interface CategoryRange {
  min?: number;
  max?: number;
}

export interface ScreenerFilters {
  oriMin?: number;
  oriMax?: number;
  grades?: string[];
  changeWindow?: "24h" | "7d" | "30d";
  changeMin?: number;
  changeMax?: number;
  categories?: Partial<Record<OriCategoryKey, CategoryRange>>;
  confidence?: ORIConfidenceLevel[];
  marketCapMin?: number;
  marketCapMax?: number;
  volumeMin?: number;
  structuralMin?: number;
  structuralMax?: number;
  dynamicMin?: number;
  dynamicMax?: number;
  /** Minimum methodology-weighted coverage, 0–100. */
  coverageMin?: number;
}

export interface SavedScreen {
  id: string;
  name: string;
  filters: ScreenerFilters;
  createdAt: string;
  updatedAt: string;
}
