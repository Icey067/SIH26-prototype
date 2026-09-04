import { useAuth } from "../../context/AuthContext";
import { UserCheck, ShieldCheck } from "lucide-react";

export default function UserInfoCard() {
  const { user } = useAuth();

  const nameParts = (user?.name || "Rajesh Kumar Sharma").split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || "Officer";

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 bg-white dark:bg-gray-900/60">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full">
          <h4 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            <span>Officer Authentication & Credentials</span>
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32 font-mono">
            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                First Name
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90 font-sans">
                {firstName}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                Last Name
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90 font-sans">
                {lastName}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                Railnet Email Address
              </p>
              <p className="text-sm font-semibold text-primary">
                {user?.email || "controller.pryj@ncr.railnet.gov.in"}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                Employee ID
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {user?.employeeId || "NCR-PRYJ-88412"}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                Authorized Department
              </p>
              <p className="text-sm font-semibold text-tertiary flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {user?.department || "OPERATING"} ({user?.badgeCode || "NCR-CTRL-098"})
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                Assigned Territory / Section
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90 font-sans">
                {user?.section || "NCR-GZB-TDL-UP Corridor"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

