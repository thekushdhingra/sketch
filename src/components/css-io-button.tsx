export default function CSSIoButton({
  children,
  onClick,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="cssbuttons-io">
      <span>{children}</span>
    </button>
  );
}
