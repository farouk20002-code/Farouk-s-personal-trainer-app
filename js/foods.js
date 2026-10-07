// Food database. Prices are SAR estimates for Jeddah supermarkets / the كيو app; edit them in Food > Prices.
// m = [kcal, protein, carbs, fat] per `b` units (100 g / 100 ml / 1 piece).
// where: freezer | fridge | pantry | fresh. keeps: rough days it lasts once bought (fresh/fridge items).
export const FOODS = [
  { id: 'chicken', n: 'Chicken breast, frozen', pack: 2000, u: 'g', price: 45, pl: '2 kg bag', b: 100, m: [120, 23, 0, 2.6], where: 'freezer' },
  { id: 'mince', n: 'Lean beef mince, frozen', pack: 1000, u: 'g', price: 38, pl: '1 kg', b: 100, m: [176, 20, 0, 10], where: 'freezer' },
  { id: 'fish', n: 'White fish fillet (basa/tilapia), frozen', pack: 1000, u: 'g', price: 22, pl: '1 kg', b: 100, m: [92, 15, 0, 3.5], where: 'freezer' },
  { id: 'veg', n: 'Mixed vegetables, frozen', pack: 900, u: 'g', price: 10, pl: '900 g', b: 100, m: [65, 3, 11, 0.5], where: 'freezer' },
  { id: 'molokhia', n: 'Molokhia, frozen', pack: 400, u: 'g', price: 5, pl: '400 g', b: 100, m: [35, 3, 6, 0.3], where: 'freezer' },
  { id: 'eggs', n: 'Eggs', pack: 30, u: 'egg', price: 24, pl: 'tray of 30', b: 1, m: [72, 6.3, 0.4, 4.8], where: 'fridge', keeps: 28 },
  { id: 'laban', n: 'Laban, low-fat', pack: 2000, u: 'ml', price: 9.5, pl: '2 L', b: 100, m: [42, 3.3, 4.5, 1.2], where: 'fridge', keeps: 10 },
  { id: 'milk', n: 'Milk, low-fat (long-life)', pack: 1000, u: 'ml', price: 6, pl: '1 L UHT', b: 100, m: [45, 3.3, 4.8, 1.5], where: 'pantry' },
  { id: 'yogurt', n: 'Plain yogurt (zabadi), low-fat', pack: 1000, u: 'g', price: 9, pl: '1 kg tub', b: 100, m: [60, 4.5, 6, 1.5], where: 'fridge', keeps: 14 },
  { id: 'cheese', n: 'White cheese, light (feta style)', pack: 500, u: 'g', price: 14, pl: '500 g', b: 100, m: [180, 15, 2, 12], where: 'fridge', keeps: 21 },
  { id: 'tuna', n: 'Tuna in water, can', pack: 1, u: 'can', price: 6.5, pl: '1 can (~185 g)', b: 1, m: [150, 32, 0, 2], where: 'pantry' },
  { id: 'ful', n: 'Ful medames, can', pack: 1, u: 'can', price: 3, pl: '1 can (~400 g)', b: 1, m: [410, 26, 64, 3], where: 'pantry' },
  { id: 'chickpeas', n: 'Chickpeas, can', pack: 1, u: 'can', price: 3.5, pl: '1 can (~400 g)', b: 1, m: [330, 18, 50, 6], where: 'pantry' },
  { id: 'lentils', n: 'Red lentils', pack: 1000, u: 'g', price: 9, pl: '1 kg', b: 100, m: [350, 24, 60, 1.5], where: 'pantry' },
  { id: 'rice', n: 'Rice, basmati (dry)', pack: 5000, u: 'g', price: 45, pl: '5 kg', b: 100, m: [360, 7, 79, 0.6], where: 'pantry' },
  { id: 'pasta', n: 'Pasta (dry)', pack: 500, u: 'g', price: 4, pl: '500 g', b: 100, m: [360, 12.5, 73, 1.5], where: 'pantry' },
  { id: 'bulgur', n: 'Bulgur, coarse', pack: 1000, u: 'g', price: 8, pl: '1 kg', b: 100, m: [340, 12, 76, 1.3], where: 'pantry' },
  { id: 'oats', n: 'Oats', pack: 1000, u: 'g', price: 13, pl: '1 kg', b: 100, m: [380, 13, 63, 7], where: 'pantry' },
  { id: 'bread', n: 'Arabic bread (freeze it)', pack: 5, u: 'loaf', price: 2.5, pl: 'pack of 5', b: 1, m: [170, 6, 33, 1], where: 'freezer' },
  { id: 'pb', n: 'Peanut butter', pack: 340, u: 'g', price: 12, pl: '340 g jar', b: 100, m: [590, 25, 20, 50], where: 'pantry' },
  { id: 'dates', n: 'Dates', pack: 1000, u: 'g', price: 15, pl: '1 kg', b: 100, m: [280, 2.5, 75, 0.4], where: 'pantry' },
  { id: 'banana', n: 'Bananas', pack: 1000, u: 'g', price: 6, pl: '1 kg', b: 100, m: [89, 1.1, 23, 0.3], where: 'fresh', keeps: 6 },
  { id: 'potato', n: 'Potatoes', pack: 2000, u: 'g', price: 7, pl: '2 kg', b: 100, m: [77, 2, 17, 0.1], where: 'fresh', keeps: 21 },
  { id: 'onion', n: 'Onions', pack: 1000, u: 'g', price: 4, pl: '1 kg', b: 100, m: [40, 1.1, 9, 0.1], where: 'fresh', keeps: 21 },
  { id: 'tomato', n: 'Tomatoes', pack: 1000, u: 'g', price: 5, pl: '1 kg', b: 100, m: [18, 0.9, 3.9, 0.2], where: 'fresh', keeps: 7 },
  { id: 'cucumber', n: 'Cucumbers', pack: 1000, u: 'g', price: 6, pl: '1 kg', b: 100, m: [15, 0.7, 3.6, 0.1], where: 'fresh', keeps: 7 },
  { id: 'paste', n: 'Tomato paste', pack: 400, u: 'g', price: 6, pl: '400 g can', b: 100, m: [82, 4.3, 19, 0.5], where: 'pantry' },
  { id: 'crushed', n: 'Crushed tomatoes, can', pack: 1, u: 'can', price: 3.5, pl: '1 can (400 g)', b: 1, m: [80, 4, 16, 0.5], where: 'pantry' },
  { id: 'lemon', n: 'Lemons', pack: 500, u: 'g', price: 4, pl: '500 g', b: 100, m: [29, 1.1, 9, 0.3], where: 'fresh', keeps: 14 },
  { id: 'garlic', n: 'Garlic', pack: 250, u: 'g', price: 4, pl: '250 g', b: 100, m: [149, 6.4, 33, 0.5], where: 'fresh', keeps: 30 },
  { id: 'flour', n: 'Flour', pack: 1000, u: 'g', price: 4, pl: '1 kg', b: 100, m: [364, 10, 76, 1], where: 'pantry' },
  { id: 'oil', n: 'Cooking oil', pack: 1500, u: 'ml', price: 15, pl: '1.5 L', b: 100, m: [884, 0, 0, 100], where: 'pantry' },
  { id: 'whey', n: 'Whey protein', pack: 30, u: 'scoop', price: 220, pl: '~30 scoops (2 lb)', b: 1, m: [120, 24, 3, 1.5], where: 'pantry', optional: true }
];

// One-off pantry items for the first shop. Not counted in the daily cost.
export const PANTRY = [
  ['Salt, black pepper', 6], ['Cumin, ground', 5], ['Paprika (sweet, not hot)', 5], ['Garlic powder', 5], ['Kabsa spice mix (mild)', 6], ['Seven spices (baharat)', 5], ['Dried coriander + dried mint', 6], ['Chicken stock cubes', 6], ['White vinegar', 3], ['Baking paper or foil', 8]
];
export const KIT = [['Meal-prep boxes, about 1 L, microwave-safe (get 10–12)', 35], ['Big pot (if you only have a small one)', 0], ['Oven tray', 0]];

export const CREATINE_MONTH = 40;

const BYID = Object.fromEntries(FOODS.map(f => [f.id, f]));
export const food = (id, extra) => BYID[id] || extra?.[id] || null;
