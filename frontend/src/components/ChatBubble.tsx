interface Props {
  onOpen: () => void;
}

export function ChatBubble({ onOpen }: Props) {
  return (
    <button
      type="button"
      className="chat-bubble"
      aria-label="Open Tariff advisor"
      onClick={onOpen}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v10H8l-4 4V5z" />
      </svg>
      <span>Ask Tariff</span>
    </button>
  );
}
