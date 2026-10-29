// Части пешего квеста по порядку: старт → станция 1 → станция 2.
import type { Part } from "@/quests/types";
import start from "./content/start.json";
import station1 from "./content/station-1.json";
import station2 from "./content/station-2.json";

export const kronstadtWalkParts = [start, station1, station2] as Part[];
