/**
 * Typed data loaders for _data/*.yml YAML files.
 * These are imported at build time (not included in client bundles).
 *
 * NOTE: We use a project-root-relative path via process.cwd() so the loader
 * works correctly during Astro's prerender compilation (which remaps __dirname).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

// process.cwd() is the Astro project root at both dev and build time
const DATA_DIR = join(process.cwd(), '_data');

function loadYaml(filename: string): unknown {
  const raw = readFileSync(join(DATA_DIR, filename), 'utf8');
  return yaml.load(raw);
}

// ----- Types ---------------------------------------------------------------

export interface SeriesPost {
  id: string;
  blurb: string;
}

export interface SeriesLevel {
  title: string;
  icon: string;
  intro: string;
  posts: SeriesPost[];
}

export interface Series {
  name: string;
  url: string;
  description: string;
  levels: SeriesLevel[];
}

export interface SeriesMap {
  [key: string]: Series;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent_color?: string;
  quick_tool?: boolean;
}

export interface Donation {
  name: string;
  amount: string;
}

// ----- Loaders -------------------------------------------------------------

export function getSeries(): SeriesMap {
  return loadYaml('series.yml') as SeriesMap;
}

export function getTools(): Tool[] {
  return loadYaml('tools.yml') as Tool[];
}

export function getCapturaDonations(): Donation[] {
  return loadYaml('captura_donations.yml') as Donation[];
}

/**
 * Build a flat ordered list of post IDs for a series.
 */
export function getFlatPostIds(series: Series): string[] {
  return series.levels.flatMap(level => level.posts.map(p => p.id));
}

/**
 * Given a post's ID (e.g. /blog/2026/03/07/hacking-wordle),
 * return { part, total, prevId, nextId } for its series.
 */
export function getSeriesPosition(
  series: Series,
  postId: string
): { part: number; total: number; prevId: string | null; nextId: string | null } {
  const ids = getFlatPostIds(series);
  const idx = ids.indexOf(postId);
  if (idx === -1) return { part: 0, total: ids.length, prevId: null, nextId: null };
  return {
    part: idx + 1,
    total: ids.length,
    prevId: idx > 0 ? ids[idx - 1] : null,
    nextId: idx < ids.length - 1 ? ids[idx + 1] : null,
  };
}
