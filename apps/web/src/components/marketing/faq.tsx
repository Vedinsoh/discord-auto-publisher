'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Does Auto Publisher work with all announcement channels?',
    answer:
      'Yes! Auto Publisher works with any Discord announcement channel. Simply invite the bot and it will automatically detect and monitor your announcement channels.',
  },
  {
    question: 'How fast does Auto Publisher publish messages?',
    answer:
      'Auto Publisher typically publishes messages in under 1 second. Our premium plan offers even faster publishing times with priority processing.',
  },
  {
    question: 'Can I disable Auto Publisher for specific channels?',
    answer:
      'Absolutely! You have full control over which channels Auto Publisher monitors. You can enable or disable specific channels at any time using simple commands.',
  },
  {
    question: 'Is there a message limit?',
    answer:
      'The free version has no hard message limit, but premium users get priority processing and additional automation features for high-volume servers.',
  },
];

export function FAQ() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-slate-400">Got questions? We&apos;ve got answers.</p>
      </div>

      <Accordion type="single" collapsible defaultValue="item-0" className="space-y-4">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={faq.question}
            value={`item-${index}`}
            className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all data-[state=open]:border-slate-700"
          >
            <AccordionTrigger className="px-6 py-5 text-white hover:no-underline text-left [&>svg]:text-slate-400">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-5 text-slate-400">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
