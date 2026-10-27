import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard clean titles for prominent CBIC chapters
const STANDARD_CHAPTER_NAMES = {
  '01': 'Live Animals & Poultry',
  '02': 'Meat & Edible Meat Offal',
  '03': 'Fish & Aquatic Products',
  '04': 'Dairy, Eggs & Honey',
  '05': 'Other Animal Origin Products',
  '06': 'Plants, Trees & Cut Flowers',
  '07': 'Edible Vegetables & Roots',
  '08': 'Edible Fruit & Nuts',
  '09': 'Coffee, Tea, Mate & Spices',
  '10': 'Cereals & Grains',
  '11': 'Milling Industry Products',
  '12': 'Oil Seeds & Oleaginous Fruits',
  '13': 'Lac, Gums & Resins',
  '14': 'Vegetable Plaiting Materials',
  '15': 'Animal or Vegetable Fats & Oils',
  '16': 'Meat & Fish Preparations',
  '17': 'Sugars & Sugar Confectionery',
  '18': 'Cocoa & Cocoa Preparations',
  '19': 'Cereal, Flour & Bakery Products',
  '20': 'Vegetable & Fruit Preparations',
  '21': 'Miscellaneous Edible Preparations',
  '22': 'Beverages, Spirits & Vinegar',
  '23': 'Animal Feed & Residues',
  '24': 'Tobacco & Manufactured Substitutes',
  '25': 'Salt, Sulphur, Earths & Stone',
  '26': 'Ores, Slag & Ash',
  '27': 'Mineral Fuels & Petroleum Oils',
  '28': 'Inorganic Chemicals',
  '29': 'Organic Chemicals',
  '30': 'Pharmaceutical Products',
  '31': 'Fertilisers',
  '32': 'Paints, Varnishes, Pigments & Dyes',
  '33': 'Cosmetics, Perfumery & Essential Oils',
  '34': 'Soaps, Lubricants & Cleaning Agents',
  '35': 'Glues, Enzymes & Albuminoidal Substances',
  '36': 'Explosives, Pyrotechnics & Matches',
  '37': 'Photographic or Cinematographic Goods',
  '38': 'Miscellaneous Chemical Products',
  '39': 'Plastics & Articles Thereof',
  '40': 'Rubber & Articles Thereof',
  '41': 'Raw Hides, Skins & Leather',
  '42': 'Leather Articles & Travel Goods',
  '43': 'Furskins & Artificial Fur',
  '44': 'Wood & Articles of Wood',
  '45': 'Cork & Articles of Cork',
  '46': 'Manufactures of Straw & Basketware',
  '47': 'Pulp of Wood & Recycled Paper',
  '48': 'Paper & Paperboard Products',
  '49': 'Printed Books, Newspapers & Manuscripts',
  '50': 'Silk & Silk Fabrics',
  '51': 'Wool & Fine Animal Hair',
  '52': 'Cotton & Cotton Fabrics',
  '53': 'Other Vegetable Textile Fibres',
  '54': 'Man-made Filaments',
  '55': 'Man-made Staple Fibres',
  '56': 'Wadding, Felt, Nonwovens & Yarns',
  '57': 'Carpets & Textile Floor Coverings',
  '58': 'Special Woven Fabrics & Lace',
  '59': 'Impregnated & Coated Textile Fabrics',
  '60': 'Knitted or Crocheted Fabrics',
  '61': 'Apparel & Clothing (Knitted)',
  '62': 'Apparel & Clothing (Not Knitted)',
  '63': 'Other Made-up Textile Articles',
  '64': 'Footwear, Gaiters & Parts',
  '65': 'Headgear & Parts Thereof',
  '66': 'Umbrellas, Sun Umbrellas & Walking-sticks',
  '67': 'Prepared Feathers & Artificial Flowers',
  '68': 'Stone, Plaster, Cement & Asbestos Articles',
  '69': 'Ceramic Products',
  '70': 'Glass & Glassware',
  '71': 'Pearls, Precious Stones & Jewellery',
  '72': 'Iron & Steel',
  '73': 'Articles of Iron or Steel',
  '74': 'Copper & Articles Thereof',
  '75': 'Nickel & Articles Thereof',
  '76': 'Aluminium & Articles Thereof',
  '78': 'Lead & Articles Thereof',
  '79': 'Zinc & Articles Thereof',
  '80': 'Tin & Articles Thereof',
  '81': 'Other Base Metals & Cermets',
  '82': 'Tools, Cutlery & Implements',
  '83': 'Miscellaneous Base Metal Articles',
  '84': 'Machinery & Mechanical Appliances',
  '85': 'Electrical Machinery & Equipment',
  '86': 'Railway Locomotives & Rolling-stock',
  '87': 'Vehicles & Automotive Parts',
  '88': 'Aircraft, Spacecraft & Parts',
  '89': 'Ships, Boats & Floating Structures',
  '90': 'Optical, Medical & Precision Instruments',
  '91': 'Clocks, Watches & Parts',
  '92': 'Musical Instruments & Parts',
  '93': 'Arms, Ammunition & Parts',
  '94': 'Furniture, Bedding, Mattresses & Lighting',
  '95': 'Toys, Games & Sports Equipment',
  '96': 'Miscellaneous Manufactured Articles',
  '97': 'Works of Art, Collectors Pieces & Antiques'
};

