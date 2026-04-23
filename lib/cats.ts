export type CatCategory = "resident" | "adoptable" | "dual";

export type CatCard = {
  id: string;
  name: string;
  description: string;
  category: CatCategory;
  breed?: string;
  mood?: string;
  emoji?: string;
  images: string[];
  createdAt?: string;
};

export const CAT_CATEGORY_OPTIONS: Array<{ value: CatCategory; label: string }> = [
  { value: "resident", label: "Resident Cats" },
  { value: "adoptable", label: "Adoptable Cats" },
  { value: "dual", label: "Dual Adoptions" },
];

export const DEFAULT_CATS: CatCard[] = [
  {
    id: "riley",
    name: "Riley",
    category: "resident",
    mood: "Gently present",
    breed: "Ginger Longhair",
    emoji: "😇",
    description:
      "The heart of MeanKat. Calm, nurturing, and eternally patient. The café's unofficial caretaker and gentle anchor. Find him downstairs near reception, offering comfort just by being there.",
    images: ["/riley-casual.jpg", "/riley-staff.jpg"],
  },
  {
    id: "smokey",
    name: "Smokey",
    category: "resident",
    mood: "Royally demanding",
    breed: "Silver Tabby",
    emoji: "👑",
    description:
      "The resident queen with the loudest purr. Pure softness wrapped in silver fur with a sprinkle of sass. Extremely loving with people but prefers her peaceful space from other cats. You'll find her perched high on the cat villa, watching from her royal lookout.",
    images: ["/smokey.jpg"],
  },
  {
    id: "janice",
    name: "Janice",
    category: "resident",
    mood: "Fiercely protective",
    breed: "Oriental Tabby",
    emoji: "🦁",
    description:
      "Petite in size but big in spirit — the devoted protector of her little family. While she keeps a watchful eye on her babies, she's incredibly sweet with people. Easily recognized by her tipped ear and adorably round belly. A tiny body with a heart twice her size.",
    images: ["/janice-1.jpg", "/janice-2.jpg"],
  },
];

export function categoryLabel(category: CatCategory) {
  if (category === "resident") return "Resident";
  if (category === "dual") return "Dual Adoption";
  return "Adoptable";
}

export function isUploadedCat(cat: Pick<CatCard, "createdAt">) {
  return Boolean(cat.createdAt);
}

export function normalizeCatImages(images: string[] | undefined, fallback: string) {
  if (images && images.length > 0) {
    return images;
  }

  return [fallback];
}

export function mergeCatsByName(fallbackCats: CatCard[], remoteCats: CatCard[]) {
  const byName = new Map<string, CatCard>();

  for (const cat of fallbackCats) {
    byName.set(cat.name, cat);
  }

  for (const cat of remoteCats) {
    byName.set(cat.name, cat);
  }

  return Array.from(byName.values());
}
