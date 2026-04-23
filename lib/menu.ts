export type MenuItem = {
  id?: string;
  name: string;
  price: string;
};

export type MenuSection = {
  id?: string;
  title: string;
  emoji: string;
  filterGroup: string;
  items: MenuItem[];
};

export const MENU_FILTER_GROUPS = ["Coffee & Hot", "Cold Drinks", "Food & Sweets", "Other"];

export const DEFAULT_MENU: MenuSection[] = [
  { title: "Coffee", emoji: "☕", filterGroup: "Coffee & Hot", items: [
    { name: "Espresso", price: "R28" }, { name: "Extra Shot", price: "+R7" },
    { name: "Americano", price: "R32" }, { name: "Cappuccino", price: "R36" },
    { name: "Flat White", price: "R40" }, { name: "Cortado", price: "Single R35 / Double R37" },
  ]},
  { title: "Lattes", emoji: "🥛", filterGroup: "Coffee & Hot", items: [
    { name: "Classic", price: "R38" }, { name: "Spicy Chai", price: "R41" },
    { name: "Dirty Chai", price: "R45" }, { name: "Vanilla", price: "R68" },
    { name: "Rolo, Speckled Egg, Milk Tart, Double Choc or Blueberry Choc", price: "R75" },
  ]},
  { title: "Mochas", emoji: "🍫", filterGroup: "Coffee & Hot", items: [
    { name: "Classic", price: "R50" }, { name: "Cocoa", price: "R60" }, { name: "White Mocha", price: "R60" },
  ]},
  { title: "Hot Chocolate", emoji: "🍵", filterGroup: "Coffee & Hot", items: [
    { name: "Classic", price: "R45" }, { name: "Double Chocolate", price: "R60" },
    { name: "White Chocolate", price: "R58" },
    { name: "Delux Add-Ons: Rolo, Milk Tart, Speckled Egg or Bubblegum", price: "R60" },
  ]},
  { title: "Matcha — Hot", emoji: "🍵", filterGroup: "Coffee & Hot", items: [
    { name: "Coconut Matcha Latte", price: "R65" },
    { name: "Strawberry & Coconut Matcha Latte", price: "R70" },
    { name: "Choc-Coconut Matcha Fusion", price: "R72" },
  ]},
  { title: "Matcha — Cold", emoji: "🧊", filterGroup: "Cold Drinks", items: [
    { name: "Coconut Matcha Latte", price: "R68" },
    { name: "Strawberry & Coconut Matcha Latte", price: "R70" },
    { name: "Choc-Coconut Matcha Fusion", price: "R75" },
    { name: "Coconut Matcha Crusher", price: "R75" },
  ]},
  { title: "Crushers", emoji: "🧃", filterGroup: "Cold Drinks", items: [
    { name: "Strawberry", price: "R70" }, { name: "Peach", price: "R70" },
    { name: "Raspberry Dragonfruit", price: "R70" }, { name: "Mixed Berry", price: "R70" },
    { name: "Mango", price: "R70" }, { name: "Passion Fruit", price: "R65" },
    { name: "Pear Elderflower", price: "R70" },
  ]},
  { title: "Frappes", emoji: "🥤", filterGroup: "Cold Drinks", items: [
    { name: "Coffee", price: "R55" }, { name: "White Chocolate", price: "R60" },
    { name: "Bubble Gum", price: "R70" }, { name: "Milk Tart", price: "R70" },
    { name: "Iced Cappuccino", price: "R67" },
  ]},
  { title: "Milkshakes", emoji: "🥛", filterGroup: "Cold Drinks", items: [
    { name: "Vanilla, Strawberry, Chocolate or Bubblegum", price: "R55" },
    { name: "Double Chocolate", price: "R65" }, { name: "Mango", price: "R70" },
    { name: "Rolo, Milk Tart, Speckled Egg, Unicorn or Mixed Berry", price: "R75" },
  ]},
  { title: "Mini Pitas", emoji: "🥙", filterGroup: "Food & Sweets", items: [
    { name: "Tender chicken with Middle Eastern spices, tomatoes, onions & tahini\nFlavours: Middle Eastern · Spicy · Mediterranean with Pineapple · Lemon & Herb", price: "R65" },
  ]},
  { title: "Crumble Biscuits", emoji: "🍪", filterGroup: "Food & Sweets", items: [
    { name: "Chocolate", price: "R45" }, { name: "Triple Choc", price: "R50" },
    { name: "Oreo Delight", price: "R50" }, { name: "Smores", price: "R50" },
    { name: "Lotus Biscoff Delight", price: "R55" }, { name: "Pistachio", price: "R55" },
    { name: "Nutella Choc Chip", price: "R55" },
    { name: "Mini Choc Chip Cookies", price: "Regular R45 / Large R65" },
  ]},
  { title: "Desserts", emoji: "🍰", filterGroup: "Food & Sweets", items: [
    { name: "Chocolate Cake", price: "R55" }, { name: "Chocolate Cheesecake", price: "R80" },
    { name: "Brownie", price: "R60" }, { name: "Kataifi Brownie", price: "R85" },
    { name: "Brown Butter Almond Cake", price: "R65" }, { name: "Tiramisu Buns", price: "R85" },
    { name: "Cinnamon Buns", price: "R60" }, { name: "Waffle Sticks (ask for topping options)", price: "R80" },
  ]},
];
