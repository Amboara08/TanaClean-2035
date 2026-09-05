const bcrypt          = require('bcrypt');
const UserModel       = require('../models/UserModel');
const SettingsService = require('./SettingsService');

class StaffService {
  static async getWorkers() {
    return UserModel.findByRole('worker');
  }

  static async getWorkersWithDistrict({ page = 1, limit } = {}) {
    if (!limit) limit = await SettingsService.getPageSize();
    const [workers, total] = await Promise.all([
      UserModel.findWorkersWithDistrict({ page, limit }),
      UserModel.countWorkers(),
    ]);
    return { workers, total, totalPages: Math.ceil(total / limit) };
  }

  static async getWorkerById(id) {
    return UserModel.findWorkerById(id);
  }

  static async updateWorker(id, { name, email, district_id }) {
    await UserModel.updateWorker(id, { name, email, district_id });
  }

  static async createWorker({ name, email, password, district_id, created_by }) {
    const hash = await bcrypt.hash(password, 10);
    return UserModel.create({ name, email, password: hash, role: 'worker', district_id, created_by });
  }
}

module.exports = StaffService;
