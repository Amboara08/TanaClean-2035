const bcrypt    = require('bcrypt');
const UserModel = require('../models/UserModel');

class AuthService {
  static async login(email, password) {
    const user = await UserModel.findByEmail(email);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    return { id: user.id, name: user.name, role: user.role, district_id: user.district_id };
  }

  static async register({ name, email, password, district_id }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) return { error: 'Un compte avec cet e-mail existe déjà.' };

    const hash = await bcrypt.hash(password, 10);
    const id   = await UserModel.create({
      name, email, password: hash,
      role: 'citizen', district_id: district_id || null,
      created_by: null,
    });
    return { id };
  }
}

module.exports = AuthService;
