export interface RichTextSpan {
    text: string;
    bold?: boolean;
    italic?: boolean;
}

export type StructuredBlock =
    | { kind: 'heading'; level: number; text: string }
    | { kind: 'paragraph'; spans: RichTextSpan[] }
    | { kind: 'list'; ordered?: boolean; items: RichTextSpan[][] }
    | { kind: 'quote'; spans: RichTextSpan[] };
