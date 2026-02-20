import Link from "next/link";
import { MessageCircle, ArrowRight } from "lucide-react";

export default function GroupMeSection() {
  return (
    <section className="py-24 bg-[#e8e6dc]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-3 block">
          Join the Conversation
        </span>
        <h2 className="heading text-3xl sm:text-4xl font-bold text-[#141413] mb-4">
          Talk Claude in our GroupMe.
        </h2>
        <p className="body-editorial text-lg text-[#b0aea5] mb-8 leading-relaxed">
          Meeting reminders, project threads, event announcements, and random AI
          finds — all in one place. Join the group and stay in the loop from day one.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="https://groupme.com/join_group/108706896/m6t7b7Vs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#d97757] hover:bg-[#c86843] text-white text-sm font-medium rounded-xl transition-colors"
          >
            <MessageCircle size={16} />
            Join GroupMe
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#d0cdc5] hover:border-[#141413] text-[#141413] text-sm font-medium rounded-xl transition-colors bg-white"
          >
            <ArrowRight size={16} />
            See upcoming events
          </Link>
        </div>

        <p className="text-xs text-[#b0aea5] mt-5">
          Already 300+ members. Open to all Penn State students.
        </p>
      </div>
    </section>
  );
}
