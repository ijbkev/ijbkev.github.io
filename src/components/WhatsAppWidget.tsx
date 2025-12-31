import { MessageCircle } from "lucide-react";

const WhatsAppWidget = () => (
  <a
    href="https://wa.me/4915253482040"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-green-500 text-white px-4 py-3 shadow-strong hover:bg-green-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
    aria-label="Chat with us on WhatsApp"
  >
    <MessageCircle className="w-5 h-5" />
    <span className="hidden sm:inline text-sm font-semibold">WhatsApp us</span>
  </a>
);

export default WhatsAppWidget;
