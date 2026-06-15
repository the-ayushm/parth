import React from 'react';

interface FormattedTextProps {
    text: string;
    className?: string;
}

/**
 * Component to render WhatsApp formatted text
 * Supports: *bold*, _italic_, ~strikethrough~, ```monospace```
 */
export default function FormattedText({ text, className = '' }: FormattedTextProps) {
    const formatText = (input: string) => {
        const parts: React.ReactNode[] = [];
        let currentIndex = 0;
        let key = 0;

        // Regex patterns for WhatsApp formatting
        const patterns = [
            { regex: /\*([^*]+)\*/g, tag: 'strong' },           // *bold*
            { regex: /_([^_]+)_/g, tag: 'em' },                 // _italic_
            { regex: /~([^~]+)~/g, tag: 'del' },                // ~strikethrough~
            { regex: /```([^`]+)```/g, tag: 'code' },           // ```monospace```
        ];

        // Find all matches
        const matches: Array<{ start: number; end: number; text: string; tag: string }> = [];

        patterns.forEach(({ regex, tag }) => {
            let match;
            const regexCopy = new RegExp(regex.source, regex.flags);
            while ((match = regexCopy.exec(input)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[1],
                    tag,
                });
            }
        });

        // Sort matches by start position
        matches.sort((a, b) => a.start - b.start);

        // Build the formatted output
        matches.forEach((match) => {
            // Add text before the match
            if (currentIndex < match.start) {
                parts.push(input.substring(currentIndex, match.start));
            }

            // Add formatted text using React.createElement
            if (match.tag === 'strong') {
                parts.push(<strong key={key++}>{match.text}</strong>);
            } else if (match.tag === 'em') {
                parts.push(<em key={key++}>{match.text}</em>);
            } else if (match.tag === 'del') {
                parts.push(<del key={key++}>{match.text}</del>);
            } else if (match.tag === 'code') {
                parts.push(<code key={key++} className="bg-gray-200 dark:bg-gray-700 px-1 rounded font-mono text-xs">{match.text}</code>);
            }

            currentIndex = match.end;
        });

        // Add remaining text
        if (currentIndex < input.length) {
            parts.push(input.substring(currentIndex));
        }

        return parts.length > 0 ? parts : input;
    };

    return <span className={`${className} [&>*]:inherit`}>{formatText(text)}</span>;
}
