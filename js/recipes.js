// Recipe library. items: [foodId, quantity per portion, flex]. Flex items (rice, pasta, bread, oil...)
// scale up or down to hit the calorie target; protein items never shrink.
// kind: batch (cooked on a cook day, kept in boxes), fresh (made that morning, quick), nocook (assembled).
// slots: which meals it can fill. keeps: days in the fridge once cooked. boil: boiled eggs needed (prepped on cook day).
export const RECIPES = [
  // ---- Batch mains (lunch boxes and dinners) ----
  { id: 'kabsa', n: 'Chicken kabsa-style rice', kind: 'batch', slots: ['lunch', 'dinner'], base: 'chicken', time: 50, tool: 'Stove, one big pot', keeps: 3,
    items: [['chicken', 180], ['rice', 75, 1], ['onion', 40], ['tomato', 60], ['paste', 10], ['veg', 80], ['oil', 6, 1]],
    steps: ['Cut the chicken into big chunks. Rinse the rice and soak it in water while you cook.', 'Heat the oil in a big pot, soften the chopped onion 5 min, add the chicken and brown it 5 min.', 'Add chopped tomato, tomato paste, kabsa spice, salt and a stock cube. Stir 2 min.', 'Add water: 1.5 cups per cup of rice. Bring to a boil, add the drained rice and frozen vegetables.', 'Lid on, lowest heat, 20 min. Turn off and leave it closed 10 min, then fluff and box.'] },
  { id: 'tray', n: 'Lemon garlic chicken and potato tray', kind: 'batch', slots: ['lunch', 'dinner'], base: 'chicken', time: 55, tool: 'Oven', keeps: 3,
    items: [['chicken', 180], ['potato', 280, 1], ['onion', 50], ['veg', 80], ['lemon', 15], ['garlic', 5], ['oil', 8, 1]],
    steps: ['Oven to 220 °C. Cut potatoes into wedges, onion into quarters.', 'Toss potatoes and onion with half the oil, salt, pepper and paprika. Roast 20 min.', 'Mix the chicken (cut in strips) with crushed garlic, lemon juice, the rest of the oil, cumin and salt.', 'Add the chicken and frozen veg to the tray, roast another 20–25 min until the chicken is cooked through.', 'Let it cool 10 min, then box.'] },
  { id: 'kofta', n: 'Kofta and potato tray in tomato sauce', kind: 'batch', slots: ['lunch', 'dinner'], base: 'beef', time: 60, tool: 'Oven', keeps: 3,
    items: [['mince', 170], ['potato', 220, 1], ['onion', 50], ['crushed', 0.5], ['oil', 4, 1]],
    steps: ['Oven to 200 °C. Grate half the onion into the mince with salt, pepper, seven spices and dried coriander. Shape into fingers.', 'Slice potatoes into rounds, toss with the oil and salt, spread on a tray.', 'Put the kofta on top, roast 15 min.', 'Pour over crushed tomatoes mixed with a little water, salt and the rest of the onion, sliced. Roast 25 min more.', 'Cool, then box with the sauce.'] },
  { id: 'macarona', n: 'Beef and tomato pasta', kind: 'batch', slots: ['lunch', 'dinner'], base: 'beef', time: 30, tool: 'Stove', keeps: 3,
    items: [['mince', 130], ['pasta', 85, 1], ['crushed', 0.5], ['onion', 40], ['garlic', 5], ['cheese', 20], ['oil', 3, 1]],
    steps: ['Boil the pasta in salted water, 1 minute less than the packet says. Drain.', 'Meanwhile, oil in a pan, soften the onion 4 min, add garlic and the mince, break it up and brown 6 min.', 'Add crushed tomatoes, salt, pepper and a pinch of seven spices. Simmer 10 min.', 'Mix pasta into the sauce. Box it and crumble the white cheese on top.'] },
  { id: 'shawarma', n: 'Chicken shawarma bowl', kind: 'batch', slots: ['lunch', 'dinner'], base: 'chicken', time: 45, tool: 'Oven + stove', keeps: 3,
    items: [['chicken', 180], ['rice', 70, 1], ['yogurt', 80], ['cucumber', 80], ['garlic', 5], ['lemon', 10], ['oil', 6, 1]],
    steps: ['Slice the chicken thin. Mix with the oil, lemon, half the garlic, paprika, cumin, a little cinnamon, salt. 15 min is enough marinating.', 'Rice: 1.5 cups water per cup of rice, boil, lowest heat with the lid on 15 min.', 'Spread the chicken on a tray, oven 230 °C for 15–18 min, until the edges brown.', 'Garlic yogurt: yogurt + the rest of the garlic + salt + dried mint. Keep it in a separate small box.', 'Box rice and chicken. Cut the cucumber fresh in the morning or put it on the side.'] },
  { id: 'molokhia', n: 'Chicken molokhia with rice', kind: 'batch', slots: ['lunch', 'dinner'], base: 'chicken', time: 45, tool: 'Stove', keeps: 3,
    items: [['chicken', 170], ['molokhia', 200], ['rice', 70, 1], ['garlic', 8], ['oil', 6, 1]],
    steps: ['Boil the chicken pieces in water with a stock cube, onion and salt for 20 min. Keep the broth.', 'Rice: cook it in some of the broth instead of water. Lid on, low heat, 15 min.', 'Bring 2–3 cups of broth to a simmer, add the frozen molokhia, stir until it melts, 5 min. Do not boil hard.', 'Fry the crushed garlic and dried coriander in the oil until golden (the "ta\'leya") and pour it into the molokhia.', 'Box rice and chicken together, molokhia in its own container.'] },
  { id: 'sayadeya', n: 'Fish with onion rice (sayadeya style)', kind: 'batch', slots: ['lunch', 'dinner'], base: 'fish', time: 45, tool: 'Stove + oven', keeps: 2,
    items: [['fish', 250], ['rice', 70, 1], ['onion', 60], ['crushed', 0.4], ['lemon', 10], ['oil', 7, 1]],
    steps: ['Thaw the fish in the fridge overnight. Slice the onion thin and fry it in most of the oil until dark golden, 10 min.', 'Add the rice, cumin, salt and 1.5 cups water per cup of rice. Lid on, low heat, 18 min.', 'Season the fish with cumin, salt, lemon and the last of the oil. Oven 200 °C, 12–15 min.', 'Warm the crushed tomatoes with a pinch of cumin as a sauce.', 'Fish keeps 2 days. The plan only uses it for the next 2 days.'] },
  { id: 'pilaf', n: 'Chicken and bulgur pilaf', kind: 'batch', slots: ['lunch', 'dinner'], base: 'chicken', time: 35, tool: 'Stove', keeps: 3,
    items: [['chicken', 170], ['bulgur', 75, 1], ['veg', 100], ['onion', 40], ['paste', 10], ['oil', 6, 1]],
    steps: ['Cut the chicken into cubes. Oil in a pot, soften the onion 4 min, add chicken and brown 5 min.', 'Stir in the tomato paste, salt, pepper, a pinch of cumin.', 'Add the bulgur and frozen veg, then 2 cups of water per cup of bulgur.', 'Boil, then lid on, low heat 15 min. Rest 5 min, fluff, box.'] },
  { id: 'curry', n: 'Mild chicken and chickpea curry with rice', kind: 'batch', slots: ['lunch', 'dinner'], base: 'chicken', time: 40, tool: 'Stove', keeps: 3,
    items: [['chicken', 150], ['chickpeas', 0.3], ['crushed', 0.5], ['onion', 50], ['yogurt', 40], ['rice', 65, 1], ['oil', 6, 1]],
    steps: ['Rice in a separate pot (1.5 cups water per cup, 15 min low heat).', 'Oil in a pan, onion 5 min, then the chicken cubes 5 min.', 'Add cumin, paprika, a little turmeric if you have it, salt. Then crushed tomatoes and drained chickpeas. Simmer 15 min.', 'Off the heat, stir in the yogurt. Box with the rice.'] },
  { id: 'fajita', n: 'Chicken fajita wraps', kind: 'batch', slots: ['lunch', 'dinner'], base: 'chicken', time: 25, tool: 'Stove', keeps: 3,
    items: [['chicken', 170], ['onion', 60], ['veg', 80], ['bread', 1.5, 1], ['yogurt', 50], ['oil', 6, 1]],
    steps: ['Slice the chicken and onion into strips.', 'Very hot pan with the oil: chicken 6 min with paprika, cumin, garlic powder, salt.', 'Add onion and frozen veg, 5 min more.', 'Box the filling. Wrap it in the bread fresh when you eat, with yogurt as the sauce.'] },
  { id: 'tunapasta', n: 'Tuna pasta salad (cold, no reheating)', kind: 'batch', slots: ['lunch'], base: 'tuna', time: 15, tool: 'Stove', keeps: 3,
    items: [['tuna', 1], ['pasta', 80, 1], ['cucumber', 80], ['tomato', 80], ['yogurt', 60], ['lemon', 10], ['oil', 5, 1]],
    steps: ['Boil the pasta, rinse it under cold water, drain well.', 'Mix yogurt, lemon juice, the oil, salt, pepper and dried mint.', 'Stir in the drained tuna and the pasta.', 'Box it. Add the chopped cucumber and tomato in the morning so they stay crunchy.'] },
  { id: 'adas', n: 'Red lentil soup with eggs and bread', kind: 'batch', slots: ['dinner'], base: 'lentils', time: 35, tool: 'Stove + hand blender', keeps: 3, boil: 2,
    items: [['lentils', 70], ['onion', 50], ['veg', 80], ['garlic', 5], ['eggs', 2], ['bread', 1, 1], ['oil', 6, 1]],
    steps: ['Rinse the lentils. Oil in a pot, soften onion and garlic 5 min.', 'Add the lentils, frozen veg, cumin, a stock cube and 4 cups of water per cup of lentils.', 'Simmer 20 min until soft, then blend smooth with the hand blender. Salt and lemon.', 'Eat with 2 boiled eggs (boiled on the cook day) and bread.'] },
  { id: 'koshari', n: 'Lighter koshari with eggs', kind: 'batch', slots: ['dinner'], base: 'lentils', time: 45, tool: 'Stove', keeps: 3, boil: 2,
    items: [['lentils', 40], ['rice', 35, 1], ['pasta', 25, 1], ['chickpeas', 0.25], ['crushed', 0.5], ['onion', 70], ['eggs', 2], ['oil', 7, 1]],
    steps: ['Fry the sliced onion in the oil until crispy and dark, set aside.', 'Boil the lentils 10 min, add the rice and enough water to cover by 2 cm, cumin and salt, lid on 15 min.', 'Boil the pasta separately.', 'Sauce: crushed tomatoes, garlic, a splash of vinegar, cumin, salt. Simmer 10 min.', 'Box: rice-lentils, pasta, chickpeas, onions on top, sauce on the side. 2 boiled eggs with it.'] },

  // ---- Breakfasts (after the gym, made fresh, 10 min) ----
  { id: 'eggplate', n: 'Eggs, white cheese and bread', kind: 'fresh', slots: ['breakfast'], base: 'eggs', time: 8, tool: 'Pan',
    items: [['eggs', 3], ['cheese', 40], ['bread', 1, 1], ['cucumber', 100], ['tomato', 100], ['laban', 250]],
    steps: ['Fry or scramble the eggs in a non-stick pan (no oil needed).', 'Plate with the cheese, sliced cucumber and tomato, bread. A glass of laban on the side.'] },
  { id: 'oats', n: 'Overnight oats with banana', kind: 'fresh', slots: ['breakfast'], base: 'oats', time: 3, tool: 'None (make it the night before)',
    items: [['oats', 60, 1], ['milk', 300], ['yogurt', 200], ['banana', 100], ['pb', 10, 1]],
    steps: ['The night before: in a box, mix oats, milk and yogurt. Fridge.', 'In the morning: slice the banana on top, add the peanut butter.'] },
  { id: 'shakshuka', n: 'Shakshuka', kind: 'fresh', slots: ['breakfast'], base: 'eggs', time: 15, tool: 'Pan',
    items: [['eggs', 4], ['tomato', 150], ['onion', 50], ['cheese', 20], ['bread', 1, 1], ['oil', 5, 1]],
    steps: ['Oil in a pan, onion 3 min, chopped tomato with salt, cumin and paprika 5 min.', 'Make 4 holes, crack in the eggs, lid on, 5 min.', 'Crumble the cheese on top. Eat with the bread.'] },
  { id: 'fulbf', n: 'Ful with eggs', kind: 'fresh', slots: ['breakfast'], base: 'ful', time: 8, tool: 'Small pot',
    items: [['ful', 0.5], ['eggs', 2], ['bread', 1, 1], ['oil', 5, 1], ['lemon', 10], ['cucumber', 80], ['tomato', 80]],
    steps: ['Warm half a can of ful with a splash of water, mash a little. Cumin, salt, lemon, the oil on top.', 'Fry or boil the eggs. Eat with bread, cucumber and tomato. Keep the other half can in a box for 2 days.'] },

  // ---- Snacks ----
  { id: 'labandates', n: 'Laban and dates', kind: 'nocook', slots: ['snack'], base: 'dairy', time: 0, items: [['laban', 500], ['dates', 30]], steps: ['Bottle of laban, 3 dates.'] },
  { id: 'yogbanana', n: 'Yogurt, banana and oats', kind: 'nocook', slots: ['snack'], base: 'dairy', time: 2, items: [['yogurt', 250], ['banana', 100], ['oats', 20, 1]], steps: ['Yogurt in a bowl, sliced banana and a spoon of raw oats on top.'] },
  { id: 'pbmilk', n: 'Peanut butter bread and milk', kind: 'nocook', slots: ['snack'], base: 'dairy', time: 2, items: [['bread', 0.5, 1], ['pb', 15, 1], ['milk', 300]], steps: ['Half a bread with a spoon of peanut butter, a big glass of milk.'] },
  { id: 'eggslaban', n: 'Boiled eggs and laban', kind: 'nocook', slots: ['snack'], base: 'eggs', time: 0, boil: 2, items: [['eggs', 2], ['laban', 250], ['dates', 20]], steps: ['2 boiled eggs (from the cook day), a glass of laban, 2 dates.'] },

  // ---- No-cook meals (Sunday lunch, some dinners) ----
  { id: 'tunawrap', n: 'Tuna wraps', kind: 'nocook', slots: ['lunch', 'dinner'], base: 'tuna', time: 5, items: [['tuna', 1], ['bread', 2, 1], ['cucumber', 80], ['tomato', 80], ['yogurt', 60]], steps: ['Drain the tuna, mix with yogurt, salt, pepper and lemon if you have it.', 'Fill the bread with tuna, sliced cucumber and tomato.'] },
  { id: 'cheeseplate', n: 'Eggs, cheese and salad plate', kind: 'nocook', slots: ['dinner'], base: 'eggs', time: 5, boil: 3, items: [['eggs', 3], ['cheese', 50], ['bread', 1.5, 1], ['cucumber', 100], ['tomato', 100]], steps: ['3 boiled eggs from the cook day, white cheese, cucumber and tomato, bread.'] },
  { id: 'chicksalad', n: 'Tuna and chickpea salad', kind: 'nocook', slots: ['lunch', 'dinner'], base: 'tuna', time: 7, items: [['tuna', 1], ['chickpeas', 0.4], ['tomato', 100], ['cucumber', 100], ['lemon', 15], ['oil', 6, 1], ['bread', 1, 1]], steps: ['Chop tomato and cucumber. Add drained chickpeas and tuna.', 'Dress with lemon, the oil, salt and cumin. Bread on the side. Keep the rest of the chickpeas in a box for 3 days.'] },
  { id: 'fulplate', n: 'Ful plate with boiled eggs', kind: 'nocook', slots: ['dinner'], base: 'ful', time: 5, boil: 2, items: [['ful', 0.5], ['eggs', 2], ['bread', 1, 1], ['oil', 5, 1], ['lemon', 10], ['cucumber', 80], ['tomato', 80]], steps: ['Warm half a can of ful in the microwave 2 min, mash, cumin, salt, lemon, the oil.', '2 boiled eggs, cucumber, tomato and bread.'] }
];
