const TruckModel      = require('../models/TruckModel');
const SettingsService = require('./SettingsService');
const LogService      = require('./LogService');

class TruckService {
  static async getAll({ page = 1, limit } = {}) {
    if (!limit) limit = await SettingsService.getPageSize();
    const [trucks, total] = await Promise.all([
      TruckModel.findAll({ page, limit }),
      TruckModel.count(),
    ]);
    return { trucks, total, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return TruckModel.findById(id);
  }

  static async getAllSimple() {
    return TruckModel.findAllSimple();
  }

  static async update(id, { plate, capacity_t, status }, changed_by = null) {
    await TruckModel.update(id, { plate, capacity_t, status });
    LogService.log({
      table_name: 'trucks', record_id: id, action: 'update',
      new_value:  { plate, status },
      changed_by,
    });
  }

  static async getAvailable() {
    return TruckModel.findAvailable();
  }

  static async create(data) {
    const id = await TruckModel.create(data);
    LogService.log({
      table_name: 'trucks', record_id: id, action: 'create',
      new_value:  { plate: data.plate, capacity_t: data.capacity_t },
      changed_by: data.created_by,
    });
    return id;
  }

  static async delete(id, changed_by = null) {
    const truck = await TruckModel.findById(id);
    await TruckModel.delete(id);
    LogService.log({
      table_name: 'trucks', record_id: id, action: 'delete',
      old_value:  { plate: truck?.plate },
      changed_by,
    });
  }
}

module.exports = TruckService;
