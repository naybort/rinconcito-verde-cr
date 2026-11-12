import plants from '../../data/plants.json';
import categories from '../../data/categories.json';
import { parseCatalog } from './schema';
export const catalog = parseCatalog(plants, categories);
