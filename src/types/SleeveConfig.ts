export type SleeveType = "default" | "solid-color";

export interface SleeveConfig {
  type: SleeveType;
  color?: string; // hex color for solid-color type
}

export const DEFAULT_SLEEVE_CONFIG: SleeveConfig = {
  type: "default",
};

export const SLEEVE_COLOR_OPTIONS = [
  { name: "Red", value: "#F44336" },
  { name: "Blue", value: "#2196F3" },
  { name: "Green", value: "#4CAF50" },
  { name: "Purple", value: "#9C27B0" },
  { name: "Orange", value: "#FF9800" },
  { name: "Black", value: "#212121" },
];
