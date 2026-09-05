const UserModel         = require('../models/UserModel');
const TruckModel        = require('../models/TruckModel');
const TourModel         = require('../models/TourModel');
const ComplaintModel    = require('../models/ComplaintModel');
const NotificationModel = require('../models/NotificationModel');

class DashboardService {
  static async getAdminStats(today) {
    const [
      totalWorkers,
      activeWorkers,
      trucksByStatus,
      toursToday,
      activeTours,
      openComplaints,
      urgentComplaints,
    ] = await Promise.all([
      UserModel.countByRole('worker'),
      TourModel.countActiveWorkersByDate(today),
      TruckModel.countByStatus(),
      TourModel.countByDate(today),
      TourModel.countActiveByDate(today),
      ComplaintModel.countOpen(),
      ComplaintModel.countUrgentOpen(),
    ]);

    return {
      totalWorkers,
      activeWorkers,
      availableTrucks:   trucksByStatus['available']   || 0,
      inUseTrucks:       trucksByStatus['in_use']       || 0,
      maintenanceTrucks: trucksByStatus['maintenance']  || 0,
      toursToday,
      activeTours,
      openComplaints,
      urgentComplaints,
    };
  }

  static async getWorkerDashboard(workerId, today) {
    const myTours    = await TourModel.findByWorkerAndDate(workerId, today);
    const activeTour = myTours.find(t => t.status === 'active') || null;
    return { myTours, activeTour };
  }

  static async getCitizenDashboard(citizenId, districtId, today) {
    const [myComplaints, unreadCount, nextTour] = await Promise.all([
      ComplaintModel.findByCitizen(citizenId),
      NotificationModel.countUnread(citizenId),
      districtId ? TourModel.findNextForDistrict(districtId, today) : null,
    ]);
    return { myComplaints, unreadCount, nextTour };
  }
}

module.exports = DashboardService;
