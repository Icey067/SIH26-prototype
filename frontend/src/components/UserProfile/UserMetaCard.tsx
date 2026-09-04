import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useAuth } from "../../context/AuthContext";
import { ShieldCheck, UserCheck } from "lucide-react";

export default function UserMetaCard() {
  const { user } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    closeModal();
  };

  const officerName = user?.name || "Rajesh Kumar Sharma";
  const officerRole = user?.designation || "Section Controller (GZB-TDL-CNB Mainline)";
  const officerDept = user?.department || "OPERATING";
  const badgeCode = user?.badgeCode || "NCR-CTRL-098";
  const initials = officerName.split(" ").map((n) => n[0]).slice(0, 2).join("");

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 bg-white dark:bg-gray-900/60">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-20 h-20 overflow-hidden border border-primary/30 rounded-2xl flex items-center justify-center bg-cyan-950/40 text-primary font-mono font-black text-xl shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              {initials}
            </div>
            <div className="order-3 xl:order-2">
              <div className="flex items-center gap-2 justify-center xl:justify-start">
                <h4 className="text-lg font-bold text-gray-800 dark:text-white/90">
                  {officerName}
                </h4>
                <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-mono text-xs font-bold">
                  {badgeCode}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left mt-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {officerRole}
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm font-mono text-cyan-500 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-cyan-500" />
                  {officerDept} • {user?.division || "Prayagraj Division (NCR)"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-mono font-bold text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-white lg:inline-flex lg:w-auto"
          >
            <UserCheck className="w-4 h-4 text-primary" />
            <span>OFFICER DETAILS</span>
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-xl font-bold text-gray-800 dark:text-white/90 uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>Duty Officer Operational Credentials</span>
            </h4>
            <p className="mb-6 text-xs text-gray-500 dark:text-gray-400 font-mono">
              Statutory verification and digital sign-off authority registry conforming to Indian Railways G&amp;SR Section 4.14.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-2 pb-3 space-y-6">
              <div>
                <h5 className="mb-4 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 border-b border-gray-200 dark:border-gray-800 pb-1">
                  1. Operational Authority &amp; Terminals
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
                  <div>
                    <Label>Control Desk Station</Label>
                    <Input
                      type="text"
                      value="Prayagraj Control Room (Desk Console 04)"
                    />
                  </div>

                  <div>
                    <Label>FOIS / COA Terminal ID</Label>
                    <Input type="text" value={`FOIS-NCR-${badgeCode || "PRYJ-098"}`} />
                  </div>

                  <div>
                    <Label>Statutory Authority Level</Label>
                    <Input
                      type="text"
                      value="G&SR Section 4.14 Authority Level-A"
                    />
                  </div>

                  <div>
                    <Label>Private Number Prefix</Label>
                    <Input type="text" value={`PN-${user?.privateNumberPrefix || "PRYJ"}-2026`} />
                  </div>
                </div>
              </div>

              <div>
                <h5 className="mb-4 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 border-b border-gray-200 dark:border-gray-800 pb-1">
                  2. Official Railway Communications
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Officer Full Name</Label>
                    <Input type="text" value={officerName} />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Designation</Label>
                    <Input type="text" value={officerRole} />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Official Railnet Email</Label>
                    <Input type="text" value={user?.email || "controller.pryj@ncr.railnet.gov.in"} />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Railway Direct Dial (RDD)</Label>
                    <Input type="text" value="RDD: 88412 • +91 532 2230123" />
                  </div>

                  <div className="col-span-2">
                    <Label>Assigned Trunk Section</Label>
                    <Input type="text" value="Ghaziabad (Km 0) to Kanpur Central (Km 440) Golden Corridor" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Officer Record
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
