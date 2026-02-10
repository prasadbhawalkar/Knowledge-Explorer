
import { RawNode } from './types';

export const INITIAL_DATA: RawNode[] = [
  { id: "1", parentId: null, label: "Osteopathy Foundations", url: "https://en.wikipedia.org/wiki/Osteopathy" },
  { id: "2", parentId: "1", label: "Principles & Philosophy" },
  { id: "3", parentId: "1", label: "Anatomy & Physiology", url: "https://example.com/anatomy" },
  { id: "4", parentId: "1", label: "Clinical Techniques" },
  { id: "5", parentId: "2", label: "Holism" },
  { id: "6", parentId: "2", label: "Self-Regulation" },
  { id: "7", parentId: "3", label: "Musculoskeletal System" },
  { id: "8", parentId: "3", label: "Visceral Organs" },
  { id: "9", parentId: "4", label: "Muscle Energy Technique", url: "https://example.com/met" },
  { id: "10", parentId: "4", label: "Myofascial Release" },
  { id: "11", parentId: "5", label: "Body, Mind, Spirit" },
  { id: "12", parentId: "5", label: "Interconnectedness" },
];

export const LAYOUT_CONFIG = {
  width: 1200,
  height: 800,
  margin: { top: 20, right: 120, bottom: 20, left: 120 },
  nodeWidth: 160,
  nodeHeight: 40,
  rankSeparation: 400,
};