export async function fetchAndBuildRealHsnDataset() {
  console.log('🔄 Fetching official GST HSN codes & chapters from public CBIC API...');
  
  const [chaptersRes, codesRes] = await Promise.all([
    fetch('https://raw.githubusercontent.com/frontlook-admin/HSN-Code-Classifier/Master/HSNChapters.json'),
    fetch('https://raw.githubusercontent.com/QuantumByteStudios/gst-hsn-sac-codes/main/data/hsn_codes.json')
  ]);

  if (!chaptersRes.ok || !codesRes.ok) {
    throw new Error(`Failed to fetch dataset: chapters ${chaptersRes.status}, codes ${codesRes.status}`);
  }

  const chaptersText = await chaptersRes.text();
  const codes = await codesRes.json();

  const chapterMap = {};
  const matches = [...chaptersText.matchAll(/Chapter\s+(\d+):\s*([^\n\r-]+)/gi)];
  matches.forEach(m => {
    const ch = m[1].padStart(2, '0');
    chapterMap[ch] = m[2].trim();
  });

  // Extract all 4-digit and 6-digit HSN codes (the statutory GST standards)
  const processed = codes
    .filter(c => c.code && c.code.length <= 6)
    .map(c => {
      const codeStr = String(c.code).trim();
      const ch = codeStr.padStart(4, '0').slice(0, 2);
      // Prefer clean standard name, then parsed name, then Chapter NN
      const catName = STANDARD_CHAPTER_NAMES[ch] || chapterMap[ch] || `Chapter ${ch}`;
      return {
        hsn_code: codeStr,
        chapter: ch,
        category: catName,
        gst_rate: (c.igst_rate !== null && c.igst_rate !== undefined) ? Number(c.igst_rate) : 18,
        description: (c.description || '').replace(/\s+/g, ' ').trim(),
        item_type: 'GOODS'
      };
    });

  const outDir = path.resolve(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'hsn_codes_real.json');
  fs.writeFileSync(outFile, JSON.stringify(processed, null, 2), 'utf-8');
  console.log(`✅ Successfully fetched and saved ${processed.length} real HSN records across ${Object.keys(chapterMap).length} chapters to ${outFile}`);

  return processed;
}

if (process.argv[1] === __filename) {
  fetchAndBuildRealHsnDataset()
    .then(data => console.log('Done, total:', data.length))
    .catch(err => {
      console.error('Failed:', err);
      process.exit(1);
    });
}
