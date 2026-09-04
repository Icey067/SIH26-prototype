import { useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { MapPin, Building2, Radio, PhoneCall } from "lucide-react";

export default function UserAddressCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [addressData, setAddressData] = useState({
    country: "India",
    zonalHq: "North Central Railway (NCR) Zonal HQ, Subedarganj",
    cityState: "Prayagraj, Uttar Pradesh, India",
    postalCode: "211015",
    divisionCode: "NCR-PRYJ-26027",
    interlockingTower: "Tundla (TDL) - Kanpur (CNB) Central RRI Tower",
    rddLine: "RDD: 22401 / MTNL: 0532-2230489",
    emergencyStation: "PRYJ Section Control Desk #4"
  });

  const handleSave = (e?: React.FormEvent) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    closeModal();
  };

  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 bg-white dark:bg-gray-900/60">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full">
            <h4 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span>Zonal Headquarters & Station Post</span>
            </h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32 font-mono">
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  Zonal HQ / Complex
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90 font-sans">
                  {addressData.zonalHq}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-gray-400" />
                  Interlocking Tower
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90 font-sans">
                  {addressData.interlockingTower}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                  City / State / PIN
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90 font-sans">
                  {addressData.cityState} - {addressData.postalCode}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                  Division & Section Code
                </p>
                <p className="text-sm font-semibold text-primary">
                  {addressData.divisionCode}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5 text-gray-400" />
                  Railnet Direct Dial (RDD) / Phone
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {addressData.rddLine}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                  Emergency Desk Position
                </p>
                <p className="text-sm font-semibold text-tertiary">
                  {addressData.emergencyStation}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-gray-100 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="16"
              height="16"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill=""
              />
            </svg>
            Edit Post Details
          </button>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-8">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-xl font-bold text-gray-800 dark:text-white/90 font-mono">
              Edit Station & Post Registry
            </h4>
            <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
              Update official posting, Interlocking tower, and emergency lines.
            </p>
          </div>
          <form onSubmit={handleSave} className="flex flex-col">
            <div className="px-2 space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <Label>Zonal HQ / Railway Office</Label>
                  <Input
                    type="text"
                    value={addressData.zonalHq}
                    onChange={(e) => setAddressData({ ...addressData, zonalHq: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Interlocking Tower / Post</Label>
                  <Input
                    type="text"
                    value={addressData.interlockingTower}
                    onChange={(e) => setAddressData({ ...addressData, interlockingTower: e.target.value })}
                  />
                </div>

                <div>
                  <Label>City / State</Label>
                  <Input
                    type="text"
                    value={addressData.cityState}
                    onChange={(e) => setAddressData({ ...addressData, cityState: e.target.value })}
                  />
                </div>

                <div>
                  <Label>PIN Code</Label>
                  <Input
                    type="text"
                    value={addressData.postalCode}
                    onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Division Code</Label>
                  <Input
                    type="text"
                    value={addressData.divisionCode}
                    onChange={(e) => setAddressData({ ...addressData, divisionCode: e.target.value })}
                  />
                </div>

                <div>
                  <Label>RDD Hotline / Phone</Label>
                  <Input
                    type="text"
                    value={addressData.rddLine}
                    onChange={(e) => setAddressData({ ...addressData, rddLine: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Updates
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
