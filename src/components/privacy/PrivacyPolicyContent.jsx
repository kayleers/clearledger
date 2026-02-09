import React from 'react';
import { usePrivacyPolicy } from './usePrivacyPolicy';

export default function PrivacyPolicyContent() {
  const { sections, lastUpdated } = usePrivacyPolicy();

  return (
    <div className="space-y-8 pb-6">
      {/* Header */}
      <div className="space-y-3 pb-4 border-b-2 border-emerald-200">
        <h1 className="text-3xl font-bold text-emerald-700">
          {sections[0].title}
        </h1>
        <p className="text-sm text-slate-600 font-medium">
          Last updated: {lastUpdated}
        </p>
      </div>

      {/* Introduction */}
      <div className="space-y-4">
        {sections[1].content.split('\n\n').map((paragraph, idx) => (
          <p key={idx} className="text-slate-700 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Sections */}
      {sections.slice(2).map((section, idx) => (
        <div key={idx} className="space-y-4">
          <h2 className="text-xl font-bold text-emerald-700 flex items-center gap-3 mt-2">
            <span className="bg-emerald-100 text-emerald-800 w-9 h-9 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0">
              {idx + 1}
            </span>
            <span>{section.title}</span>
          </h2>
          
          <div className="pl-12 space-y-3">
            {section.content.split('\n\n').map((block, blockIdx) => {
              // Check if it's a bulleted list
              if (block.includes('•') || block.includes('-')) {
                const lines = block.split('\n');
                return (
                  <ul key={blockIdx} className="space-y-2">
                    {lines.map((line, lineIdx) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                        const text = trimmed.substring(1).trim();
                        const indent = line.startsWith('  ') ? 'ml-6' : '';
                        return (
                          <li key={lineIdx} className={`flex gap-2 text-slate-700 leading-relaxed ${indent}`}>
                            <span className="text-emerald-600 flex-shrink-0">•</span>
                            <span>{text}</span>
                          </li>
                        );
                      }
                      return null;
                    }).filter(Boolean)}
                  </ul>
                );
              }
              
              // Regular paragraph
              return (
                <p key={blockIdx} className="text-slate-700 leading-relaxed">
                  {block}
                </p>
              );
            })}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div className="pt-8 mt-8 border-t border-slate-200 text-center space-y-2">
        <p className="text-xs text-slate-600 font-medium">
          This privacy policy is embedded within the ClearLedger app.
        </p>
        <p className="text-xs text-slate-500">
          For questions or concerns, contact: khaoskrservices@gmail.com
        </p>
      </div>
    </div>
  );
}