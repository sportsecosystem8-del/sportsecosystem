import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import AdminLayout from './layouts/AdminLayout';
import PlayerLayout from './layouts/PlayerLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import PlayerDashboard from './pages/player/PlayerDashboard';
import PlayerCoaches from './pages/player/PlayerCoaches';
import PlayerTraining from './pages/player/PlayerTraining';
import PlayerGrounds from './pages/player/PlayerGrounds';
import PlayerShop from './pages/player/PlayerShop';
import PlayerOrders from './pages/player/PlayerOrders';
import PlayerPerformance from './pages/player/PlayerPerformance';
import PlayerNotifications from './pages/player/PlayerNotifications';
import PlayerComplaint from './pages/player/PlayerComplaint';
import PlayerProfile from './pages/player/PlayerProfile';
import CoachDashboard from './pages/coach/CoachDashboard';
import CoachRequests from './pages/coach/CoachRequests';
import CoachStudents from './pages/coach/CoachStudents';
import CoachSessions from './pages/coach/CoachSessions';
import CoachAttendance from './pages/coach/CoachAttendance';
import CoachPlans from './pages/coach/CoachPlans';
import CoachGrounds from './pages/coach/CoachGrounds';
import CoachPerformance from './pages/coach/CoachPerformance';
import CoachFeedback from './pages/coach/CoachFeedback';
import CoachSubscription from './pages/coach/CoachSubscription';
import CoachDocuments from './pages/coach/CoachDocuments';
import CoachNotifications from './pages/coach/CoachNotifications';
import CoachProfile from './pages/coach/CoachProfile';
import BusinessDashboard from './pages/business/BusinessDashboard';
import BusinessProducts from './pages/business/BusinessProducts';
import BusinessOrders from './pages/business/BusinessOrders';
import BusinessSubscription from './pages/business/BusinessSubscription';
import BusinessCoaches from './pages/business/BusinessCoaches';
import BusinessDocuments from './pages/business/BusinessDocuments';
import BusinessNotifications from './pages/business/BusinessNotifications';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVerifyCoaches from './pages/admin/AdminVerifyCoaches';
import AdminVerifyBusiness from './pages/admin/AdminVerifyBusiness';
import AdminUsers from './pages/admin/AdminUsers';
import AdminGrounds from './pages/admin/AdminGrounds';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminSettings from './pages/admin/AdminSettings';
import AdminDirectory from './pages/admin/AdminDirectory';
import AdminSports from './pages/admin/AdminSports';
import AdminMonitorBookings from './pages/admin/AdminMonitorBookings';
import AdminMonitorPerformance from './pages/admin/AdminMonitorPerformance';
import AdminReports from './pages/admin/AdminReports';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route element={<ProtectedRoute roles={['player']} />}>
        <Route path="/player" element={<PlayerLayout />}>
          <Route index element={<PlayerDashboard />} />
          <Route path="profile" element={<PlayerProfile />} />
          <Route path="coaches" element={<PlayerCoaches />} />
          <Route path="training" element={<PlayerTraining />} />
          <Route path="grounds" element={<PlayerGrounds />} />
          <Route path="shop" element={<PlayerShop />} />
          <Route path="orders" element={<PlayerOrders />} />
          <Route path="performance" element={<PlayerPerformance />} />
          <Route path="notifications" element={<PlayerNotifications />} />
          <Route path="complaint" element={<PlayerComplaint />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['coach']} />}>
        <Route path="/coach" element={<AppLayout />}>
          <Route index element={<CoachDashboard />} />
          <Route path="profile" element={<CoachProfile />} />
          <Route path="subscription" element={<CoachSubscription />} />
          <Route path="requests" element={<CoachRequests />} />
          <Route path="students" element={<CoachStudents />} />
          <Route path="sessions" element={<CoachSessions />} />
          <Route path="attendance" element={<CoachAttendance />} />
          <Route path="plans" element={<CoachPlans />} />
          <Route path="grounds" element={<CoachGrounds />} />
          <Route path="performance" element={<CoachPerformance />} />
          <Route path="matches" element={<Navigate to="/coach" replace />} />
          <Route path="feedback" element={<CoachFeedback />} />
          <Route path="documents" element={<CoachDocuments />} />
          <Route path="notifications" element={<CoachNotifications />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['business_owner']} />}>
        <Route path="/business" element={<AppLayout />}>
          <Route index element={<BusinessDashboard />} />
          <Route path="products" element={<BusinessProducts />} />
          <Route path="orders" element={<BusinessOrders />} />
          <Route path="subscription" element={<BusinessSubscription />} />
          <Route path="coaches" element={<BusinessCoaches />} />
          <Route path="notifications" element={<BusinessNotifications />} />
          <Route path="documents" element={<BusinessDocuments />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="verification/coaches" element={<AdminVerifyCoaches />} />
          <Route path="verification/business" element={<AdminVerifyBusiness />} />
          <Route path="directory" element={<AdminDirectory />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="sports" element={<AdminSports />} />
          <Route path="grounds" element={<AdminGrounds />} />
          <Route path="monitor/bookings" element={<AdminMonitorBookings />} />
          <Route path="monitor/performance" element={<AdminMonitorPerformance />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="complaints" element={<AdminComplaints />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
