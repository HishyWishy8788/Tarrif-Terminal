interface Props {
  prefill: string;
  onAsk: (prefill: string) => void;
}

export function AskAboutThis({ prefill, onAsk }: Props) {
  return (
    <button
      type="button"
      className="button button-quiet ask-about-this"
      onClick={() => onAsk(prefill)}
      aria-label="Ask Tariff about this alert"
    >
      Ask Tariff
    </button>
  );
}
