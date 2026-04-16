import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import useAssignmentStore from '../../store/useAssignmentStore';

const AttendanceStatusBar = () => {
  const attendanceStatus = useAssignmentStore((s) => s.attendanceStatus);

  if (attendanceStatus === 'healthy') return null;

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-sans mb-4">
      <div className="flex items-center gap-1.5 shrink-0">
        <WifiOff size={15} className="text-amber-500" />
        <AlertTriangle size={14} className="text-amber-500" />
      </div>
      <div>
        <span className="font-semibold">Degraded Mode — </span>
        Attendance service is unreachable. Showing last known associate roster.
        Real-time updates are paused.
      </div>
      <div className="ml-auto shrink-0">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-300">
          <Wifi size={10} />
          Degraded
        </span>
      </div>
    </div>
  );
};

export default AttendanceStatusBar;
