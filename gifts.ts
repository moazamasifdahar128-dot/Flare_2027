export type GiftTier = "small" | "mid" | "heavy" | "luxury";

export type Gift = {
  id: string;
  name: string;
  coins: number;
  tier: GiftTier;
};

export const GIFTS: Gift[] = [
  { id: "rose", name: "Rose", coins: 1, tier: "small" },
  { id: "tea", name: "Tea", coins: 5, tier: "small" },
  { id: "heart", name: "Heart", coins: 10, tier: "small" },
  { id: "star", name: "Star", coins: 20, tier: "small" },
  { id: "candy", name: "Candy", coins: 15, tier: "small" },
  { id: "clap", name: "Clap", coins: 8, tier: "small" },
  { id: "cookie", name: "Cookie", coins: 12, tier: "small" },
  { id: "balloon", name: "Balloon", coins: 25, tier: "small" },
  { id: "book", name: "Book", coins: 30, tier: "small" },
  { id: "lamp", name: "Lamp", coins: 40, tier: "small" },
  { id: "donkey", name: "Donkey", coins: 100, tier: "mid" },
  { id: "cat", name: "Cat", coins: 150, tier: "mid" },
  { id: "crown", name: "Crown", coins: 400, tier: "mid" },
  { id: "fox", name: "Fox", coins: 200, tier: "mid" },
  { id: "parrot", name: "Parrot", coins: 180, tier: "mid" },
  { id: "drum", name: "Drum", coins: 250, tier: "mid" },
  { id: "camera", name: "Camera", coins: 350, tier: "mid" },
  { id: "guitar", name: "Guitar", coins: 500, tier: "mid" },
  { id: "trophy", name: "Trophy", coins: 700, tier: "mid" },
  { id: "ring", name: "Ring", coins: 900, tier: "mid" },
  { id: "lion", name: "Lion", coins: 2000, tier: "heavy" },
  { id: "car", name: "Sports car", coins: 4000, tier: "heavy" },
  { id: "heli", name: "Helicopter", coins: 8000, tier: "heavy" },
  { id: "eagle", name: "Eagle", coins: 2500, tier: "heavy" },
  { id: "horse", name: "Horse", coins: 3000, tier: "heavy" },
  { id: "yacht", name: "Yacht", coins: 10000, tier: "heavy" },
  { id: "diamond", name: "Diamond", coins: 6000, tier: "heavy" },
  { id: "throne", name: "Throne", coins: 9000, tier: "heavy" },
  { id: "jet", name: "Private jet", coins: 50000, tier: "luxury" },
  { id: "castle", name: "Royal castle", coins: 75000, tier: "luxury" },
  { id: "dragon", name: "Dragon", coins: 100000, tier: "luxury" },
  { id: "comet", name: "Comet", coins: 60000, tier: "luxury" },
  { id: "phoenix", name: "Phoenix", coins: 80000, tier: "luxury" },
  { id: "galaxy", name: "Galaxy", coins: 90000, tier: "luxury" },
  { id: "moon", name: "Moon", coins: 45, tier: "small" },
  { id: "sun", name: "Sun", coins: 50, tier: "small" },
  { id: "kite", name: "Kite", coins: 18, tier: "small" },
  { id: "pen", name: "Pen", coins: 6, tier: "small" },
  { id: "cup", name: "Cup", coins: 9, tier: "small" },
  { id: "leaf", name: "Leaf", coins: 3, tier: "small" },
  { id: "owl", name: "Owl", coins: 220, tier: "mid" },
  { id: "panda", name: "Panda", coins: 280, tier: "mid" },
  { id: "violin", name: "Violin", coins: 600, tier: "mid" },
  { id: "mask", name: "Mask", coins: 160, tier: "mid" },
  { id: "chess", name: "Chess", coins: 320, tier: "mid" },
  { id: "tiger", name: "Tiger", coins: 3500, tier: "heavy" },
  { id: "falcon", name: "Falcon", coins: 4500, tier: "heavy" },
  { id: "sub", name: "Submarine", coins: 7000, tier: "heavy" },
  { id: "meteor", name: "Meteor", coins: 55000, tier: "luxury" },
  { id: "crown2", name: "Empire", coins: 120000, tier: "luxury" },
];

export function giftById(id: string) {
  return GIFTS.find((gift) => gift.id === id);
}
