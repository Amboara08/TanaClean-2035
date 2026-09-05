const SettingsModel          = require('../models/SettingsModel');
const { PAGE_SIZE: DEFAULT } = require('../config/pagination');

const ALLOWED_PAGE_SIZES = [5, 10, 20, 50];

let cache = {};

class SettingsService {
  static async getPageSize() {
    if (cache.pageSize != null) return cache.pageSize;
    const val = await SettingsModel.get('page_size');
    cache.pageSize = val ? parseInt(val, 10) : DEFAULT;
    return cache.pageSize;
  }

  static async setPageSize(value) {
    const n = parseInt(value, 10);
    if (!ALLOWED_PAGE_SIZES.includes(n)) throw new Error('Valeur non autorisée');
    await SettingsModel.set('page_size', n);
    cache.pageSize = n;
  }

  static async getAll() {
    return { pageSize: await this.getPageSize() };
  }

  static invalidate() {
    cache = {};
  }
}

module.exports = SettingsService;
