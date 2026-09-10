import {
  Building2,
  ChevronRight,
  FileText,
  MessagesSquare,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const OPTIONS = [
  {
    id: "inquiry",
    icon: FileText,
    iconWrap: "bg-blue-50 text-blue-600 border-blue-100",
    title: "Unit Inquiry",
    description: "Ask about availability, viewing & rates",
  },
  {
    id: "maintenance",
    icon: Wrench,
    iconWrap: "bg-amber-50 text-amber-600 border-amber-100",
    title: "Maintenance Request",
    description: "Report a repair or unit issue",
  },
  {
    id: "other",
    icon: MessagesSquare,
    iconWrap: "bg-violet-50 text-violet-600 border-violet-100",
    title: "Something Else",
    description: "General questions & support",
  },
];

function ChatboxMenu({ onSelect, hideInquiry = false }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0a2250] text-white">
          <Building2 size={15} strokeWidth={1.8} />
        </div>

        <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-slate-200/70 bg-white px-3.5 py-3 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.12)]">
          <p className="text-[13.5px] font-semibold leading-snug text-slate-900">
            Hi, welcome to Spartment
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            How can we help today? Choose a topic below and we&apos;ll get you
            sorted.
          </p>
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-2">
        {OPTIONS.filter((option) => !hideInquiry || option.id !== "inquiry").map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 text-left transition duration-150 hover:-translate-y-px hover:border-blue-200 hover:shadow-[0_10px_28px_-10px_rgba(37,99,235,0.35)] active:translate-y-0"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${option.iconWrap}`}
              >
                <Icon size={18} strokeWidth={1.9} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {option.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {option.description}
                </span>
              </span>

              <ChevronRight
                size={17}
                className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
              />
            </button>
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-400">
        <ShieldCheck size={13} className="text-slate-300" />
        Your details stay private with us
      </p>
    </div>
  );
}

export default ChatboxMenu;
